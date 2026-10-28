# SVG Editor

使用 TypeScript 开发的面向对象 SVG 命令行编辑器。

## 当前进展

- 建立工程和架构方案。
- 实现 `Shape` 抽象类、`Rect` 矩形和 `Group` 分组容器。
- 支持移动、缩放、属性设置、嵌套分组和深拷贝。
- 实现重复 ID、循环嵌套和非法数值检查。
- TypeScript 严格模式编译通过，11 项模型测试全部通过。

## 运行测试

需要 Node.js 20 或更新版本。

```sh
npm ci
npm test
```

架构方案与开发记录见 [doc/README.md](doc/README.md)。
