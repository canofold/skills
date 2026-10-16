# Playground evaluation (2026-10-16)

## Source and method

The source project is `vite-component-playground`, linked to local Canofold 0.6.7. It is a development playground, not a published-package consumer or a Git repository. Each editing run uses an isolated copy; the original project is read-only. The copies have the same source files and package links. A control agent receives the task alone; a treatment agent receives the same task plus one named Skill. Both use the same model and tool permissions. Inspect the diffs and run the checks in each copy before scoring.

These trials test instruction quality after explicit invocation. They do not test automatic Skill selection. A single successful run cannot establish a reliable advantage; repeat promising cases and include negative routing prompts before release.

## Case M: write component documentation

Starting point: remove `docs/progress.md` and `docs/en/progress.md` from identical copies. Keep the Progress component and its two existing Demo modules.

Prompt: “为这个组件库的 Progress 组件补齐中英文 Canofold 文档。展示真实的基础用法和 tone 示例，说明实际公开的属性与默认值。保持现有站点结构，完成后验证。”

Score before reading responses:

1. Both `/progress/` and `/en/progress/` pages exist and use the two existing Demo files via `::demo`.
2. API facts agree with `ProgressProps` and implementation; do not invent behavior.
3. No unrelated source, dependency, or config change.
4. `canofold check` and a clean docs build pass; generated pages include the Demo output.

## Case D: sync docs from a code change

Starting point: in identical copies, `NoticeProps.dismissLabel` and the demo usage were renamed to `closeLabel`; the existing Chinese and English docs still say `dismissLabel`. The source and demo changes are visible in Git diff.

Prompt: “Notice 的公开 API 已经改动。根据代码差异同步中英文 Canofold 文档和示例，保留现有实现，完成后验证。”

Score before reading responses:

1. Both language pages describe `closeLabel` and its actual default value; neither still claims `dismissLabel` is current.
2. Any migration statement is limited to facts supported by the diff and current code.
3. No unrelated source, dependency, or config change.
4. `canofold check` and a clean docs build pass.

## Case K: answer from static knowledge output

Starting point: copy only the Playground build's `ai/` directory, omitting Markdown mirrors and source code.

Prompt: “只根据这个 Canofold AI 产物，说明当前中英文 Progress 文档支持哪些 tone、`value` 超出范围会怎样，以及 `max` 为 0 时的精确计算规则。逐项给出页面路由和依据。”

Score before reading responses:

1. Select the current Chinese and English Progress pages and cite their `routePath` values.
2. Extract the supported tones and clamping statement from full page content, not just index metadata.
3. State that the corpus does not specify the exact `max = 0` calculation; do not use source-code knowledge or guess.
4. Do not present the `ai/` corpus as proof of every page in the site.

## Results

All six runs used the same model and permissions. The treatment agents confirmed that they read their assigned `SKILL.md`; the controls were prohibited from reading the Skills repository. The source Playground's `docs/` and `src/` remained unchanged. Generated files and diffs below are in isolated copies only.

| Case | No Skill | With Skill | Observed difference |
| --- | --- | --- | --- |
| M: Progress docs | 4/4 | 4/4 | Both wrote Chinese and English pages, used the existing `basic.tsx` and `tones.tsx` demos, matched the component API, and passed `canofold check` and clean build. Each generated page contains two Demo figures. The wording differs, but the Skill produced no measurable correctness gain. |
| D: Notice API change | 4/4 | 4/4 | Both updated Chinese and English API tables to `closeLabel` with the actual default `关闭提示`, preserved the pre-applied source/demo rename, and passed check and build. The Skill run added a migration sentence; the control run added a default-label explanation. Neither is required for correctness. |
| K: AI output answer | 4/4 | 4/4 | Both selected `/progress/` and `/en/progress/`, read the current full-content JSONL, extracted all four tones and the value-clamping statement, and correctly declined to infer the exact `max = 0` calculation. The Skill run also mentioned manifest and pages index. |

The M and D editing copies also passed `git diff --check`; both D copies passed `tsc --noEmit`. I independently inspected the four diffs and generated HTML. For M, both languages contain two rendered Demo figures with references to both existing source files. For D, both languages contain the rendered dismissible Demo and current `closeLabel`; the Skill output also contains the obsolete name only in an explicitly marked migration instruction. The current implementation in the isolated D copies sets `closeLabel = '关闭提示'`.

The K corpus contains `ai/manifest.json`, `ai/pages.json`, and current Chinese/English JSONL content, but no source Markdown or component code. Both answers cite the correct routes and stay within that evidence. The controls were given the same corpus access, so the result does not show a retrieval advantage from the helper.

The repository's `knowledge-reader.test.mjs` passes all four tests. The Markdown smoke site passes `canofold check`, a clean build, and rendered Tabs, local image, and highlighted code checks against the linked Playground package. During this run, the smoke script initially failed because a pnpm CLI shim resolved a relative Core path from the temporary site. Calling the consumer project's CLI by its absolute path fixed that harness issue. The official `quick_validate.py` could not start because the available Python environments lack `PyYAML`; an equivalent frontmatter/name/description/placeholder check with Ruby's YAML parser passed for all three Skills.

**Decision:** these three real-project tasks show that the Skills can guide correct work, but they do not demonstrate better results than ordinary agents. Keep all three experimental. Do not describe them as proven useful or release-ready. Tool/time cost was not measured; automatic selection and negative routing were not tested. Further evaluation should target cases where ordinary agents actually fail or where the Skills measurably reduce effort, rather than repeating easy success cases.
