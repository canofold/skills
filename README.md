# Canofold Skills

[简体中文](README.zh-CN.md)

Installable Agent Skills for creating, maintaining, and using Canofold content. Each Skill is self-contained and can be installed separately. This repository does not require Canofold Core as a runtime dependency.

These Skills are experimental. Their versioned references and executable helper target Canofold 0.8.2. Passing checks establish the tested behavior, not a general advantage over an agent without the Skill; see [evaluation and acceptance](evals/README.md).

| Skill | Task |
| --- | --- |
| [`canofold-markdown`](skills/canofold-markdown/SKILL.md) | Write or revise Markdown/MDX for a Canofold site or `@canofold/markdown` |
| [`canofold-docs-from-code`](skills/canofold-docs-from-code/SKILL.md) | Keep docs and examples aligned with verified code changes |
| [`canofold-knowledge-reader`](skills/canofold-knowledge-reader/SKILL.md) | Answer from Canofold static knowledge output with page citations |

## Use

Copy the `skills/<name>/` directory you need into a Skills directory supported by your agent. For example, Codex can use `~/.codex/skills/`; follow your agent's instructions for project-level installation. Then describe the task normally or invoke a Skill explicitly:

```text
Use $canofold-markdown to write an installation page with Tabs for this project.
Use $canofold-docs-from-code to update docs for this API change.
Use $canofold-knowledge-reader to answer from this site's current English docs and cite pages.
```

Skills inspect the target project's installed version, configuration, and relevant files. Bundled syntax references describe published Canofold 0.8.2 behavior, including direct-array versions, content snapshots and build-time OpenAPI sources. For another version, use its documentation and actual build result. Development-branch features are not automatically treated as released capabilities, and historical docs are not rewritten to match current-only changes.

Skills do not replace `canofold check`, builds, or previews. The 0.8 producer requires Node.js 22.12+. The knowledge reader's independent reference helper uses only Node.js 22+ built-in modules and validates local or HTTP schema 3 output, including Markdown/MDX and derived pages. Custom source facts remain opaque data unless their adapter documents the semantics. Use the matching earlier helper or available mirrors/HTML for schema 1/2 sites. Rebuild a trusted baseline after changing formats; unsupported formats are not missing content.

## Development and evaluation

Each `SKILL.md` contains its trigger and essential workflow; load its `references/` only when needed. Add a Skill for a complete task requiring agent judgment, rather than a wrapper around one CLI command.

The [evaluation scenarios](evals/README.md) cover trigger boundaries and observable results. After changing a Skill, validate frontmatter and links, then try its scenarios in a real Canofold project.
