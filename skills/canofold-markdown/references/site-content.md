# Site content conventions (published 0.5.0 baseline)

Use this reference when creating or editing pages in a Canofold site. Inspect the target project's configuration and neighboring files first.

## Page location and metadata

- The default locale's home is the docs root `index.md`; other locales normally use `{docsDir}/{locale}/index.md`. A project may put the default locale in an explicit locale directory instead. Follow its existing layout.
- File and directory names determine routes. A directory `index.md` names a navigation group. The `order` field controls page ordering.
- Ordinary pages normally need `title` and a factual `description`. `status: draft` remains visible in local development and checks but is excluded from production output.
- `search: false` and `ai: false` control separate output channels. Do not set them merely to silence a warning.
- `translation.sourceHash` records a reviewed source-page revision. Set it only after the translation has actually been checked against that revision.

```markdown
---
title: API 鉴权
description: 配置服务端 API Token 和请求签名
order: 20
---

# API 鉴权
```

## Links and assets

- Relative links to Markdown pages resolve from the source page and become site routes. Preserve anchors and query strings when updating links.
- Page-owned assets can live beside the page and use relative paths, such as `![界面](./images/setup.png)`.
- Shared assets belong in `{docsDir}/public/`; refer to them with a root path such as `/logo.svg`.
- When moving an already published page, account for incoming links and redirects before changing its URL.

## Component content

In a site with `demos.engine` configured, a plain `.md` page can reference a local demo source:

```markdown
::demo[基础用法]{src="/src/components/button/demo/basic.tsx" description="展示按钮的默认行为。"}
```

The demo source must resolve inside the Canofold project and default-export a React component. Verify the real component and its CSS imports. Use `sandbox="iframe"` only when the example needs DOM or global-style isolation.

Use `.mdx` for trusted local JSX that cannot be expressed as Markdown or a demo. MDX imports are limited to `react`, `react/jsx-runtime`, and project-local relative files; MDX executes code during rendering and is not a sandbox for untrusted content.

## Source of truth

For full field and path rules, consult the documentation matching the installed version: Frontmatter, content structure, assets, MDX, component demos, and versions. Validate with `canofold check`; preview when visual behavior matters.
