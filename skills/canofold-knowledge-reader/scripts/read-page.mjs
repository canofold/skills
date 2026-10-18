#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { open, realpath, readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const digestPattern = /^[a-f0-9]{64}$/
const decode = (bytes) => new TextDecoder('utf-8', { fatal: true }).decode(bytes)

function requireValue(condition, message) {
  if (!condition) throw new Error(message)
}

function array(value, label) {
  requireValue(Array.isArray(value), `Invalid ${label}`)
  return value
}

function digest(value, label) {
  requireValue(typeof value === 'string' && digestPattern.test(value), `Invalid ${label}`)
}

function positiveInteger(value, label) {
  requireValue(Number.isSafeInteger(value) && value >= 1, `Invalid ${label}`)
}

function decodedPath(value) {
  requireValue(
    typeof value === 'string' &&
      value.startsWith('/') &&
      !value.includes('//') &&
      !/[\\?#\u0000-\u0020]/.test(value),
    'Invalid published resource path'
  )
  return value
    .split('/')
    .map((segment) => {
      const decoded = decodeURIComponent(segment)
      requireValue(
        decoded !== '.' && decoded !== '..' && !/[\\/\u0000-\u001f]/.test(decoded),
        'Invalid published resource path segment'
      )
      return decoded
    })
    .join('/')
}

async function resourceLoader(location, options) {
  options.signal?.throwIfAborted()
  const maxFileBytes = options.maxFileBytes ?? 16 * 1024 * 1024
  const maxTotalBytes = options.maxTotalBytes ?? 64 * 1024 * 1024
  positiveInteger(maxFileBytes, 'maxFileBytes')
  positiveInteger(maxTotalBytes, 'maxTotalBytes')
  let used = 0
  let resources = 0
  let url
  let root
  if (/^https?:\/\//i.test(location)) {
    url = new URL(location.endsWith('/') ? location : `${location}/`)
    requireValue(
      !url.username && !url.password && !url.search && !url.hash,
      'Use a site root without credentials, query or fragment'
    )
  } else {
    requireValue(
      isAbsolute(location) || !/^[a-z][a-z\d+.-]*:/i.test(location),
      'Only local directories and HTTP(S) roots are supported'
    )
    root = await realpath(resolve(location))
  }
  const source = url ? url.href : pathToFileURL(root).href
  let signal = options.signal
  if (url) {
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 10000)
    signal = signal ? AbortSignal.any([signal, timeout]) : timeout
  }

  async function readBytes(stream) {
    const chunks = []
    let size = 0
    for await (const chunk of stream) {
      signal?.throwIfAborted()
      size += chunk.length
      requireValue(
        size <= maxFileBytes && used + size <= maxTotalBytes,
        'Collection resource exceeds byte limit'
      )
      chunks.push(chunk)
    }
    signal?.throwIfAborted()
    used += size
    return Buffer.concat(chunks, size)
  }

  return {
    source,
    async load(path) {
      signal?.throwIfAborted()
      requireValue(++resources <= 4096, 'Too many collection resources')
      requireValue(
        typeof path === 'string' &&
          !isAbsolute(path) &&
          !path.includes('\\') &&
          path.split('/').every((segment) => segment && segment !== '.' && segment !== '..'),
        'Invalid collection-relative path'
      )
      if (url) {
        const target = new URL(path.split('/').map(encodeURIComponent).join('/'), url)
        requireValue(
          target.origin === url.origin && target.pathname.startsWith(url.pathname),
          'Resource escapes site root'
        )
        const response = await fetch(target, {
          redirect: 'error',
          signal
        })
        if (!response.ok) await response.body?.cancel().catch(() => {})
        requireValue(response.ok, `Unable to read ${path}: HTTP ${response.status}`)
        requireValue(response.body, 'Empty collection resource')
        return readBytes(response.body)
      } else {
        const file = await realpath(resolve(root, path))
        const inside = relative(root, file)
        requireValue(
          inside && !inside.startsWith(`..${sep}`) && inside !== '..' && !isAbsolute(inside),
          'Resource escapes output directory'
        )
        const handle = await open(file, 'r')
        try {
          const info = await handle.stat()
          signal?.throwIfAborted()
          requireValue(
            info.isFile() && info.size <= maxFileBytes && used + info.size <= maxTotalBytes,
            'Collection resource exceeds byte limit or is not a file'
          )
          const remaining = Math.min(maxFileBytes, maxTotalBytes - used)
          // The file can grow after stat. Read at most the remaining budget plus
          // one byte, so the shared stream check can detect overflow before allocation.
          return await readBytes(
            handle.createReadStream({
              autoClose: false,
              start: 0,
              end: remaining,
              highWaterMark: Math.min(64 * 1024, remaining + 1),
              signal
            })
          )
        } finally {
          await handle.close()
        }
      }
    }
  }
}

function resourcePath(value, basePath, prefix) {
  const path = decodedPath(value)
  const base = decodedPath(basePath)
  requireValue(base.endsWith('/') && path.startsWith(base), 'Resource escapes deployment base')
  const result = path.slice(base.length)
  requireValue(result.startsWith(prefix), 'Unexpected collection resource path')
  return result
}

function validateCollection(value) {
  requireValue(
    value?.schemaVersion === 3,
    `Unsupported AI schema: ${value?.schemaVersion}; use a schema 3 producer and rebuild the baseline`
  )
  digest(value.snapshotRevision, 'snapshotRevision')
  decodedPath(value.basePath)
  requireValue(value.basePath.endsWith('/'), 'Invalid basePath')
  requireValue(
    value.scope &&
      (value.scope.space === null ||
        (typeof value.scope.space === 'string' &&
          /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(value.scope.space))),
    'Invalid content space'
  )
  for (const key of ['versions', 'locales']) {
    const values = array(value.scope[key], `scope.${key}`)
    requireValue(
      values.length > 0 &&
        values.every((item) => typeof item === 'string' && item.length > 0) &&
        new Set(values).size === values.length,
      `Invalid scope.${key}`
    )
  }
  requireValue(
    value.outputs &&
      ['aiPageIndex', 'aiFullContent', 'markdownMirror'].every(
        (key) => typeof value.outputs[key] === 'boolean'
      ),
    'Invalid output capabilities'
  )
  const pages = array(value.pages, 'pages')
  requireValue(pages.length <= 100000, 'Too many documents')
  const ids = new Set()
  const routes = new Set()
  for (const page of pages) {
    digest(page.id, 'document id')
    digest(page.revision, 'document revision')
    digest(page.source?.revision, 'source revision')
    digest(page.representation?.fingerprint, 'body fingerprint')
    digest(page.representation?.declaredInputsRevision, 'declared input revision')
    requireValue(!ids.has(page.id) && !routes.has(page.routePath), 'Duplicate document identity or route')
    ids.add(page.id)
    routes.add(page.routePath)
    requireValue(
      value.scope.versions.includes(page.version) && value.scope.locales.includes(page.locale),
      'Document outside collection scope'
    )
    requireValue(
      page.status === 'published' && typeof page.title === 'string' && typeof page.description === 'string',
      'Invalid document metadata'
    )
    resourcePath(page.routePath, value.basePath, '')
    if (page.markdownPath !== undefined) {
      requireValue(value.outputs.markdownMirror, 'Mirror reference points to a disabled output')
      resourcePath(page.markdownPath, value.basePath, '')
    }
    requireValue(
      typeof page.source.path === 'string' &&
        page.source.path.length > 0 &&
        !page.source.path.startsWith('/') &&
        page.source.path.split('/').every((p) => p && p !== '..' && p !== '.') &&
        !page.source.path.includes('\\'),
      'Invalid logical source path'
    )
    const authored = ['markdown', 'mdx'].includes(page.source.kind)
    const derived = page.source.kind === 'openapi'
    if (authored) digest(page.source.transformedRevision, 'transformed revision')
    requireValue(
      (authored &&
        page.representation.body === 'extension-transformed-source-body' &&
        page.representation.facts === 'compiled-static-with-author-and-extension-overrides' &&
        page.representation.analysis === (page.source.kind === 'mdx' ? 'mdx-static-only' : 'markdown-static')) ||
      (derived && page.representation.body === 'source-derived-markdown' &&
        page.representation.facts === 'source-derived-static' &&
        page.representation.analysis === 'openapi-static'),
      'Unsupported content representation'
    )
    if (derived) {
      requireValue(typeof page.source.id === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(page.source.id), 'Invalid source identity')
      requireValue(typeof page.source.key === 'string' && page.source.key.length > 0, 'Invalid local document identity')
      requireValue(typeof page.source.pointer === 'string' &&
        (page.source.pointer === '' || /^\/(?:[^~]|~[01])*$/.test(page.source.pointer)), 'Invalid source pointer')
      requireValue(typeof page.source.adapterRevision === 'string' && page.source.adapterRevision.length > 0, 'Invalid adapter revision')
      digest(page.source.optionsRevision, 'source options revision')
      digest(page.source.dependenciesRevision, 'source dependencies revision')
      const dependencies = array(page.source.dependencies, 'source dependencies')
      const paths = new Set()
      requireValue(dependencies.length > 0 && dependencies.length <= 512, 'Invalid source dependency count')
      for (const dependency of dependencies) {
        requireValue(typeof dependency.path === 'string' && dependency.path.length > 0 &&
          !dependency.path.startsWith('/') && !dependency.path.includes('\\') &&
          !/[\u0000-\u001f]/.test(dependency.path) &&
          dependency.path.split('/').every((part) => part && part !== '.' && part !== '..') &&
          !paths.has(dependency.path), 'Invalid source dependency path')
        paths.add(dependency.path)
        digest(dependency.revision, 'dependency revision')
      }
      requireValue(paths.has(page.source.path), 'Source entry missing from dependencies')
      requireValue(dependencies.find((dependency) => dependency.path === page.source.path).revision === page.source.revision, 'Source entry revision mismatch')
      requireValue(page.derived && typeof page.derived === 'object' && !Array.isArray(page.derived), 'Missing derived facts')
    }
  }
  return value
}

function compareCollections(current, previous) {
  if (!previous) return { status: 'unknown', reason: 'no-baseline' }
  validateCollection(previous)
  const sameScope = JSON.stringify(current.scope) === JSON.stringify(previous.scope)
  if (
    !sameScope ||
    current.content !== previous.content ||
    current.outputs.aiFullContent !== previous.outputs.aiFullContent ||
    (current.scope.space === null && current.source !== previous.source)
  ) {
    return { status: 'unknown', reason: 'scope-or-source-changed' }
  }
  const before = new Map(previous.pages.map((page) => [page.id, page]))
  const after = new Map(current.pages.map((page) => [page.id, page]))
  return {
    status: 'complete',
    added: current.pages.filter((page) => !before.has(page.id)).map((page) => page.id),
    changed: current.pages
      .filter((page) => {
        const old = before.get(page.id)
        return (
          old &&
          (old.revision !== page.revision ||
            old.routePath !== page.routePath ||
            old.markdownPath !== page.markdownPath)
        )
      })
      .map((page) => page.id),
    // Absence proves departure from this collection, never the cause of departure.
    exited: previous.pages.filter((page) => !after.has(page.id)).map((page) => page.id)
  }
}

/** Reference consumer of public files; no Core imports and no content execution. */
export async function readCollection(location, options = {}) {
  requireValue(
    options.entry === undefined || options.entry === 'manifest' || options.entry === 'pages',
    'Invalid collection entry'
  )
  const loader = await resourceLoader(location, options)
  const indexOnly = options.entry === 'pages'
  const data = validateCollection(
    JSON.parse(decode(await loader.load(indexOnly ? 'ai/pages.json' : 'ai/manifest.json')))
  )
  if (loader.source.startsWith('http:') || loader.source.startsWith('https:')) {
    requireValue(
      decodedPath(new URL(loader.source).pathname) === decodedPath(data.basePath),
      'Site root does not match deployment base'
    )
  }
  // Only verified shards may supply a consumer's body, never an index's extra fields.
  const pages = data.pages.map(({ content: _unverified, ...metadata }) => metadata)
  if (indexOnly) {
    requireValue(data.outputs.aiPageIndex, 'Page index is disabled')
  } else {
    requireValue(data.outputs.aiFullContent, 'Full content is disabled')
    if (data.outputs.aiPageIndex) {
      requireValue(
        data.pageIndex && Number.isSafeInteger(data.pageIndex.bytes),
        'Missing page index integrity'
      )
      const path = resourcePath(data.pageIndex.path, data.basePath, 'ai/pages.json')
      requireValue(path === 'ai/pages.json', 'Unexpected page index path')
      const bytes = await loader.load(path)
      digest(data.pageIndex.fingerprint, 'page index fingerprint')
      requireValue(
        bytes.length === data.pageIndex.bytes && hash(bytes) === data.pageIndex.fingerprint,
        'Page index integrity mismatch'
      )
      const index = validateCollection(JSON.parse(decode(bytes)))
      requireValue(
        index.snapshotRevision === data.snapshotRevision &&
          JSON.stringify(index.pages) === JSON.stringify(data.pages) &&
          JSON.stringify(index.scope) === JSON.stringify(data.scope) &&
          JSON.stringify(index.outputs) === JSON.stringify(data.outputs) &&
          index.basePath === data.basePath,
        'Mixed collection snapshots'
      )
    } else {
      requireValue(data.pageIndex === null, 'Unexpected page index reference')
    }
    const byId = new Map(pages.map((page) => [page.id, page]))
    const parts = new Map()
    const shardPaths = new Set()
    const partitions = new Set()
    let totalBytes = 0
    for (const partition of array(data.partitions, 'partitions')) {
      const key = JSON.stringify([partition.version, partition.locale])
      requireValue(!partitions.has(key), 'Duplicate content partition')
      partitions.add(key)
      requireValue(
        data.scope.versions.includes(partition.version) && data.scope.locales.includes(partition.locale),
        'Partition outside collection scope'
      )
      const expectedPages = pages.filter(
        (page) => page.version === partition.version && page.locale === partition.locale
      )
      requireValue(
        partition.pages === expectedPages.length && expectedPages.length > 0,
        'Partition page count mismatch'
      )
      let sourceBytes = 0
      for (const shard of array(partition.shards, 'shards')) {
        const path = resourcePath(shard.path, data.basePath, 'ai/content/')
        requireValue(!shardPaths.has(path), 'Duplicate content shard')
        shardPaths.add(path)
        positiveInteger(shard.bytes, 'shard bytes')
        positiveInteger(shard.records, 'shard records')
        digest(shard.fingerprint, 'shard fingerprint')
        const bytes = await loader.load(path)
        requireValue(
          bytes.length === shard.bytes && hash(bytes) === shard.fingerprint,
          'Content shard integrity mismatch'
        )
        const lines = decode(bytes).split('\n').filter(Boolean)
        requireValue(lines.length === shard.records, 'Content shard record count mismatch')
        for (const line of lines) {
          const record = JSON.parse(line)
          const page = byId.get(record.documentId)
          requireValue(
            page &&
              record.version === partition.version &&
              record.locale === partition.locale &&
              record.version === page.version &&
              record.locale === page.locale &&
              record.routePath === page.routePath &&
              record.title === page.title &&
              record.description === page.description &&
              record.markdownPath === page.markdownPath &&
              typeof record.content === 'string',
            'Invalid content record metadata'
          )
          positiveInteger(record.part, 'part')
          positiveInteger(record.parts, 'parts')
          requireValue(record.parts <= 100000 && record.part <= record.parts, 'Invalid content part range')
          const entries = parts.get(page.id) ?? new Map()
          requireValue(
            !entries.has(record.part) &&
              (!entries.size || entries.values().next().value.parts === record.parts),
            'Duplicate or inconsistent content parts'
          )
          entries.set(record.part, record)
          parts.set(page.id, entries)
          sourceBytes += Buffer.byteLength(record.content)
        }
      }
      requireValue(sourceBytes === partition.sourceBytes, 'Partition content byte count mismatch')
      totalBytes += sourceBytes
    }
    for (const page of pages) {
      const entries = parts.get(page.id)
      requireValue(
        entries && entries.size === entries.values().next().value.parts,
        `Incomplete content for ${page.routePath}`
      )
      const content = [...entries.values()]
        .sort((a, b) => a.part - b.part)
        .map((part) => part.content)
        .join('')
      requireValue(
        hash(content) === page.representation.fingerprint,
        `Body fingerprint mismatch for ${page.routePath}`
      )
      page.content = content
    }
    requireValue(
      data.totals?.pages === pages.length && data.totals?.sourceBytes === totalBytes,
      'Collection totals mismatch'
    )
  }
  const snapshot = {
    schemaVersion: 3,
    source: loader.source,
    scope: data.scope,
    outputs: data.outputs,
    basePath: data.basePath,
    snapshotRevision: data.snapshotRevision,
    complete: true,
    content: !indexOnly,
    pages
  }
  if (options.previous) {
    requireValue(
      options.previous.complete === true && typeof options.previous.source === 'string',
      'Incomplete previous snapshot'
    )
  }
  return {
    ...snapshot,
    changes: compareCollections(snapshot, options.previous)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [location, route, ...args] = process.argv.slice(2)
  try {
    requireValue(
      location && route && (route === '--snapshot' || route.startsWith('/')),
      'Usage: node read-page.mjs <dist-directory|site-root-url> <route|--snapshot> [--index] [--previous file]'
    )
    const { values } = parseArgs({
      args,
      options: { index: { type: 'boolean' }, previous: { type: 'string' } }
    })
    const previous = values.previous ? JSON.parse(await readFile(values.previous, 'utf8')) : undefined
    const snapshot = await readCollection(location, {
      entry: values.index ? 'pages' : 'manifest',
      previous
    })
    if (route === '--snapshot') {
      process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`)
    } else {
      const page = snapshot.pages.find((page) => page.routePath === route)
      requireValue(page, `No indexed page for ${route}`)
      requireValue(
        typeof page.content === 'string',
        'Full content is unavailable; select a full-content manifest'
      )
      const { content, ...metadata } = page
      process.stdout.write(`${JSON.stringify({ page: metadata, content }, null, 2)}\n`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
