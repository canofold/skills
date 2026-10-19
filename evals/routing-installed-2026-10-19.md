# Installed-Skill routing acceptance

## Setup and limits

Installed all three complete Skill directories from merged commit `1b1ba1002fff678c9b949a862339b7151f81b236` using the Skill Installer, pinned to that commit. Each installed directory, including references and the Reader helper, matched the repository byte-for-byte and passed `quick_validate.py`. The user-level discovery location is `~/.agents/skills/`; no project-local duplicates were added.

Used the desktop-bundled Codex CLI `0.162.0-alpha.17.2`, the user's existing model configuration without a model override, and fresh ephemeral `codex exec --json` sessions. Prompts did not name Skills or supply their instructions. Selection was verified from successful tool calls reading the installed `SKILL.md`, not inferred from final answers. Read-only tasks used the read-only sandbox; edits used workspace-write in disposable project copies. Nothing was committed or published.

The positive cases used copies of the real `vite-component-playground` sources and the Website's installed npm Canofold 0.8.2 dependencies, not candidate Core packages. The non-site cases used the real experimental `memory` package's README and package metadata in a separate copy. Node.js was 24.18.0 on macOS. This is a targeted routing smoke test, not a statistical reliability estimate, cross-agent certification, or no-Skill benefit comparison.

## Requests and observed selection

| Case | Request | Observed Canofold Skills and result |
| --- | --- | --- |
| Configuration negative | 请只检查 vite.config.ts，回答开发服务器是否显式设置了端口以及端口值。不要修改文件。 | None. Correctly reported no explicit `server.port`; no edits. |
| Source-explanation negative | 请只读 src/components/notice/Notice.tsx，说明关闭按钮何时出现以及 aria-label 来自哪里。不要修改文件，不需要同步文档。 | None. Explained `onDismiss` and `dismissLabel` from the requested source; no edits. |
| Ordinary README reading negative | 请只根据 README.md 前三段，用中文概括这个包是做什么的、是否属于正式发布包。不读取网络，不修改文件。 | None. Identified the experimental private memory package and its exclusion from the release pipeline; no edits. |
| Ordinary README editing negative | 仅将 README.md 开头介绍此包用途、以及不属于正式发布包这两句英文翻译为中文；保留标题和其他内容，不改代码，不需要网站构建，不提交发布。 | None. Exactly the requested two paragraphs changed; title and remaining content were unchanged. A Canofold package name and Markdown extension alone did not select site-authoring Skills. |
| Knowledge positive | 只根据本项目 .canofold/dist 的已生成知识输出回答：Progress 的 tone 有哪些？max=0 时精确的计算规则是什么？请引用中英文页面路由，不要修改文件。 | `canofold-knowledge-reader` only. Executed the installed helper successfully for `/progress/` and `/en/progress/`, listed four tones and default, and stated that the corpus does not establish the exact zero-max computation. No source-code inference was presented as published evidence. |
| Authoring positive | 在 Progress 的中英文文档页面各增加一个 Tabs 区块，分 tab 说明四种 tone 的使用场景；保留现有 Demo，完成后检查并构建文档。只修改这两个文档文件，不提交发布。 | `canofold-markdown` only. Added one four-tab block per locale. Only the two Progress pages changed; existing content and Demo sources were preserved. |
| Code-to-docs positive | 本地组件库 Notice 的关闭按钮标签公开 API 已改名，源码和 demo 已更新；这两份文档随本地组件源码一起发布。请根据当前实现同步中英文 Canofold 文档和示例，并运行必要验证。保留源码中已有改动，不修改其他组件，不提交发布。 | `canofold-docs-from-code`, with `canofold-markdown` as syntax support. Before the request, only the isolated Notice implementation and actual Demo had been changed from `dismissLabel` to `closeLabel`. The agent updated the two language pages, retained the default and Demo, and left the source change untouched. No other component changed. Supporting syntax guidance is not counted as a false positive. |

## Artifact and page verification

Both edited projects passed independent `pnpm docs:check` and `pnpm docs:build` runs. The synchronization session also passed `pnpm exec tsc --noEmit`. Byte comparisons against the original project confirmed the change scopes above; no source repository was used as an edit target.

In the browser, both Progress pages rendered four tabs and retained both working component Demos. Selecting Chinese `warning` and English `danger` changed the selected tab and displayed the matching panel. Both Notice pages displayed the renamed API and migration explanation. Their iframe Demos rendered, closed, reopened, and exposed the actual source containing `closeLabel` when the source toggle was expanded.

The first nested checks hit an isolation issue: a whole-directory `node_modules` symlink pointed Vite's configuration cache outside the writable fixture. The fixture was corrected to keep the cache local while linking dependency entries. The authoring agent independently verified a content-identical temporary copy; the synchronization agent then completed checks in its corrected fixture. Independent parent checks passed for both original fixture roots. These setup failures do not justify Skill or product workarounds. One authoring verification assertion initially used the wrong Demo DOM marker; subsequent inspection and actual browser interaction established the preserved Demos.

### Browser exception attribution follow-up

The `MutationObserver.observe` TypeError is attributable to the desktop app's in-app-browser preload, not Canofold. This conclusion is based on independent reproduction without Core, not merely the earlier Chrome comparison:

- A static HTML page with **no authored JavaScript, no external scripts and no Canofold** reproduced the identical exception with a plain sandboxed `srcdoc` iframe. A no-iframe control had no errors. This rules out Canofold's observer and React as the source of this exception.
- In an otherwise loaded, script-independent URL iframe, a controlled removal of its HTML root made `documentElement === null` while `readyState` remained `complete`. Browser error collection increased from seven to eight entries, with exactly one new matching TypeError. This isolates a null-root lifecycle boundary rather than treating accumulated console entries as new failures.
- Read-only inspection of the installed app's `app.asar/.vite/build/browser-page-preload.js` found shared frame enumeration `ic()` passing newly discovered documents to annotation marker setup `Pb()` without checking `documentElement`. `Pb()` directly executes `observer.observe(doc.documentElement, options)`. The relevant minified function declarations are at line 127, column 2099 and line 195, column 6371 in this app build. The raw console API did not expose a stack, so these are source-inspection locations, not a captured exception stack.
- App version: `26.1007.71326`, build `20398`; preload SHA-256: `6844ec68a38171555a8dbdd97c1bfb524e358edff60e0146fd77073694dbb515`. No installed application file, browser security setting or permission was modified.

Script-free reproduction:

```html
<!doctype html>
<html><head><title>Script-free iframe reproduction</title></head>
<body><iframe sandbox="allow-scripts allow-same-origin"
  srcdoc="<!doctype html><html><body>Plain iframe</body></html>"></iframe></body></html>
```

The browser-side correction belongs in its shared frame-document lifecycle: observe the Document while its HTML root is absent, initialize root-dependent annotation observers only once a root exists, and clean up/reinitialize on document or root replacement. A one-time null check that permanently skips initialization is insufficient. This browser source is not part of the Canofold workspace; the signed installed bundle was not patched, so the upstream browser defect remains unfixed. No error suppression, iframe permission weakening, arbitrary delay or browser-specific Core workaround was added.

Core's existing Demo client suite passed all 11 tests. A fresh isolated npm 0.8.2 Playground production build passed content checking and building. In the in-app browser its iframe Demo loaded, closed/reopened, exposed the real source, survived refresh, and synchronized dark/light appearance with the parent document. The preload console exception remains reproducible and is not claimed to have disappeared. The initial attempt to serve the original Playground's dev output was unsuitable because it referenced Vite virtual modules; it was replaced with the production build rather than counted as a Core failure. A reused localhost origin also retained an older conditional HTTP response; fresh-origin production verification avoided that cache artifact.

## Outcome

All three positive requests loaded their intended installed Skills; all four negative requests loaded none of the three. No Skill instruction, description, reference, or helper defect was demonstrated, so none was changed speculatively. Installation is complete for subsequent turns. Other agents, alternate prompt phrasings, and long conversations remain outside this run's coverage.
