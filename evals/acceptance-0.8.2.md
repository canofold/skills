# Published 0.8.2 Skill acceptance

Date: 2026-10-19. This is an explicitly Skill-assisted, single-agent acceptance run, not a new automatic-routing or no-Skill A/B comparison. It does not establish a general accuracy or cost advantage.

## Contract review and corrections

- Updated authoring references from 0.5.0 to the published 0.8.2 contract: direct-array versions, real content snapshots, build-time OpenAPI, shared Vite development entry, standalone MDX and directive-recovery boundaries.
- Restricted code-driven documentation updates to their target version. Historical snapshots are not rewritten to describe current-only behavior; derived API facts stay in their specification.
- Fixed the Reader's OpenAPI-only allowlist. A real 0.8.2 custom `ContentSource` produced a valid schema 3 collection that the helper rejected. The new fixture and real-producer test failed before the fix and passed afterward. The existing derived envelope now accepts a valid source kind with matching `<kind>-static` analysis, preserving identity, dependencies, representation and integrity validation. Adapter-specific facts remain opaque data, not executable content or automatically interpreted semantics.
- Clarified that sorted scope inventories do not identify the current version or default locale, and distinguished authored-file moves from derived-entry renames.

The public types, config normalization, content producer and official Website documentation were checked against local release source and installed npm 0.8.2. No Core, Website, extension, runtime dependency or public package API was changed.

## Repeatable checks

- All three Skills passed the original `skill-creator` format validator. Its PyYAML dependency ran through an isolated uv tool environment, not a project or system dependency change.
- Reader: 38 tests passed, zero skips, with `CANOFOLD_CLI` and `CANOFOLD_OPENAPI_ENTRY` pointing to the Website's installed npm 0.8.2 packages. Coverage includes real Markdown, OpenAPI and custom-source producers; local/HTTP limits, cancellation, invalid or mixed data, multipart reconstruction, scope/version/locale, updates, rename, removal/exclusion, disabled outputs and failure recovery.
- Markdown smoke: real check/build, rendered Tabs/image/highlighted code, omitted version control, direct-array versions and `snapshot` content/asset isolation passed.
- JavaScript syntax checks, repository whitespace checks and maintained Markdown resource links passed.

The test runtime was Node.js 24.18.0 on macOS. This run did not separately repeat the Core's Node.js 22.12 minimum-version matrix. The initial sandboxed Reader run could not bind loopback HTTP ports; the unchanged tests passed with local-server execution permitted. That environmental failure is not counted as a product fix.

## Real-project exercise

Used an isolated copy of Website commit `45330c08c2baef87f282a84b4a88a8f92140b494`, its locked installed npm dependencies, existing ReleaseChannel component/Demos, both language trees and the original 0.7 snapshot. Added the Playground's local Pet API specification as explicitly version/locale-bound sources. The current version ID was deliberately `v0.8`, not `current`, with `ai.versions: 'all'`.

| Skill | Task and observed result |
| --- | --- |
| `canofold-markdown` | Authored Chinese/English component pages using real local Demos and links, with Tabs, a shared image and titled/highlighted code. Typecheck, content check and clean build passed; 202 pages were emitted. Browser interaction confirmed Tabs switching, independent inline/iframe component selection, source expansion and language-page links. |
| `canofold-docs-from-code` | Changed the existing component callback from `onChange` to `onSelect` only in the isolated project. Typecheck first rejected the stale Demo. Updated the actual Demo and both current-language explanations, then typecheck, check and incremental build passed. Reloaded browser pages showed `onSelect` in prose and displayed source; both inline and iframe Demos still switched state. Every historical snapshot file remained byte-for-byte equal to the original Website copy. |
| `canofold-knowledge-reader` | Fully validated all 202 pages locally and over HTTP; both collections matched with no differences. Selected `v0.8` explicitly despite sorted scope listing `v0.7` first. Reconstructed both new language pages and their updated callback explanation with matching route citations. For `GET /pets`, verified query parameter `limit`, integer default `20`, no authentication, specification pointer and the English/Chinese citation routes. Actual generated HTML displayed the same facts. The documented CLI also returned the exact page successfully. |

Browser console checks for the exercised pages reported no warnings or errors. Read the operation at `/en/api/get/2f70657473/` or `/api/get/2f70657473/`; its entry pointer is `docs/api/openapi.yaml#/paths/~1pets/get`. No API endpoint or credentials were used. Existing Website output was also independently read in full: schema 3, 96 current-version pages, with both languages' version/OpenAPI guides reconstructed.

Only the Skills repository contains retained changes. The isolated site and its preview server were removed after verification; acceptance artifacts were not added to product repositories. No commit, push or release was performed.
