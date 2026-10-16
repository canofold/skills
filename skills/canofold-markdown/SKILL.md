---
name: canofold-markdown
description: Write or revise Markdown and MDX content for a Canofold site or @canofold/markdown. Use for pages, frontmatter, rich directives, links, assets, plugin syntax, or component demos.
---

# Canofold Markdown

Write content that matches the target project's Canofold version and configuration, and verify the result through the project's normal checks.

## Before writing

1. Identify whether the user is authoring a Canofold site page or Markdown passed to `@canofold/markdown`. Inspect `package.json`, `canofold.config.*` when present, nearby pages, and the project's docs root, locale, and version layout.
2. Use the installed version's documentation and existing project conventions as the authority. In a standalone React renderer, inspect `<Markdown options>` rather than assuming a site configuration exists. The bundled references describe the published 0.5.0 behavior; check newer or older versions before applying version-specific syntax.
3. Read [site content conventions](references/site-content.md) for pages, frontmatter, routes, assets, MDX, or demos. Read [rich syntax](references/rich-syntax.md) only when the task needs directives, code annotations, media, or plugin syntax.

## Authoring decisions

- Prefer ordinary Markdown/GFM for prose. Use Canofold directives for structures they support; do not invent directive names, attributes, or nesting.
- For a site page, choose the file location and frontmatter from the intended route and neighboring pages. Preserve existing published URLs unless a route change is requested and its redirects are handled.
- Use `::demo` for a runnable component example when a configured Demo engine and a real local demo source exist. Use trusted MDX only when ordinary Markdown and demos cannot express the requested content.
- Use math, diagrams, or other plugin-owned syntax only after confirming the plugin is configured. Do not add a plugin or dependency merely to decorate a page.
- Ground API claims, commands, and code examples in the project's source or user-provided facts. Do not convert a plausible example into a claim about implemented behavior.

## Finish

Run the narrow relevant check, normally the project's `canofold check` script. For rendering or interaction changes, build or preview the affected page if available. Report the changed files, the checks actually run, and anything that still needs visual or factual review.
