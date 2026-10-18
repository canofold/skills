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

## Schema 2 operational acceptance (2026-10-17)

This is a single-agent, explicitly Skill-assisted acceptance run against published Canofold 0.7.0. It is not a new A/B comparison, automatic-routing test, or evidence of a general accuracy/cost advantage. The existing Reader was used without adding a second parser, transport, cache, or persistence layer.

### Question and evidence

Task: using only the current Chinese Website corpus, explain whether reading full content requires Markdown mirrors or an API key, whether the VS Code extension sends diagram source to public services, and how to interpret a document leaving the AI collection. Cite actual page content rather than index summaries. For the isolated installation page, identify whether a team-specific CI convention exists before and after an edit.

The live `https://canofold.dev/` collection was completely validated: schema 2, 94 pages, `current` version, English and Chinese partitions. The selected Chinese pages were read in full, with `extension-transformed-source-body` representation. Answers supported by those pages:

- Markdown mirrors and full AI content have independent switches. With full content enabled, read the Manifest and validated JSONL shards even when mirrors or the page index are disabled. Building these static outputs does not call an external model or require an API key. Source: [AI output](https://canofold.dev/reference/output/ai-output/).
- The VS Code extension renders its supported diagrams locally rather than sending their source to public diagram services. This statement is about the extension, not every configurable Website plugin. Source: [VS Code extension](https://canofold.dev/vscode/).
- An exit can result from `ai: false`, draft status, deletion, or version selection. Absence alone does not establish source deletion. Failed or incomplete reads must not replace a trusted state. Source: [AI output](https://canofold.dev/reference/output/ai-output/).
- The published [installation page](https://canofold.dev/guide/introduction/installation/) specifies Node.js 22+ and package-manager installation commands; it does not specify the additional team CI convention used in the isolated edit below. Do not invent that convention from a plausible workflow.

These are corpus-grounded answers, not proof that excluded pages or all published HTML were searched. This run does not establish a future release date or undocumented API behavior.

### Real update and failure loop

Copy the Website source docs, configuration and locked installed dependencies into an isolated project; build with the Website's published 0.7.0 CLI and serve its output over local HTTP. Do not alter Website source or production content.

| Step | Observed result |
| --- | --- |
| Establish a trusted HTTP baseline | 94 fully validated pages; no previous baseline means differences are unknown. |
| Append a clearly example-specific team CI section to the Chinese installation source and rebuild | Incremental build; same document ID, new revision, source revision and body fingerprint; exactly one changed ID, no additions/exits, English page unchanged. |
| Answer again from the reconstructed body | Newly read Chinese content explicitly contains `pnpm install --frozen-lockfile`, then `pnpm docs:check` and `pnpm docs:build`; describe them as this example's convention, not global Canofold requirements. The route remains `/guide/introduction/installation/`. |
| Build again without editing | Cached build; same snapshot revision and empty added/changed/exited arrays. |
| Temporarily remove a content shard | HTTP 404 rejected; in-memory previous snapshot and the saved trusted snapshot remain unchanged. |
| Substitute an English shard at the Chinese shard path | Integrity mismatch rejected before accepting a new collection; both resources restored afterward. |
| Read again after restoring resources | Complete collection; empty added/changed/exited arrays against the trusted updated state. |
| Read only the metadata index | `content: false`; no reconstructed body on any page. Metadata is not answer evidence. |
| Read the same files at a different root without explicit `contentSpace` | Differences are unknown (`scope-or-source-changed`), not a guessed migration or deletion. |
| Add `ai: false` to the isolated installation source and rebuild | AI collection has 93 pages and exactly one exited ID; source file still exists and its HTML returns 200 with the new CI section. Exit is not deletion. |

The existing real-producer test now also asserts empty changes after a cached build and exact updated body content under the original ID. `CANOFOLD_CLI=<Website's installed 0.7.0 CLI> node --test evals/knowledge-reader.test.mjs` passed all 35 tests with zero skips. This includes existing local/HTTP limits, cancellation, malformed/mixed data, multipart reconstruction, locale/version, rename, deletion, draft/exclusion and output-switch boundaries. No Reader runtime defect was found in these tested scenarios. Temporary project and HTTP server are removed after acceptance.

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

For the current schema 3 Reader, run the real-producer suite against an explicitly chosen 0.8 CLI: `CANOFOLD_CLI=/absolute/path/to/canofold/dist/cli.js CANOFOLD_OPENAPI_ENTRY=/absolute/path/to/plugins/dist/openapi.js node --test evals/knowledge-reader.test.mjs`. Without these variables the respective real-producer cases are skipped, so fixture tests alone do not establish producer compatibility. The suite uses isolated local/HTTP fixtures and checks updates, rename, deletion, draft/AI exclusion, locale/version partitions, disabled outputs and rejected incomplete data. The helper intentionally rejects schema 1/2; use a matching earlier reader or available mirrors/HTML for older sites. The 0.7 acceptance record above describes the earlier tool and does not certify the current schema 3 implementation.

## Schema 3 acceptance (2026-10-18, local 0.8 candidate)

The suite passed 37 tests with zero skips on Node 22.12.0 against the candidate CLI and its built OpenAPI entry. The real OpenAPI case verifies referenced-schema edits, unchanged entry revision with changed dependency revision, stable identity after entry rename, failed builds preserving the trusted collection, recovery, and operation removal. This is deterministic producer/consumer acceptance, not a Skill A/B or routing evaluation.

A separate fixed GitHub REST specification (`github/rest-api-description` commit `0fa95c50cd6fc3d5f736a54f49d9195b4cb139bb`) produced nine verified pages: one authored page, an API overview, and seven selected operations. The Reader reconstructed full bodies and provenance. For `GET /repos/{owner}/{repo}/issues`, it identified query parameter `per_page`, integer default `30`, response codes `200/301/404/422`, and server `https://api.github.com`. The citation route is `/api/get/2f7265706f732f7b6f776e65727d2f7b7265706f7d2f697373756573/`, with source `docs/api/openapi.json#/paths/~1repos~1{owner}~1{repo}~1issues/get`. The same parameter was found through Pagefind over actual generated HTML and opened in the browser. No external API requests or credentials were used.

After the five 0.8.0 packages were publicly released, all 37 tests passed again with zero skips against the Website's installed npm CLI and OpenAPI entry. The Skill format validator also passed. This confirms the published producer contract; it does not claim automatic installation into a user's agent or a new routing/A/B evaluation.
