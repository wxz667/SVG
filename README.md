# SVG Editor

使用 TypeScript 开发的面向对象 SVG 命令行编辑器。

## 当前进展

- 建立工程和架构方案。
- 实现矩形、圆、椭圆、线、文字和分组六类图形，以及画布和图形工厂。
- 实现创建、删除、移动、缩放、属性设置、分组、解组、移入容器和前后层级调整的命令对象。
- 通过 Command 模式和快照实现撤销重做，失败操作不改变文档及历史。
- 实现重复 ID、循环嵌套、非法数值检查及画布操作的历史屏障。
- 接入终端交互、脚本回放、结构树和属性显示，以及 SVG 保存、读取与缺失 ID 自动补全。
- 支持示例中的嵌套平移、等比缩放和文字显示属性，修正深层分组操作的重复复制问题。
- TypeScript 严格模式编译通过，71 项自动化测试全部通过。

## 使用

需要 Node.js 20 或更新版本。

```sh
npm ci
npm run cli
```

进入后输入 `help` 查看命令。例如：

```text
init 400 300
create rect r1 10 20 100 50 red
tree
save demo.svg
```

回放流程图示例，生成的 `flowchart.svg` 可直接在浏览器打开：

```sh
npm run cli -- examples/flowchart.commands
```

运行测试：

```sh
npm test
```

架构方案与开发记录见 [doc/README.md](doc/README.md)。

生成的示例见 [examples/flowchart.svg](examples/flowchart.svg)。
