# Rich syntax (published 0.5.0 baseline)

Use this reference only for rich Markdown requests. Standard Markdown and GFM handle headings, links, images, tables, tasks, footnotes, and definition lists. Canofold generates the HTML, ARIA attributes, and interaction hooks; authored content does not need internal `cf-*` classes.

## Common structures

```markdown
:::tip[提交前检查]
运行类型检查和生产构建。
:::

::::tabs[安装方式]
:::tab[pnpm]
运行 `pnpm add -D canofold`。
:::
:::tab[npm]
运行 `npm install --save-dev canofold`。
:::
::::

::::steps[发布流程]
:::step[构建]
运行 `pnpm build`。
:::
:::step[预览]
检查生成页面。
:::
::::
```

`tabs` 只能直接包含 `tab`；`steps` 只能直接包含 `step`。`code-group` 只能直接包含 fenced code blocks。`file-tree` 包含 Markdown 列表。`card-grid` 直接包含带 `href` 的 `card`。`api` 需要 `method` 和 `path`，其 `response` 子项需要状态标签。检查指令的形态和嵌套，不要只检查名称。

## Code and media

Fenced code can use a language, `title="file.ts"`, and highlighted lines such as `{2,4-5}`. Supported Shiki annotations include `[!code ++]`, `[!code --]`, `[!code highlight]`, `[!code focus]`, `[!code error]`, and `[!code warning]`.

Images use normal Markdown; an image title becomes its caption. A PDF, Word, PowerPoint, or Excel link on its own line can become a file block. `:::gallery` contains one Markdown image per paragraph. `::video`, `::audio`, and `::embed` require `src` and an accessible label.

## Plugin-owned syntax

Math, Mermaid, PlantUML, Graphviz, and D2 require the corresponding configured plugin. For example, a `mermaid` code fence only renders as a diagram when `mermaid()` is in a site's `markdown.plugins` or the standalone renderer's `options.plugins`. Otherwise it is a code fence or can fail the project's unknown-language policy. Confirm installed plugins and their options before using such syntax. Standalone `<Markdown>` strips raw HTML by default; inspect its `html` option before relying on authored HTML.

Canofold validates directive names, required attributes, and nesting. Use the installed version's Markdown syntax reference and `canofold check` for exact rules instead of guessing from another Markdown framework.
