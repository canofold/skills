# Site content conventions (published 0.8.2 baseline)

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

## Versions and snapshots

`versions` is a direct array. Its first entry is current; do not add a `current`/`items` wrapper or derive the display label from a package version:

```ts
versions: [
  { id: 'v2', label: '2.x', docsDir: 'docs', base: '/' },
  { id: 'v1', label: '1.x', docsDir: 'versions/v1', base: '/v1/', status: 'archived' }
]
```

Each `docsDir` is project-relative and contains that version's actual content. `base` is its URL prefix, not a Git ref. With a non-empty array, omit top-level `docsDir`; IDs and bases must be unique, and the first entry must use `/` and cannot be archived. Omitted/empty `versions` builds from top-level `docsDir` (`docs` by default) without a version control; one entry shows its label, multiple entries permit switching. `basePath` prefixes the whole deployment independently of version bases.

Before rewriting an incompatible series, run `canofold check` and `canofold snapshot <id>` while current content still describes the previous release. The command copies into `versions/<id>/` without overwriting an existing destination, restoring Git history or changing configuration. Register the saved directory in `versions`, check/build, and commit the content with its configuration. Do not copy every patch or update a historical page to describe a current-only feature.

Snapshots reject drafts, symlinks, MDX/Demo dependencies outside the docs directory and Demos with global `demos.setup`. Keep those dependencies version-local; npm packages, external assets and build configuration are not frozen by a snapshot.

## Component content

In a site with `demos.engine` configured, a plain `.md` page can reference a local demo source:

```markdown
::demo[基础用法]{src="/src/components/button/demo/basic.tsx" description="展示按钮的默认行为。"}
```

The demo source must resolve inside the Canofold project and default-export a React component. Verify the real component and its CSS imports. Use `sandbox="iframe"` only when the example needs DOM or global-style isolation.

Run `canofold dev`; `vite()` shares its process and port and reuses the project's Vite configuration. Do not add a separate dev wrapper or second Vite server for normal consumers. Iframe Demos execute trusted repository code, not untrusted third-party code.

Use `.mdx` for trusted local JSX that cannot be expressed as Markdown or a demo. MDX imports are limited to `react`, `react/jsx-runtime`, and project-local relative files; MDX executes code during rendering and is not a sandbox for untrusted content.

## OpenAPI-derived content

For local OpenAPI 3.0.x/3.1.x JSON/YAML, import `openapi` from `@canofold/plugins/openapi` and register it in `sources`, not `markdown.plugins` or the aggregate plugin import:

```ts
sources: [openapi({
  id: 'pet-api', root: 'docs/api', entry: 'docs/api/openapi.yaml',
  version: 'v2', locale: 'en', base: '/api/'
})]
```

Bind `version` to the real configured ID (`current` for an omitted/empty versions array) and `locale` to an enabled locale. Keep a normal Markdown/MDX home page. `root` and `entry` are project-relative; the entry and all local references must remain inside root. `base` is locale-relative and excludes deployment/version prefixes. If navigation is explicit, add the generated section to the matching locale's navigation.

Author narrative guides in Markdown and API facts in the specification; generated pages, search and schema 3 AI outputs derive from that single source. This does not scan application code, call APIs, translate descriptions or enable Try-it-out. Do not create authored copies of generated parameter tables. Historical sources need explicit bindings and dependencies within their own `docsDir`; `snapshot` does not generate those bindings.

## Source of truth

For full field and path rules, consult the documentation matching the installed version: Frontmatter, content structure, assets, MDX, component demos, and versions. Validate with `canofold check`; preview when visual behavior matters.
