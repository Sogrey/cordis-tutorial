# Cordis 入门学习程序

9 步渐进式实践，从零掌握 Cordis 插件框架的核心概念。

## 双轨制：Harness 模式与 npm 模式

本教程支持两种依赖源，默认使用 **Harness 模式**，可通过脚本一键切换：

| 模式 | 依赖来源 | 适用场景 | Node 版本 |
|------|---------|---------|----------|
| **harness**（默认） | DeepSeek Harness 仓库 vendor 包 | 与 Harness 同步开发、深度集成 | >= 22 |
| **npm**（备选） | npm registry 上游 `cordis` 包 | 独立学习、无需 Harness 仓库 | >= 18 |

```bash
# 查看当前模式
npm run switch:status

# 切换到 Harness 模式（默认）
npm run switch:harness

# 切换到 npm 独立模式
npm run switch:npm
```

切换脚本（`switch-deps.mjs`）会自动处理：
1. 所有 `.ts` 文件的 import 路径（`@deepseek-ai/cordis` ↔ `cordis` 等）
2. `package.json` 中 step01~09 的脚本路径（`vendor/cordis/bin.js` ↔ `node_modules/cordis/bin.js`）
3. `run.mjs` 中的启动器解析逻辑和错误提示

所有替换均可逆，反复切换不丢失信息。

## 快速开始

### 方式一：Harness 模式（默认）

#### 前置条件

- Node.js >= 22（Harness 仓库要求 `^22.19.0 || >=24.0.0`）
- pnpm >= 11
- 已克隆 DeepSeek Harness 仓库并完成 `pnpm install`
- 已完成 vendor 包构建和 node_modules 链接（详见「环境配置说明」）

#### 安装

将本教程目录复制到 Harness 仓库内：

```bash
# 假设 Harness 仓库在 ~/deepseek-harness
cp -r cordis-tutorial ~/deepseek-harness/tmp/
cd ~/deepseek-harness/tmp/cordis-tutorial
```

教程依赖 Harness 仓库内的 `vendor/cordis/bin.js` 启动器和 `@deepseek-ai/cordis` 包，无需额外安装任何依赖。

### 方式二：npm 独立模式

#### 前置条件

- Node.js >= 18

#### 安装

```bash
cd cordis-tutorial

# 切换到 npm 模式（自动安装依赖）
npm run switch:npm
```

切换脚本会自动完成：替换 import 路径 + 更新脚本配置 + 安装 npm 依赖（`cordis`、`@cordisjs/plugin-loader`、`@cordisjs/plugin-include`、`schemastery`）。

> **注意**：上游 npm `cordis` 版本为 `4.0.0-rc.x`，与 Harness vendor 版本可能有细微差异。核心 API 一致，入门教程步骤兼容。

### 运行

```bash
# 运行指定步骤
node run.mjs 01          # 步骤 1：第一个插件
node run.mjs 05          # 步骤 5：Waterfall

# 依次运行所有步骤
node run.mjs all

# 或用 npm scripts
npm run step01
npm run all
```

Harness 模式下也可以手动进入步骤目录运行（与官方教程完全一致）：

```bash
cd steps/01-hello
node --import tsx ../../../../vendor/cordis/bin.js
```

> **注意**：手动运行时需从 `steps/xx-xxx/` 上跳四层到 Harness 仓库根。`vendor/cordis/bin.js` 会从当前工作目录向上查找 `node_modules`，如果根 `node_modules/@deepseek-ai/` 下缺少 vendor 包的链接，需要先创建（参见「环境配置说明」）。

## 学习路线

| 步骤 | 目录 | 学习目标 | 预期输出 |
|------|------|---------|---------|
| 1 | `steps/01-hello` | 插件基本形态、apply(ctx) 入口 | `hello from my first plugin` |
| 2 | `steps/02-lifecycle` | ctx.effect()、fiber.dispose()、状态机 | `tick` x3 → `cleaned up` → `disposed` |
| 3 | `steps/03-service` | Service 子类、inject 依赖、声明合并 | `Hello, world!` |
| 4 | `steps/04-events` | 类型化事件、emit/on、声明合并 | `[stats] tool_call -> 1` ... |
| 5 | `steps/05-waterfall` | waterfall 环绕中间件、短路 | `HELLO` / `** BLOCKED **` |
| 6 | `steps/06-config` | Schema 配置验证、默认值 | `Hello, alpha!` / `Hello, beta!` |
| 7 | `steps/07-hmr` | id/disabled 元数据、HMR 热重载、诊断 | `hello from my first plugin` + `[diagnose] all plugins are active` |
| 8 | `steps/08-diagnose` | PENDING 状态诊断、registry | `needs-timer is PENDING` |
| 9 | `steps/09-harness-tool` | 综合运用：工具注册+事件观察 | `[tool-logger] greet -> Hello, Cordis!` |

## 运行原理

每个步骤目录包含一个 `cordis.yml` 配置文件和一个或多个 `.ts` 插件源码。运行时：

1. `run.mjs` 切换工作目录到对应步骤目录
2. 调用 Harness 仓库的 `vendor/cordis/bin.js` 启动器
3. 启动器创建根 Context → 挂载 Loader 插件 → 读取 `cordis.yml` → 加载插件

```
deepseek-harness/              ← Harness 仓库根
├── vendor/
│   ├── cordis/
│   │   ├── bin.js             ← 启动器（本教程调用它）
│   │   └── lib/               ← 构建产物（需 tsc + 手动创建入口）
│   ├── loader/
│   ├── include/
│   └── ...                    ← 其他 vendor 包
├── node_modules/
│   └── @deepseek-ai/          ← vendor 包的 junction 链接（需手动创建）
└── tmp/
    └── cordis-tutorial/       ← 本教程
        ├── run.mjs            ← 统一运行脚本
        ├── package.json
        └── steps/
            ├── 01-hello/
            │   ├── cordis.yml  ← 插件组合配置
            │   └── hello.ts   ← 插件源码
            ├── 02-lifecycle/
            │   ├── cordis.yml
            │   └── lifecycle.ts
            └── ...
```

## 每步学什么

### 步骤 1：第一个插件
- 插件是函数，由 loader 挂载
- `apply(ctx)` 是入口
- `cordis.yml` 组合应用，不需要框架启动代码

### 步骤 2：生命周期与 Effect
- `ctx.effect()` 注册副作用，返回 disposer
- `fiber.dispose()` 递归卸载子插件
- Fiber 状态机：`PENDING → LOADING → ACTIVE → DISPOSED`

### 步骤 3：服务与依赖
- `Service` 子类通过 `super(ctx, 'name')` 注册
- `inject = ['serviceName']` 声明依赖，等待服务就绪
- 声明合并让 `ctx.<key>` 类型安全
- 加载顺序由依赖关系决定，不是文件顺序

### 步骤 4：事件系统
- `interface Events` 声明合并注册事件名
- `ctx.emit()` 广播，`ctx.on()` 监听
- `ctx.on()` 本身是 effect，卸载时自动移除

### 步骤 5：Waterfall
- waterfall 是环绕中间件，类似 Koa middleware
- 调 `next()` 放行，不调 `next()` 短路
- 观察型监听器**必须**调 `next()`

### 步骤 6：配置
- `Schema.object({...})` 声明配置验证
- `apply(ctx, config)` 接收经过验证的配置
- 默认值自动补齐，错误配置明确报错

### 步骤 7：组合与诊断
- `id` 提供稳定标识，用于 HMR 热重载时保持插件身份
- `disabled` 跳过挂载
- HMR：保存文件 → 旧 fiber 卸载 → 新 fiber 加载
- 不带 `id` 的配置项每次编辑都会被视为先删后加
- 本步骤同时包含 `diagnose.ts`，展示如何在运行时检查所有插件的 fiber 状态

### 步骤 8：诊断 PENDING
- `inject` 指定的服务无人提供时，插件保持 PENDING
- PENDING 不是错误，提供方可能稍后才挂载
- 通过 `ctx.registry` 遍历 fiber 状态

> **注意**：Cordis 的 `FiberState` 是 `const enum`（`PENDING=0, LOADING=1, ACTIVE=2, FAILED=3, DISPOSED=4, UNLOADING=5`），编译时会被内联为数字值，运行时不存在 `FiberState` 对象。因此教程代码中使用数字常量比较，而非 `FiberState.PENDING`。如果在独立 Cordis 项目中开发（非 vendor 环境），且 TypeScript 配置保留了 `const enum`，则可以直接使用 `FiberState.PENDING`。

### 步骤 9：注册真实工具
- 综合运用：服务 + 事件 + effect
- 通过 `mock-tools.ts` 模拟 Harness 的工具服务，无需完整 Harness 环境也能运行
- `greet-tool.ts` 注册一个 `greet` 工具，返回问候文本
- `tool-logger.ts` 通过事件观察工具执行结果

## 包名说明

本教程默认使用 Harness 模式，所有 import 路径使用 vendor 后的包名。切换到 npm 模式后，import 路径自动替换为上游包名：

| 包 | Harness 模式 | npm 模式 |
|----|------------|---------|
| Cordis | `@deepseek-ai/cordis` | `cordis` |
| Schemastery | `@deepseek-ai/schemastery` | `schemastery` |
| Cordis 插件 | `@deepseek-ai/cordis-plugin-*` | `@cordisjs/plugin-*` |

两种包名的 API 完全一致，切换不会影响功能。

## 环境配置说明

本教程依赖 Harness 仓库的 vendor 包。由于 vendor 包只有 TypeScript 源码（`src/`），没有预构建产物，需要完成以下三步配置：

### 1. 构建 vendor 包

```bash
cd deepseek-harness
# 切换到 Node 22+（仓库要求 ^22.19.0 || >=24.0.0）
nvm use 22
# 构建 TypeScript 产物到 lib/types/
tsc -b tsconfig.host.json
```

构建后，每个 vendor 包的 `lib/types/` 目录会包含编译后的 JS 和 `.d.ts` 文件。

### 2. 创建 lib/index.js 入口

`tsc` 只输出到 `lib/types/`，但各包 `package.json` 的 `main` 指向 `lib/index.js`。需要为每个 vendor 包创建 re-export 入口：

```bash
# ESM 包（cordis, cosmokit, loader, include, group, timer, hmr, logger-console）
echo "export * from './types/index.js'" > vendor/<pkg>/lib/index.js

# 有 default export 的包（loader, include, group, timer, hmr, logger-console）额外加一行
echo -e "export * from './types/index.js'\nexport { default } from './types/index.js'" > vendor/<pkg>/lib/index.js

# schemastery（双格式 ESM/CJS）
echo -e "export * from './types/index.js'\nexport { default } from './types/index.js'" > vendor/schemastery/lib/index.mjs
echo "const mod = require('./types/index.js'); module.exports = mod.default || mod;" > vendor/schemastery/lib/index.cjs
```

> 哪些包需要 `default` re-export？查看源码 `src/index.ts` 中是否有 `export default`。cordis 和 cosmokit 没有，其余 6 个有。logger-console 还需额外创建 `lib/browser.js`（内容与 `lib/index.js` 相同）。

### 3. 创建 node_modules 链接

vendor 包是 workspace 包，默认只在依赖它们的包（如 `apps/cli`）的 `node_modules` 中有链接。需要从 Harness 仓库根 `node_modules/@deepseek-ai/` 创建 junction 链接到 `vendor/` 目录：

```bash
cmd /c mklink /J node_modules\@deepseek-ai\cordis vendor\cordis
cmd /c mklink /J node_modules\@deepseek-ai\cosmokit vendor\cosmokit
cmd /c mklink /J node_modules\@deepseek-ai\schemastery vendor\schemastery
cmd /c mklink /J node_modules\@deepseek-ai\cordis-plugin-loader vendor\loader
cmd /c mklink /J node_modules\@deepseek-ai\cordis-plugin-include vendor\include
cmd /c mklink /J node_modules\@deepseek-ai\cordis-plugin-group vendor\group
cmd /c mklink /J node_modules\@deepseek-ai\cordis-plugin-timer vendor\timer
cmd /c mklink /J node_modules\@deepseek-ai\cordis-plugin-hmr vendor\hmr
cmd /c mklink /J node_modules\@deepseek-ai\cordis-plugin-logger-console vendor\logger-console
```

> **注意**：`pnpm install` 可能会覆盖这些 junction 链接。如果重新运行 `pnpm install` 后教程报 `ERR_MODULE_NOT_FOUND`，请重新创建链接。

## 独立化方案对比分析

本教程支持双轨制（Harness 模式 + npm 模式），背后的方案评估详见 [independence-analysis.md](./independence-analysis.md)。该文档对比了五种独立化方案（A 保持现状 / B 拷贝 lib / C 拷贝 src+tsc / D 打包 / E npm cordis），最终推荐 A+E 双轨制。

## 参考资源

- [Cordis GitHub](https://github.com/cordiverse/cordis)
- [Cordis 入门文档](https://deepseek-harness.github.io/deepseek-harness/reference/cordis-primer)
- [Cordis 教程（7 章原文）](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/)
- [Koishi 官网](https://koishi.chat/zh-CN/)
- [DeepSeek Harness GitHub](https://github.com/deepseek-ai/deepseek-harness)

