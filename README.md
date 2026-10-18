# Canofold Skills

[简体中文](README.zh-CN.md)

Installable Agent Skills for creating, maintaining, and using Canofold content. Each Skill is self-contained and can be installed separately. This repository does not require Canofold Core as a runtime dependency.

These Skills are experimental. Format checks, script tests, and initial automatic-selection tests pass in isolated projects. Most same-task comparisons show no advantage over an agent without the Skill; one release-boundary case found that `canofold-docs-from-code` prevented an unreleased default from being documented as current. See the [evaluation record](evals/README.md).

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

Skills inspect the target project's installed version, configuration, and relevant files. Bundled syntax references describe published Canofold 0.5.0 behavior; for another version, use its documentation and actual build result. Development-branch features are not automatically treated as released capabilities.

Skills do not replace `canofold check`, builds, or previews. The knowledge reader's reference helper uses only Node.js 22+ built-in modules and validates local or HTTP schema 3 output from Canofold 0.8, including Markdown/MDX and OpenAPI-derived pages. Use the matching earlier helper or available mirrors/HTML for schema 1/2 sites. Rebuild a trusted baseline after changing formats; unsupported formats are not missing content.

## Development and evaluation

Each `SKILL.md` contains its trigger and essential workflow; load its `references/` only when needed. Add a Skill for a complete task requiring agent judgment, rather than a wrapper around one CLI command.

The [evaluation scenarios](evals/README.md) cover trigger boundaries and observable results. After changing a Skill, validate frontmatter and links, then try its scenarios in a real Canofold project.
