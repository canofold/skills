#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const consumer = process.argv[2]
if (!consumer) {
  console.error('Usage: node evals/markdown-site-smoke.mjs <project-with-canofold-installed>')
  process.exitCode = 2
} else {
  const root = await mkdtemp(join(tmpdir(), 'canofold-markdown-skill-'))
  try {
    await symlink(resolve(consumer, 'node_modules'), join(root, 'node_modules'))
    await mkdir(join(root, 'docs/guide/images'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{"name":"canofold-skill-smoke","private":true,"type":"module"}\n')
    await writeFile(join(root, 'canofold.config.ts'), `import { defineConfig } from 'canofold'
export default defineConfig({ title: 'Skill Smoke', description: 'Markdown syntax check', siteUrl: 'https://example.test' })
`)
    await writeFile(join(root, 'docs/index.md'), `---
title: 首页
description: 示例站点首页
---
# 首页
[安装指南](/guide/install/)
`)
    await writeFile(join(root, 'docs/guide/index.md'), `---
title: 指南
description: 示例指南
---
# 指南
`)
    await writeFile(join(root, 'docs/guide/install.md'), `---
title: 安装
description: 使用 pnpm 或 npm 安装 Canofold
---

# 安装

::::tabs[安装方式]
:::tab[pnpm]
运行 \`pnpm add -D canofold\`。
:::
:::tab[npm]
运行 \`npm install --save-dev canofold\`。
:::
::::

![安装界面](./images/install.svg "安装界面")

\`\`\`ts title="canofold.config.ts" {2}
import { defineConfig } from 'canofold'
export default defineConfig({ title: 'Docs' })
\`\`\`
`)
    await writeFile(join(root, 'docs/guide/images/install.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"/>\n')

    const cli = resolve(consumer, 'node_modules/.bin/canofold')
    const run = (args) => {
      const result = spawnSync(cli, args, { cwd: root, encoding: 'utf8' })
      assert.equal(result.status, 0, `${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
    }
    for (const args of [['check'], ['build', '--no-cache']]) {
      run(args)
    }

    const html = await readFile(join(root, '.canofold/dist/guide/install/index.html'), 'utf8')
    assert.match(html, /data-cf-component="tabs"/)
    assert.match(html, /role="tab"/)
    assert.match(html, /images\/install\.svg/)
    assert.match(html, /data-cf-component="code-block"/)
    assert.match(html, /class="line highlighted"/)
    await readFile(join(root, '.canofold/dist/guide/install/images/install.svg'))
    assert.doesNotMatch(html, /aria-label="文档版本"/)

    // Snapshot actual content before changing the current release, not a version label alone.
    run(['snapshot', 'v1'])
    const original = await readFile(join(root, 'docs/guide/install.md'), 'utf8')
    assert.equal(await readFile(join(root, 'versions/v1/guide/install.md'), 'utf8'), original)
    await readFile(join(root, 'versions/v1/guide/images/install.svg'))
    await writeFile(join(root, 'docs/guide/install.md'), original.replace('title: 安装', 'title: 新版安装'))
    await writeFile(join(root, 'canofold.config.ts'), `export default {
      versions: [
        { id: 'v2', label: '2.x', docsDir: 'docs', base: '/' },
        { id: 'v1', label: '1.x', docsDir: 'versions/v1', base: '/v1/', status: 'archived' }
      ]
    }`)
    run(['check'])
    run(['build'])
    const current = await readFile(join(root, '.canofold/dist/guide/install/index.html'), 'utf8')
    const historical = await readFile(join(root, '.canofold/dist/v1/guide/install/index.html'), 'utf8')
    assert.match(current, /新版安装/)
    assert.doesNotMatch(historical, /新版安装/)
    assert.match(current, /2\.x/)
    assert.match(historical, /1\.x/)
    await readFile(join(root, '.canofold/dist/v1/guide/install/images/install.svg'))
    assert.equal(await readFile(join(root, 'versions/v1/guide/install.md'), 'utf8'), original)
    console.log('PASS: check/build, rendered Tabs/image/code, direct-array versions and independent snapshots')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
