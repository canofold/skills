import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const helper = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/canofold-knowledge-reader/scripts/read-page.mjs')

async function writeFixture(root, secondPart = true) {
  const ai = join(root, 'ai')
  const content = join(ai, 'content/current/zh')
  await mkdir(content, { recursive: true })
  const shards = [
    [
      { routePath: '/other/', version: 'current', locale: 'zh', part: 1, parts: 1, content: 'ignore' },
      { routePath: '/guide/', version: 'current', locale: 'zh', part: 2, parts: 2, content: '世界' }
    ].map((record) => JSON.stringify(record)).join('\n') + '\n',
    secondPart
      ? `${JSON.stringify({ routePath: '/guide/', version: 'current', locale: 'zh', part: 1, parts: 2, content: '你好' })}\n`
      : ''
  ]
  await writeFile(
    join(ai, 'pages.json'),
    JSON.stringify({ pages: [{ routePath: '/guide/', title: '指南', version: 'current', locale: 'zh' }] })
  )
  await writeFile(
    join(ai, 'manifest.json'),
    JSON.stringify({
      schemaVersion: 1,
      partitions: [{
        version: 'current',
        locale: 'zh',
        shards: shards.map((body, index) => ({
          path: `/ai/content/current/zh/${String(index + 1).padStart(4, '0')}.jsonl`,
          bytes: Buffer.byteLength(body),
          records: body.split('\n').filter(Boolean).length,
          fingerprint: createHash('sha256').update(body).digest('hex')
        }))
      }]
    })
  )
  await Promise.all(shards.map((body, index) => writeFile(join(content, `${String(index + 1).padStart(4, '0')}.jsonl`), body)))
}

test('reconstructs one exact page across out-of-order shards', async () => {
  const root = await mkdtemp(join(tmpdir(), 'canofold-skill-reader-'))
  try {
    await writeFixture(root)
    const result = JSON.parse(execFileSync(process.execPath, [helper, root, '/guide/'], { encoding: 'utf8' }))
    assert.equal(result.page.title, '指南')
    assert.equal(result.content, '你好世界')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects incomplete page content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'canofold-skill-reader-'))
  try {
    await writeFixture(root, false)
    const result = spawnSync(process.execPath, [helper, root, '/guide/'], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Incomplete content/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects a content shard that differs from its manifest fingerprint', async () => {
  const root = await mkdtemp(join(tmpdir(), 'canofold-skill-reader-'))
  try {
    await writeFixture(root)
    const shard = join(root, 'ai/content/current/zh/0002.jsonl')
    await writeFile(shard, `${JSON.stringify({ routePath: '/guide/', version: 'current', locale: 'zh', part: 1, parts: 2, content: '再见' })}\n`)
    const result = spawnSync(process.execPath, [helper, root, '/guide/'], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Content shard fingerprint mismatch/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects a route absent from the page index', async () => {
  const root = await mkdtemp(join(tmpdir(), 'canofold-skill-reader-'))
  try {
    await writeFixture(root)
    const result = spawnSync(process.execPath, [helper, root, '/missing/'], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Expected one indexed page for \/missing\/; found 0/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
