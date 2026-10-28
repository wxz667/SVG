# SVG Editor · Lab1 Phase 1

TypeScript 面向对象 SVG 命令行编辑器。**当前为第 1 段：架构与模型基础，还不是完整可提交的最终作业。**

## 当前已完成

- 模块职责、PlantUML 组件图、设计模式选择、依赖规则与变化点分析。
- `Shape` 抽象类、`Rect` 矩形、`Group` 组合容器、`Numbers` 数值约束，一类一文件。
- 递归移动/缩放、样式白名单、深拷贝、子树 ID 校验、防循环与移入/移出。
- 11 项模型测试与 TypeScript 严格编译。

## 运行基础验证

要求 Node.js 20 或更新版本，以及 npm。

```sh
npm ci
npm test
```

当前尚无 CLI 入口，`npm run cli` 将在命令交互阶段加入。

在本次 Codex Windows 沙箱中，Node 解析入口真实路径触发 `EPERM`；实际验证时临时使用了以下 PowerShell 环境设置。普通本机无需默认设置：

```powershell
$env:NODE_OPTIONS='--preserve-symlinks --preserve-symlinks-main'
npm test
```

## 分段计划

| 段 | 交付内容 | 状态 |
| --- | --- | --- |
| 1 | 工程、架构方案、矩形与组合模型、基础测试 | 已完成 |
| 2 | 六类图形、画布、Command 命令、事务与 undo/redo | 待完成 |
| 3 | REPL、SVG 读写、完整错误信息、示例回放 | 待完成 |
| 4 | 全需求验收、文档一致性自查、最终推送与 `final` 标签 | 待完成 |

用户提供的截止日期为 **2026-10-31**，未给出具体时刻。最终标签必须在截止前创建并推送；当前不打 `final`，不以阶段性成果冒充最终交付。

正式作业文档见 [doc/README.md](doc/README.md)，原始要求见 [doc/phase_cli_1.md](doc/phase_cli_1.md)。
