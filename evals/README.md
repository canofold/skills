# Skill evaluation scenarios

The [2026-10-16 Playground A/B record](./playground-2026-10-16.md) contains real-project control and Skill-assisted runs for all three experimental Skills.

Run these as realistic tasks in an isolated Canofold project. Inspect the resulting files and command output; a plausible answer alone is not a pass.

For each Skill, validate the format, run any deterministic script tests, and then evaluate real tasks. Keep the same prompt, starting files, model, and permissions for a no-Skill baseline and a Skill-assisted run. Score the resulting files and behavior against criteria chosen before the runs: factual accuracy, scope, working output, citations where needed, and checks actually performed. Record tool/time cost when available. A Skill is useful only when it improves a meaningful result or makes a fragile task reliably correct; passing with explicit invocation alone does not establish that.

Test routing separately. Install the Skill in an agent discovery directory and issue positive and negative prompts without naming it. Explicit `$skill-name` runs test the instructions, not automatic selection. Revise descriptions when the Skill is missed or selected for unrelated work.

## Current evidence (2026-10-11)

- `canofold-markdown`: In two identical Canofold 0.5.0 component sites, both the no-Skill agent and the Skill-assisted agent added a `::demo` pointing to the existing Button demo. Both passed `canofold check` and build. This case shows no measurable correctness gain from the Skill.
- `canofold-knowledge-reader`: With only the Website's `ai/` output and no Markdown mirrors, both agents located the current English and Chinese installation pages, extracted the same Node.js requirement and package-manager commands, and cited the correct routes. This case shows no correctness gain; the bundled helper remains a deterministic way to reconstruct exact pages and has four passing unit tests.
- `canofold-docs-from-code`: A Skill-assisted agent updated two language variants in an isolated code-change fixture, and correctly declined to present unreleased Core 0.6 theme work as available on the Website using 0.5.0. These are positive and boundary checks, not comparisons with a no-Skill baseline.
- At this stage, automatic Skill selection, false-positive routing, performance/cost improvement, and broader versions or projects were unverified. Do not infer general usefulness from the passing examples.

## Playground follow-up (2026-10-16)

The [Playground A/B record](./playground-2026-10-16.md) compares all three Skills with no-Skill agents on component documentation, an API rename, and an answer from AI build output. Both groups met every predeclared criterion in these cases, so the real-project runs still show no measurable benefit from the Skills. Those trials used explicit invocation rather than automatic selection.

The [automatic-routing record](./routing-2026-10-16.md) tests three positive prompts and one unrelated negative prompt with project-local Skills in an isolated Playground copy. All three positive prompts loaded the expected Skill and the negative prompt loaded none of the Canofold Skills. A richer Markdown task still produced the same correct result with and without the Canofold Skill.

The [release-boundary check](./release-boundary-2026-10-16.md) is a single source-based, isolated A/B case: `canofold-docs-from-code` kept current Website docs aligned with their published package, while the no-Skill agent documented an unreleased candidate default as current behavior. This supports that Skill's version-boundary rule in one case; it does not establish broad reliability.

## `canofold-markdown`

1. In a published 0.5.x site with no diagram plugin, ask: “Write an installation page with pnpm/npm Tabs, one local screenshot, and a titled TypeScript example.” Pass when the page uses valid nested directives and existing asset paths, makes no unsupported diagram assumptions, and `canofold check` passes.
2. In a Vite component project, ask for a live Button example. Pass when the agent checks `demos.engine`, references an actual local default-exported demo through `::demo`, and verifies the render path.
3. Negative trigger: ask to edit a generic repository README unrelated to Canofold. The Skill should not be selected merely because the file is Markdown.

## `canofold-docs-from-code`

1. Change a public option's name in implementation, types, and tests, leaving docs unchanged. Ask the agent to synchronize docs. Pass when it finds all relevant examples and source-language pages, bases claims on code, and reports translation follow-up without blindly changing `translation.sourceHash`.
2. Put a feature only on an unreleased Core branch while Website still consumes published packages. Ask for an update to the public Website. Pass when the agent detects that version boundary and does not present the feature as released without an explicit release task.
3. Negative trigger: ask for an unrelated new article with no code change. Prefer `canofold-markdown`.

## `canofold-knowledge-reader`

1. Ask a question whose answer differs between versions or locales. Pass when the agent selects the requested partition, reads page content, and cites the matching page route.
2. Disable Markdown mirrors while keeping full AI content. Pass when the agent reads the manifest and reconstructs multipart JSONL content rather than citing an index summary as the answer.
3. Ask about a topic absent from the accessible corpus. Pass when the agent states the coverage limit and does not invent a page or answer.
4. Negative trigger: ask to edit source docs. Prefer the writing or maintenance Skill.

Run the local content helper tests with `node --test evals/knowledge-reader.test.mjs`. To verify the published Markdown syntax and rendered output against an installed Canofold package, run `node evals/markdown-site-smoke.mjs <project-with-canofold-installed>`. The latter creates and removes an isolated temporary site.
