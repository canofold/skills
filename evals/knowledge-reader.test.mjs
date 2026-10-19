import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { appendFile, mkdtemp, mkdir, open, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readCollection } from '../skills/canofold-knowledge-reader/scripts/read-page.mjs'

const exec = promisify(execFile)
const helper = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../skills/canofold-knowledge-reader/scripts/read-page.mjs'
)
const hash = (value) => createHash('sha256').update(value).digest('hex')
const json = (value) => JSON.stringify(value)
const manifestPath = (root) => join(root, 'ai/manifest.json')

async function fixture(root) {
  const body = '你好世界'
  const page = {
    id: hash('guide'),
    revision: hash('revision'),
    source: {
      path: 'guide.md',
      kind: 'markdown',
      revision: hash('source'),
      transformedRevision: hash('transformed')
    },
    representation: {
      body: 'extension-transformed-source-body',
      facts: 'compiled-static-with-author-and-extension-overrides',
      analysis: 'markdown-static',
      fingerprint: hash(body),
      declaredInputsRevision: hash('plugins')
    },
    routePath: '/base/guide/',
    title: '指南',
    description: '',
    version: 'current',
    locale: 'zh',
    status: 'published'
  }
  const envelope = {
    schemaVersion: 3,
    scope: { space: 'test-site', versions: ['current'], locales: ['zh'] },
    basePath: '/base/',
    outputs: { aiPageIndex: true, aiFullContent: true, markdownMirror: false },
    snapshotRevision: hash('snapshot'),
    pages: [page]
  }
  const partition = {
    version: 'current',
    locale: 'zh',
    pages: 1,
    sourceBytes: Buffer.byteLength(body),
    shards: []
  }
  await mkdir(join(root, 'ai/content/current/zh'), { recursive: true })
  for (const [index, content] of ['世界', '你好'].entries()) {
    const path = `ai/content/current/zh/${index + 1}.jsonl`
    const bytes =
      json({
        documentId: page.id,
        routePath: page.routePath,
        title: page.title,
        description: '',
        version: 'current',
        locale: 'zh',
        part: index === 0 ? 2 : 1,
        parts: 2,
        content
      }) + '\n'
    await writeFile(join(root, path), bytes)
    partition.shards.push({
      path: `/base/${path}`,
      bytes: Buffer.byteLength(bytes),
      records: 1,
      fingerprint: hash(bytes)
    })
  }
  const index = json(envelope)
  await writeFile(join(root, 'ai/pages.json'), index)
  const manifest = {
    ...envelope,
    totals: { pages: 1, sourceBytes: Buffer.byteLength(body) },
    partitions: [partition],
    pageIndex: {
      path: '/base/ai/pages.json',
      bytes: Buffer.byteLength(index),
      fingerprint: hash(index)
    }
  }
  await writeFile(manifestPath(root), json(manifest))
  return manifest
}

async function withFixture(action) {
  const root = await mkdtemp(join(tmpdir(), 'canofold-reader-test-'))
  try {
    return await action(root, await fixture(root))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('metadata indexes cannot supply unverified body content', () =>
  withFixture(async (root) => {
    const indexPath = join(root, 'ai/pages.json')
    const index = JSON.parse(await readFile(indexPath, 'utf8'))
    index.pages[0].content = 'Unverified body from metadata'
    await writeFile(indexPath, json(index))
    const result = await readCollection(root, { entry: 'pages' })
    assert.equal(result.content, false)
    assert.equal(result.pages[0].content, undefined)
    await assert.rejects(exec(process.execPath, [helper, root, '/base/guide/', '--index']), /unavailable/)
  }))

test('accepts source-derived facts and rejects invalid provenance without requiring authored-source fields', () =>
  withFixture(async (root) => {
    const indexPath = join(root, 'ai/pages.json')
    const index = JSON.parse(await readFile(indexPath, 'utf8'))
    const page = index.pages[0]
    page.source = {
      kind: 'openapi', path: 'docs/api/spec.yaml', id: 'pet-api', key: 'GET /pets',
      pointer: '/paths/~1pets/get', revision: hash('spec'), adapterRevision: '1',
      optionsRevision: hash('options'), dependenciesRevision: hash('dependencies'),
      dependencies: [{ path: 'docs/api/spec.yaml', revision: hash('spec') }]
    }
    page.representation = { ...page.representation, body: 'source-derived-markdown',
      facts: 'source-derived-static', analysis: 'openapi-static' }
    page.derived = { method: 'GET', path: '/pets', security: [] }
    await writeFile(indexPath, json(index))
    const read = () => readCollection(root, { entry: 'pages' })
    assert.deepEqual((await read()).pages[0].derived, page.derived)
    const custom = structuredClone(index)
    custom.pages[0].source.kind = 'service-catalog'
    custom.pages[0].representation.analysis = 'service-catalog-static'
    custom.pages[0].derived = { service: 'billing' }
    await writeFile(indexPath, json(custom))
    assert.deepEqual((await read()).pages[0].derived, { service: 'billing' })
    for (const mutate of [
      (p) => { p.source.kind = 'Bad Kind' },
      (p) => { p.representation.analysis = 'other-static' },
      (p) => { p.source.pointer = '/paths/~invalid' },
      (p) => { p.source.id = 'Bad Identity' },
      (p) => { p.source.dependencies.push(p.source.dependencies[0]) },
      (p) => { p.source.dependencies[0].path = '../outside.yaml' },
      (p) => { p.source.dependencies[0].revision = hash('other') },
      (p) => { delete p.derived }
    ]) {
      const changed = structuredClone(index)
      mutate(changed.pages[0])
      await writeFile(indexPath, json(changed))
      await assert.rejects(read())
    }
    for (const schemaVersion of [1, 2]) {
      await writeFile(indexPath, json({ ...index, schemaVersion }))
      await assert.rejects(read(), /Unsupported AI schema/)
    }
  }))

test(
  'consumes a published CLI custom ContentSource without interpreting its opaque facts',
  { skip: !process.env.CANOFOLD_CLI },
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'canofold-reader-custom-'))
    try {
      await mkdir(join(root, 'docs/catalog'), { recursive: true })
      await writeFile(join(root, 'docs/index.md'), '# Home')
      await writeFile(join(root, 'docs/catalog/service.txt'), 'Billing service')
      await writeFile(join(root, 'canofold.config.mjs'), `export default {
        sources: [{ id: 'services', kind: 'service-catalog', revision: '1',
          root: 'docs/catalog', entry: 'docs/catalog/service.txt',
          version: 'current', locale: 'zh', base: '/catalog/', cacheKey: {},
          async load(context) {
            const name = await context.read(context.entry)
            return [{ key: 'billing', path: '', pointer: '', title: name,
              description: 'Service ownership', body: '# ' + name,
              facts: { owner: 'accounts-team' } }]
          }
        }]
      }`)
      await exec(process.execPath, [resolve(process.env.CANOFOLD_CLI), 'build'], { cwd: root })
      const result = await readCollection(join(root, '.canofold/dist'))
      const page = result.pages.find((page) => page.source.kind === 'service-catalog')
      assert.equal(page.content, '# Billing service')
      assert.equal(page.representation.analysis, 'service-catalog-static')
      assert.deepEqual(page.derived, { owner: 'accounts-team' })
      assert.equal(page.routePath, '/catalog/')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
)

test('rejects scheme-relative citations instead of returning cross-origin page links', () =>
  withFixture(async (root) => {
    const indexPath = join(root, 'ai/pages.json')
    const index = JSON.parse(await readFile(indexPath, 'utf8'))
    index.basePath = '/'
    index.pages[0].routePath = '//other.example/guide/'
    await writeFile(indexPath, json(index))
    await assert.rejects(readCollection(root, { entry: 'pages' }), /Invalid published/)
  }))

test('honors local cancellation and rejects unknown representation selectors', () =>
  withFixture(async (root) => {
    const aborted = new AbortController()
    aborted.abort()
    await assert.rejects(readCollection(root, { signal: aborted.signal }), /abort/i)
    await assert.rejects(readCollection(root, { entry: 'typo' }), /entry/i)
  }))

test('bounds local reads even when a file grows after stat', (t) =>
  withFixture(async (root) => {
    const path = join(root, 'ai/pages.json')
    const probe = await open(path, 'r')
    const prototype = Object.getPrototypeOf(probe)
    await probe.close()
    const originalStat = prototype.stat
    const originalRead = prototype.readFile
    let unboundedReads = 0
    t.mock.method(prototype, 'stat', async function (...args) {
      const before = await originalStat.apply(this, args)
      await appendFile(path, 'x'.repeat(100001))
      return before
    })
    t.mock.method(prototype, 'readFile', function (...args) {
      unboundedReads += 1
      return originalRead.apply(this, args)
    })
    await assert.rejects(readCollection(root, { entry: 'pages', maxFileBytes: 100000 }), /byte limit/)
    assert.equal(unboundedReads, 0, 'Growing files must not be read fully before enforcing the byte limit')
  }))

test('closes an opened local file when cancellation arrives after stat', (t) =>
  withFixture(async (root) => {
    const probe = await open(join(root, 'ai/pages.json'), 'r')
    const prototype = Object.getPrototypeOf(probe)
    await probe.close()
    const originalStat = prototype.stat
    const aborter = new AbortController()
    let opened
    t.mock.method(prototype, 'stat', async function (...args) {
      const info = await originalStat.apply(this, args)
      opened = this
      aborter.abort()
      return info
    })
    await assert.rejects(readCollection(root, { entry: 'pages', signal: aborter.signal }), /abort/i)
    assert.equal(opened.fd, -1)
  }))

test('closes an active local stream when cancellation arrives during reading', (t) =>
  withFixture(async (root) => {
    const probe = await open(join(root, 'ai/pages.json'), 'r')
    const prototype = Object.getPrototypeOf(probe)
    await probe.close()
    const originalStream = prototype.createReadStream
    const aborter = new AbortController()
    let opened
    t.mock.method(prototype, 'createReadStream', function (options) {
      opened = this
      const stream = originalStream.call(this, options)
      stream.once('data', () => aborter.abort())
      return stream
    })
    await assert.rejects(readCollection(root, { entry: 'pages', signal: aborter.signal }), /abort/i)
    assert.equal(opened.fd, -1)
  }))

test('accepts an exact byte budget and enforces the cumulative HTTP budget', () =>
  withFixture(async (root) => {
    const indexSize = (await readFile(join(root, 'ai/pages.json'))).length
    assert.equal(
      (await readCollection(root, { entry: 'pages', maxFileBytes: indexSize, maxTotalBytes: indexSize }))
        .complete,
      true
    )
    const manifestSize = (await readFile(manifestPath(root))).length
    const server = createServer(async (request, response) => {
      response.end(await readFile(join(root, request.url.slice('/base/'.length))))
    })
    await new Promise((done) => server.listen(0, '127.0.0.1', done))
    try {
      await assert.rejects(
        readCollection(`http://127.0.0.1:${server.address().port}/base/`, {
          maxTotalBytes: manifestSize + indexSize
        }),
        /byte limit/
      )
    } finally {
      server.closeAllConnections()
      await new Promise((done) => server.close(done))
    }
  }))

test('rejects invalid UTF-8 and malformed CLI arguments', () =>
  withFixture(async (root) => {
    await writeFile(manifestPath(root), Buffer.from([0xc3, 0x28]))
    await assert.rejects(readCollection(root), /encoded data|encoding/i)
    await assert.rejects(exec(process.execPath, [helper, root]), /Usage/)
    await assert.rejects(
      exec(process.execPath, [helper, root, '--snapshot', '--unexpected']),
      /Unknown option/
    )
  }))

test('validates records even when the shard file checksum is internally consistent', async (t) => {
  for (const [label, mutate, pattern] of [
    [
      'duplicate part',
      (r) => {
        r.part = 2
      },
      /Duplicate or inconsistent/
    ],
    [
      'invalid part',
      (r) => {
        r.part = 0
      },
      /Invalid part/
    ],
    [
      'wrong document',
      (r) => {
        r.documentId = hash('unknown')
      },
      /record metadata/
    ],
    [
      'wrong version',
      (r) => {
        r.version = 'v0'
      },
      /record metadata/
    ],
    [
      'body mismatch',
      (r) => {
        r.content = '错误'
      },
      /Body fingerprint/
    ]
  ])
    await t.test(label, () =>
      withFixture(async (root, manifest) => {
        const shard = manifest.partitions[0].shards[1]
        const path = join(root, shard.path.slice('/base/'.length))
        const record = JSON.parse(await readFile(path, 'utf8'))
        mutate(record)
        const bytes = json(record) + '\n'
        await writeFile(path, bytes)
        shard.bytes = Buffer.byteLength(bytes)
        shard.fingerprint = hash(bytes)
        await writeFile(manifestPath(root), json(manifest))
        await assert.rejects(readCollection(root), pattern)
      })
    )
})

test('reconstructs exact content and returns unknown differences without a baseline', () =>
  withFixture(async (root) => {
    const result = await readCollection(root)
    assert.equal(result.pages[0].content, '你好世界')
    assert.equal(result.complete, true)
    assert.deepEqual(result.changes, {
      status: 'unknown',
      reason: 'no-baseline'
    })
    const cli = await exec(process.execPath, [helper, root, '/base/guide/'])
    assert.equal(JSON.parse(cli.stdout).content, '你好世界')
    await assert.rejects(exec(process.execPath, [helper, root, '/missing/']), /No indexed page/)
  }))

test('rejects incomplete or malformed collections before returning a new snapshot', async (t) => {
  const cases = [
    [
      'schema',
      (m) => {
        m.schemaVersion = 1
      },
      /Unsupported AI schema/
    ],
    [
      'missing partition',
      (m) => {
        m.partitions = []
      },
      /Incomplete content/
    ],
    [
      'duplicate partition',
      (m) => {
        m.partitions.push(m.partitions[0])
      },
      /Duplicate content partition/
    ],
    [
      'missing shard',
      (m) => {
        m.partitions[0].shards[0].path = '/base/ai/content/missing.jsonl'
      },
      /ENOENT/
    ],
    [
      'escaping shard',
      (m) => {
        m.partitions[0].shards[0].path = '/base/ai/content/../../secret'
      },
      /Invalid published/
    ],
    [
      'encoded escape',
      (m) => {
        m.partitions[0].shards[0].path = '/base/ai/content/%2e%2e/secret'
      },
      /Invalid published/
    ],
    [
      'encoded separator',
      (m) => {
        m.partitions[0].shards[0].path = '/base/ai/content/x%2fy'
      },
      /Invalid published/
    ],
    [
      'wrong checksum',
      (m) => {
        m.partitions[0].shards[0].fingerprint = hash('wrong')
      },
      /integrity mismatch/
    ],
    [
      'wrong count',
      (m) => {
        m.partitions[0].shards[0].records = 3
      },
      /record count mismatch/
    ],
    [
      'wrong totals',
      (m) => {
        m.totals.pages = 5
      },
      /totals mismatch/
    ],
    [
      'wrong partition size',
      (m) => {
        m.partitions[0].sourceBytes = 0
      },
      /byte count mismatch/
    ],
    [
      'wrong index',
      (m) => {
        m.pageIndex.fingerprint = hash('wrong')
      },
      /Page index integrity/
    ],
    [
      'disabled index reference',
      (m) => {
        m.outputs.aiPageIndex = false
      },
      /Unexpected page index/
    ],
    [
      'duplicate identities',
      (m) => {
        m.pages.push(m.pages[0])
      },
      /Duplicate document/
    ]
  ]
  for (const [name, mutate, pattern] of cases)
    await t.test(name, () =>
      withFixture(async (root, manifest) => {
        const previous = await readCollection(root)
        const saved = json(previous)
        mutate(manifest)
        await writeFile(manifestPath(root), json(manifest))
        await assert.rejects(readCollection(root, { previous }), pattern)
        assert.equal(json(previous), saved)
      })
    )
})

test('enforces limits and rejects local symlinks outside the output root', () =>
  withFixture(async (root, manifest) => {
    await assert.rejects(readCollection(root, { maxFileBytes: 10 }), /byte limit/)
    await assert.rejects(readCollection(root, { maxTotalBytes: 10 }), /byte limit/)
    const outside = await mkdtemp(join(tmpdir(), 'canofold-reader-outside-'))
    try {
      await writeFile(join(outside, 'file'), 'secret')
      await symlink(join(outside, 'file'), join(root, 'ai/content/escape.jsonl'))
      manifest.partitions[0].shards[0].path = '/base/ai/content/escape.jsonl'
      await writeFile(manifestPath(root), json(manifest))
      await assert.rejects(readCollection(root), /escapes output directory/)
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  }))

test('compares only complete matching scopes and reports collection exits rather than source deletion', () =>
  withFixture(async (root) => {
    const old = await readCollection(root)
    const unchanged = await readCollection(root, { previous: old })
    assert.deepEqual(unchanged.changes, {
      status: 'complete',
      added: [],
      changed: [],
      exited: []
    })
    const prior = structuredClone(old)
    prior.pages = [{ ...prior.pages[0], id: hash('previous-page') }]
    const update = await readCollection(root, { previous: prior })
    assert.deepEqual(update.changes.added, [old.pages[0].id])
    assert.deepEqual(update.changes.exited, [prior.pages[0].id])
    const modified = structuredClone(old)
    modified.pages[0].revision = hash('earlier')
    assert.deepEqual((await readCollection(root, { previous: modified })).changes.changed, [old.pages[0].id])
    const scope = structuredClone(old)
    scope.scope.space = 'other'
    assert.equal((await readCollection(root, { previous: scope })).changes.status, 'unknown')
    await assert.rejects(readCollection(root, { previous: { ...old, complete: false } }), /Incomplete/)
  }))

test('supports metadata-only indexes and full manifests without a page index', () =>
  withFixture(async (root, manifest) => {
    manifest.outputs.aiPageIndex = false
    manifest.pageIndex = null
    await writeFile(manifestPath(root), json(manifest))
    assert.equal((await readCollection(root)).pages[0].content, '你好世界')
    const index = JSON.parse(await readFile(join(root, 'ai/pages.json'), 'utf8'))
    index.outputs.aiFullContent = false
    await writeFile(join(root, 'ai/pages.json'), json(index))
    const result = await readCollection(root, { entry: 'pages' })
    assert.equal(result.content, false)
    assert.equal(result.pages[0].content, undefined)
  }))

test('reads HTTP subpath deployments and rejects failed, redirected, mixed or oversized resources', () =>
  withFixture(async (root) => {
    let mode = 'ok'
    const server = createServer(async (request, response) => {
      const pathname = new URL(request.url, 'http://localhost').pathname
      if (mode === 'redirect') {
        response.writeHead(302, { location: 'http://example.invalid/' }).end()
        return
      }
      if (mode === 'failure') {
        response.writeHead(503).end()
        return
      }
      if (mode === 'hang') return
      try {
        const bytes = await readFile(
          join(root, decodeURIComponent(pathname.replace(/^\/(?:base|other)\//, '')))
        )
        response.writeHead(200).end(bytes)
      } catch {
        response.writeHead(404).end()
      }
    })
    await new Promise((done) => server.listen(0, '127.0.0.1', done))
    try {
      const url = `http://127.0.0.1:${server.address().port}/base/`
      const result = await readCollection(url)
      assert.equal(result.pages[0].content, '你好世界')
      const local = await readCollection(root)
      assert.equal((await readCollection(url, { previous: local })).changes.status, 'complete')
      await assert.rejects(readCollection(new URL('../other/', url).href), /deployment base/)
      mode = 'redirect'
      await assert.rejects(readCollection(url))
      mode = 'failure'
      await assert.rejects(readCollection(url), /HTTP 503/)
      mode = 'ok'
      mode = 'hang'
      await assert.rejects(readCollection(url, { timeoutMs: 25 }), /timeout|aborted/i)
      const aborted = new AbortController()
      aborted.abort()
      await assert.rejects(readCollection(url, { signal: aborted.signal }), /abort/i)
      mode = 'ok'
      await assert.rejects(readCollection(url, { maxFileBytes: 10 }), /byte limit/)
      const index = JSON.parse(await readFile(join(root, 'ai/pages.json'), 'utf8'))
      index.snapshotRevision = hash('new-index')
      await writeFile(join(root, 'ai/pages.json'), json(index))
      await assert.rejects(readCollection(url), /Page index integrity/)
    } finally {
      server.closeAllConnections()
      await new Promise((done) => server.close(done))
    }
  }))

test(
  'consumes real OpenAPI-derived bodies, tracks dependencies and retains identity across entry renames',
  { skip: !process.env.CANOFOLD_CLI || !process.env.CANOFOLD_OPENAPI_ENTRY },
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'canofold-reader-openapi-'))
    try {
      await mkdir(join(root, 'docs/api'), { recursive: true })
      await writeFile(join(root, 'docs/index.md'), '# Home')
      const specification = { openapi: '3.1.0', info: {title: 'Pet API', version: '2'}, paths: {
        '/pets': { get: { responses: { '200': {description: 'OK', content: {
          'application/json': { schema: {$ref: './pet.yaml'} }
        }} } } }
      } }
      const writeSpec = (name) => writeFile(join(root, `docs/api/${name}.json`), json(specification))
      const configure = (name) => writeFile(join(root, 'canofold.config.mjs'),
        `const {openapi} = await import(new URL(${json(pathToFileURL(resolve(process.env.CANOFOLD_OPENAPI_ENTRY)).href)}).href);
        export default {ai:{contentSpace:'api-reader'}, sources:[openapi({id:'pets',root:'docs/api',
          entry:'docs/api/${name}.json',locale:'zh',version:'current',base:'/api/'})]}`)
      const build = () => exec(process.execPath, [resolve(process.env.CANOFOLD_CLI), 'build'], { cwd: root })
      const dist = join(root, '.canofold/dist')
      await writeSpec('spec')
      await configure('spec')
      await writeFile(join(root, 'docs/api/pet.yaml'), 'type: object\nproperties:\n  name:\n    type: string\n')
      await build()
      const first = await readCollection(dist)
      const operation = first.pages.find((page) => page.source.key === 'GET /pets')
      assert.ok(operation)
      assert.equal(operation.representation.body, 'source-derived-markdown')
      assert.match(operation.content, /GET.*pets/)
      assert.equal(operation.derived.schemas[0].schema.properties.name.type, 'string')
      await writeFile(join(root, 'docs/api/pet.yaml'), 'type: object\nproperties:\n  name:\n    type: integer\n')
      await build()
      const changed = await readCollection(dist, {previous:first})
      const updated = changed.pages.find((page) => page.id === operation.id)
      assert.equal(updated.source.revision, operation.source.revision)
      assert.notEqual(updated.source.dependenciesRevision, operation.source.dependenciesRevision)
      assert.equal(updated.derived.schemas[0].schema.properties.name.type, 'integer')
      assert.match(updated.content, /integer/)
      assert.ok(changed.changes.changed.includes(operation.id))
      await rename(join(root,'docs/api/spec.json'),join(root,'docs/api/renamed.json'))
      await configure('renamed')
      await build()
      const moved = await readCollection(dist, {previous:changed})
      assert.equal(moved.pages.find((page) => page.id === operation.id).source.path, 'docs/api/renamed.json')
      assert.deepEqual(moved.changes.added, [])
      assert.deepEqual(moved.changes.exited, [])
      await rm(join(root,'docs/api/pet.yaml'))
      await assert.rejects(build())
      assert.equal((await readCollection(dist)).snapshotRevision, moved.snapshotRevision)
      await writeFile(join(root,'docs/api/pet.yaml'),'type: string\n')
      specification.paths = {}
      await writeSpec('renamed')
      await build()
      const removed = await readCollection(dist,{previous:moved})
      assert.deepEqual(removed.changes.exited, [operation.id])
      await assert.rejects(readCollection(dist,{previous:{...moved,schemaVersion:2}}), /Unsupported AI schema/)
    } finally {
      await rm(root, {recursive:true,force:true})
    }
  }
)

test(
  'consumes real CLI builds through content updates, rename, deletion, locale/version and output switches',
  { skip: !process.env.CANOFOLD_CLI },
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'canofold-reader-real-'))
    const cli = resolve(process.env.CANOFOLD_CLI)
    try {
      for (const dir of ['docs/zh', 'docs/en', 'versions/v1/zh', 'versions/v1/en']) {
        await mkdir(join(root, dir), { recursive: true })
        await writeFile(join(root, dir, 'index.md'), '# Home')
      }
      const config = {
        markdownMirror: false,
        ai: {
          contentSpace: 'integration',
          versions: 'all',
          chunkSizeBytes: 16384
        },
        i18n: { defaultLocale: 'zh', locales: ['zh', 'en'] },
        versions: [
            { id: 'current', label: 'Current', docsDir: 'docs', base: '/' },
            { id: 'v1', label: 'v1', docsDir: 'versions/v1', base: '/v1/' }
        ]
      }
      const configFile = join(root, 'canofold.config.ts')
      await writeFile(configFile, `export default ${json(config)}`)
      const source = join(root, 'docs/zh/cafe\u0301 中文 100%.md')
      const write = (body) => writeFile(source, body)
      const dist = join(root, '.canofold/dist')
      const build = () =>
        exec(process.execPath, [cli, 'build'], {
          cwd: root,
          maxBuffer: 4 * 1024 * 1024
        })
      await write('# Guide\n\n' + '多段正文 '.repeat(6000))
      await build()
      const first = await readCollection(dist)
      const guide = first.pages.find((p) => p.source.path === 'caf\u00e9 中文 100%.md')
      assert.ok(guide, 'The real producer must normalize the logical source path, not its literal percent')
      assert.match(guide.routePath, /%25/)
      const server = createServer(async (request, response) => {
        try {
          response.end(await readFile(join(dist, decodeURIComponent(request.url))))
        } catch {
          response.writeHead(404).end()
        }
      })
      await new Promise((done) => server.listen(0, '127.0.0.1', done))
      try {
        const remote = await readCollection(`http://127.0.0.1:${server.address().port}/`, { previous: first })
        assert.equal(remote.pages.find((p) => p.id === guide.id).content, await readFile(source, 'utf8'))
        assert.equal(remote.changes.status, 'complete')
      } finally {
        server.closeAllConnections()
        await new Promise((done) => server.close(done))
      }
      assert.equal(first.pages.length, 5)
      assert.equal(guide.content, await readFile(source, 'utf8'))
      const cachedOutput = await build()
      assert.match(cachedOutput.stdout, /cached/)
      const cached = await readCollection(dist, { previous: first })
      assert.equal(cached.snapshotRevision, first.snapshotRevision)
      assert.deepEqual(cached.changes, { status: 'complete', added: [], changed: [], exited: [] })
      await write('# Changed\n\nNew body')
      await build()
      const changed = await readCollection(dist, { previous: first })
      assert.equal(changed.changes.changed.length, 1)
      assert.equal(changed.changes.added.length, 0)
      assert.equal(changed.pages.find((page) => page.id === guide.id).content, '# Changed\n\nNew body')
      const renamed = join(root, 'docs/zh/renamed.md')
      await rename(source, renamed)
      await build()
      const moved = await readCollection(dist, { previous: changed })
      assert.equal(moved.changes.added.length, 1)
      assert.equal(moved.changes.exited.length, 1)
      await writeFile(renamed, '---\nai: false\n---\n# Excluded')
      await build()
      const excluded = await readCollection(dist, { previous: moved })
      assert.equal(excluded.changes.exited.length, 1)
      assert.equal(excluded.pages.length, 4)
      await writeFile(renamed, '---\nstatus: draft\n---\n# Draft')
      await build()
      assert.equal((await readCollection(dist)).pages.length, 4)
      await rm(renamed)
      await build()
      assert.equal((await readCollection(dist)).pages.length, 4)
      config.ai.pageIndex = false
      await writeFile(configFile, `export default ${json(config)}`)
      await build()
      assert.equal((await readCollection(dist)).pages.length, 4)
      await assert.rejects(readFile(join(dist, 'ai/pages.json')), {
        code: 'ENOENT'
      })
      config.ai.pageIndex = true
      config.ai.fullContent = false
      config.ai.llmsFullTxt = false
      await writeFile(configFile, `export default ${json(config)}`)
      await build()
      const index = await readCollection(dist, { entry: 'pages' })
      assert.equal(index.content, false)
      await assert.rejects(readFile(join(dist, 'ai/manifest.json')), {
        code: 'ENOENT'
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
)
