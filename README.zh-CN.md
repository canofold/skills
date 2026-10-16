# Canofold Skills

[English](README.md)

可安装的 Agent Skills，帮助 AI 基于实际项目文件创作、维护和使用 Canofold 内容。每款 Skill 都是独立目录，可以单独安装；本仓库不要求把 Canofold Core 作为运行时依赖。

这些 Skill 目前属于实验阶段：格式检查、脚本测试和隔离 Playground 中的初步自动选择测试已通过。多数同题对照未显示明显优势；在一次发布版本边界测试中，`canofold-docs-from-code` 避免了把未发布的默认值写成官网当前行为。详见[评估记录](evals/README.md)。

| Skill | 适用任务 |
| --- | --- |
| [`canofold-markdown`](skills/canofold-markdown/SKILL.md) | 在 Canofold 站点或 `@canofold/markdown` 中写、改 Markdown/MDX 内容 |
| [`canofold-docs-from-code`](skills/canofold-docs-from-code/SKILL.md) | 根据已核实的代码变更同步文档和示例 |
| [`canofold-knowledge-reader`](skills/canofold-knowledge-reader/SKILL.md) | 从 Canofold 静态产物回答有页面来源的问题 |

## 使用

将所需的 `skills/<name>/` 目录复制到 Agent 支持的 Skills 目录。例如，Codex 的个人目录可使用 `~/.codex/skills/`；也可以按所用 Agent 的说明安装到项目级目录。安装后可直接提出任务，或显式指定 Skill：

```text
使用 $canofold-markdown，为这个项目写一篇包含 Tabs 的安装指南。
使用 $canofold-docs-from-code，根据这次 API 变更更新文档。
使用 $canofold-knowledge-reader，只依据这个站点的当前英文文档回答问题并引用页面。
```

每款 Skill 先读取项目实际安装的版本、配置和相关文件。仓库内的语法参考以已发布的 Canofold 0.5.0 为基线；项目版本不同时，应以该版本的公开文档与实际构建结果为准。开发分支上的功能不自动视为已发布能力。

Skills 不代替 `canofold check`、构建和真实预览。知识读取 Skill 的本地分片读取脚本只使用 Node.js 内置模块。

## 开发与评估

每款 Skill 的 `SKILL.md` 包含触发条件和必要流程；只在任务需要时读取同目录的 `references/`。新增 Skill 前，先确认它解决了一个需要 AI 判断的完整用户任务，而非包装单条 CLI 命令。

[评估场景](evals/README.md)覆盖触发边界和可观察结果。修改 Skill 后，检查 frontmatter、链接和示例，并用真实 Canofold 项目执行对应场景。
