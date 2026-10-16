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
    for (const args of [['check'], ['build', '--no-cache']]) {
      const result = spawnSync(cli, args, { cwd: root, encoding: 'utf8' })
      assert.equal(result.status, 0, `${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
    }

    const html = await readFile(join(root, '.canofold/dist/guide/install/index.html'), 'utf8')
    assert.match(html, /data-cf-component="tabs"/)
    assert.match(html, /role="tab"/)
    assert.match(html, /images\/install\.svg/)
    assert.match(html, /data-cf-component="code-block"/)
    assert.match(html, /class="line highlighted"/)
    await readFile(join(root, '.canofold/dist/guide/install/images/install.svg'))
    console.log('PASS: check, clean build, and rendered Tabs/image/highlighted code block')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
