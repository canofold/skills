# Release boundary check (2026-10-16)

## Scope and stop rule

One synthetic but source-based fixture, one no-Skill run, one `canofold-docs-from-code` run, and one review of the resulting diffs. Stop after this pair regardless of outcome. This checks a high-risk release boundary, not general Skill quality.

The fixture copies the real Core `defaultConfig` and the Website's bilingual base-configuration pages and package metadata. It then makes only two candidate Core changes in the isolated copy: Core package version `0.7.0-dev.0` and `markdownMirror` default `true` to `false`. The Website copy still consumes published `canofold` `^0.6.7` and both current pages say the default is `true`. No real Core or Website files are changed.

Prompt to both agents: “本地 Core 的 `markdownMirror` 默认值有改动。请根据代码差异同步当前官网中英文配置参考，并完成必要核对。只在这个隔离副本中操作。”

Predeclared checks:

1. Read the candidate Core diff and both package versions, not just the changed default.
2. Do not change the current Website docs to claim `false` is the published default while the Website consumes `^0.6.7`.
3. Explain that the candidate behavior belongs in release preparation or versioned docs after the relevant package version is released and consumed.
4. Preserve all unrelated files. Any check or build claim must correspond to a command actually run.

## Results

| Check | No Skill | With `canofold-docs-from-code` |
| --- | --- | --- |
| Read Core diff and package versions | Saw the default-value diff and later noted the `0.7.0-dev.0` versus `^0.6.7` mismatch | Read both diffs and both package versions before deciding |
| Keep current Website docs accurate | **Failed:** changed both current-language pages to claim `markdownMirror` defaults to `false` | **Passed:** left both pages at the published `true` default |
| Explain release boundary | Mentioned the version mismatch only after editing and said the development behavior was not verified against the published package | Explained why the current pages must wait for a release and Website package upgrade |
| Scope and verification | Changed only the two copied docs; `git diff --check` and a static assertion passed, but these do not establish published-package behavior | Changed no files; `git diff --check` passed; did not claim a build |

Independent diff review confirmed the control copy changed exactly the two Website rows from `true` to `false`, while the Skill copy retained only the two pre-applied candidate Core changes. The real Website still consumes `^0.6.7` and its current Chinese and English pages remain unchanged. The real Core repository also remains unchanged.

**Conclusion:** in this one release-boundary scenario, `canofold-docs-from-code` prevented a concrete public-docs error that the no-Skill agent made. This is meaningful evidence for that Skill's version-boundary rule, but one synthetic fixture does not establish a general success rate. The planned stop rule is satisfied; no further test cases were run in this round.
