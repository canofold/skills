#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

const [directory, routePath] = process.argv.slice(2)
if (!directory || !routePath || !routePath.startsWith('/')) {
  console.error('Usage: node read-page.mjs <dist-directory> </exact/route/>')
  process.exitCode = 2
} else {
  try {
    const root = resolve(directory)
    const loadJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))
    const index = await loadJson('ai/pages.json')
    const manifest = await loadJson('ai/manifest.json')
    if (manifest.schemaVersion !== 1) throw new Error(`Unsupported AI manifest schema: ${manifest.schemaVersion}`)

    const matches = index.pages.filter((page) => page.routePath === routePath)
    if (matches.length !== 1) {
      throw new Error(`Expected one indexed page for ${routePath}; found ${matches.length}`)
    }
    const page = matches[0]
    const partitions = manifest.partitions.filter(
      (partition) => partition.version === page.version && partition.locale === page.locale
    )
    if (partitions.length !== 1) {
      throw new Error(`Expected one content partition for ${page.version}/${page.locale}; found ${partitions.length}`)
    }

    const records = []
    for (const shard of partitions[0].shards) {
      const marker = '/ai/content/'
      const markerIndex = shard.path.indexOf(marker)
      if (markerIndex < 0) throw new Error(`Invalid content shard path: ${shard.path}`)
      const file = resolve(root, shard.path.slice(markerIndex + 1))
      if (!file.startsWith(`${root}${sep}`)) throw new Error(`Content shard escapes output directory: ${shard.path}`)
      const bytes = await readFile(file)
      if (typeof shard.bytes === 'number' && bytes.length !== shard.bytes) {
        throw new Error(`Content shard size mismatch: ${shard.path}`)
      }
      if (typeof shard.fingerprint === 'string' && createHash('sha256').update(bytes).digest('hex') !== shard.fingerprint) {
        throw new Error(`Content shard fingerprint mismatch: ${shard.path}`)
      }
      const lines = bytes.toString('utf8').split('\n').filter(Boolean)
      if (typeof shard.records === 'number' && lines.length !== shard.records) {
        throw new Error(`Content shard record count mismatch: ${shard.path}`)
      }
      for (const line of lines) {
        const record = JSON.parse(line)
        if (record.routePath === routePath && record.version === page.version && record.locale === page.locale) {
          if (typeof record.content !== 'string') throw new Error(`Invalid content record for ${routePath}`)
          records.push(record)
        }
      }
    }

    const expectedParts = records[0]?.parts
    if (!Number.isInteger(expectedParts) || expectedParts < 1 || records.length !== expectedParts) {
      throw new Error(`Incomplete content for ${routePath}`)
    }
    records.sort((left, right) => left.part - right.part)
    if (records.some((record, index) => record.part !== index + 1 || record.parts !== expectedParts)) {
      throw new Error(`Invalid content parts for ${routePath}`)
    }

    process.stdout.write(`${JSON.stringify({ page, content: records.map((record) => record.content).join('') }, null, 2)}\n`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
