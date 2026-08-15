# Cordis Tutorial 独立化方案对比分析

## 1 背景

当前 `cordis-tutorial` 位于 DeepSeek Harness 仓库的 `tmp/` 子目录中，运行依赖 Harness 仓库的 vendor 包及构建产物。用户希望评估能否让 cordis-tutorial 脱离 Harness 仓库独立运行，本文对五种可行方案进行全面对比分析。

## 2 现状约束

### 2.1 运行时依赖链

```
bin.js 启动入口
├── @deepseek-ai/cordis            ← 核心（依赖 cosmokit）
├── @deepseek-ai/cordis-plugin-loader  ← 加载器（依赖 cordis, cosmokit）
└── @deepseek-ai/cordis-plugin-include ← YAML 配置（依赖 loader, cordis, cosmokit, js-yaml）

教程 .ts 文件额外直接 import:
└── @deepseek-ai/schemastery       ← 配置验证（依赖 cosmokit）

npm 第三方依赖:
└── js-yaml@4.2.0                  ← include 包解析 YAML
    └── argparse@^2.0.1
```

### 2.2 包体积数据

| 包 | src 大小 | lib/ 大小 |
|----|---------|----------|
| cordis | 94.8 KB | 258.9 KB |
| cosmokit | 18.2 KB | 91.9 KB |
| schemastery | 32.4 KB | 117.4 KB |
| loader | 36.5 KB | 135.3 KB |
| include | 12.3 KB | 73.1 KB |
| **合计** | **194.1 KB** | **676.2 KB** |

含 lib/ 的 5 包总计 137 文件、876.1 KB；教程自身仅 31.6 KB。

### 2.3 构建要求

Vendor 包仅有 TypeScript 源码，需三步配置后方可运行：

1. `tsc -b tsconfig.host.json` 生成 `lib/types/*.js`（需 Node 22+）
2. 为每个包创建 `lib/index.js` re-export 入口
3. 在根 `node_modules/@deepseek-ai/` 创建 junction 链接

## 3 方案详述

### 方案 A：保持现状（依赖 Harness 仓库）

**做法**：cordis-tutorial 保留在 Harness 仓库 `tmp/` 内，通过 junction 链接和 tsc 构建使用 vendor 包。

**优点**：
- 零维护成本，vendor 包随 Harness 仓库更新
- 不增加仓库体积
- 不需要处理 import 路径重写

**缺点**：
- 三步环境配置繁琐（tsc 构建 + index.js 创建 + junction 链接）
- `pnpm install` 可能覆盖 junction 链接，需重建
- 不能独立分发，克隆者必须同时拥有 Harness 仓库
- 受 Harness 仓库版本锁定，无法自由升级 cordis

**适用场景**：与 Harness 深度集成开发、内部学习使用。

### 方案 B：拷贝 vendor 包源码 + 构建产物

**做法**：将 5 个 vendor 包的 `src/` + `lib/` + `bin.js` + `package.json` 完整拷贝进 cordis-tutorial 仓库。

**需要处理的改动**：

| 改动项 | 说明 | 工作量 |
|--------|------|--------|
| `bin.js` 中 import 路径 | `@deepseek-ai/cordis` → 相对路径 | 低，1 个文件 |
| `lib/types/*.js` 中跨包 import | 107 个文件中的 `@deepseek-ai/*` 路径 | 高，需批量替换 |
| `lib/index.js` 中 re-export 路径 | 5 个入口文件 | 低 |
| 安装 npm 第三方依赖 | `js-yaml` + `argparse` | 低 |
| package.json 调整 | 脚本路径、依赖声明 | 中 |

**优点**：
- 完全独立，克隆即运行
- 保留完整源码，可调试 vendor 包内部

**缺点**：
- 仓库体积从 32 KB 膨胀到 ~880 KB+（27 倍）
- `lib/types/*.js` 中 107 个文件的 import 路径需全部重写，维护成本高
- vendor 包更新时需手动同步，易遗漏
- 构建产物与源码不一致风险

**适用场景**：需要深度调试 vendor 包内部逻辑、完全离线环境。

### 方案 C：拷贝 vendor 包源码 + 独立 tsc 构建

**做法**：只拷贝 `src/`，不拷贝 `lib/`，在 cordis-tutorial 仓库内独立执行 `tsc -b` 构建。

**需要处理的改动**：

| 改动项 | 说明 | 工作量 |
|--------|------|--------|
| tsconfig.json 及 project references | 调整路径指向新位置 | 中 |
| `@deepseek-ai/*` 包名解析 | 需 package.json + node_modules 链接或 import map | 中-高 |
| Node 版本要求 | 需 Node 22+ | 环境约束 |
| npm 第三方依赖 | `js-yaml` + `argparse` | 低 |
| 构建脚本 | 封装一键构建流程 | 中 |

**优点**：
- 源码最新，可自行构建
- 仓库体积适中（仅 src/，约 194 KB）
- 可同步上游更新

**缺点**：
- 仍需 Node 22+ 环境（tsc 编译要求）
- `@deepseek-ai/*` 包名解析仍需 junction 或 import map 处理
- 构建失败时不可运行（不如方案 B 的"开箱即用"）
- tsconfig project references 链路复杂，调试成本高

**适用场景**：希望保持源码同步、可接受构建步骤。

### 方案 D：用 esbuild/tsdown 打包为单文件

**做法**：将 5 个 vendor 包 + `js-yaml` 打包为少量 JS 文件（如 `cordis-runtime.js`），教程直接 import 打包产物。

**打包方式对比**：

| 工具 | 特点 | 输出 |
|------|------|------|
| esbuild | 极快、成熟、CJS/ESM 双格式 | 单文件 ~200 KB（minified） |
| tsdown | 基于 esbuild，更好的 DTS 支持 | 单文件 + .d.ts |
| webpack | 较重，支持 code splitting | 单/多文件 |

**优点**：
- 体积最小（minified 后约 200 KB）
- 无需 tsc 构建，克隆即运行
- 分发最简洁，仅需 1-2 个 JS 文件 + `js-yaml`
- 用户无需关心 vendor 包内部结构

**缺点**：
- 调试困难（打包后代码可读性差，sourcemap 需额外生成）
- 丢失 TypeScript 类型信息（除非额外输出 .d.ts）
- vendor 更新需重新打包
- 打包配置本身需维护（entry points、externals、format）

**适用场景**：面向终端用户的分发包、不关心内部实现。

### 方案 E：直接依赖上游 npm `cordis` 包

**做法**：不使用 vendor 版本，直接 `npm install cordis`（上游 `cordiverse/cordis` 包名）。

**需要处理的改动**：

| 改动项 | 说明 | 工作量 |
|--------|------|--------|
| 所有 `.ts` 文件 import 路径 | `@deepseek-ai/cordis` → `cordis` | 中，9 个文件 |
| 启动方式 | 不使用 `bin.js`，改用上游启动方式或自写入口 | 中 |
| 插件包路径 | `@deepseek-ai/cordis-plugin-*` → `cordis-plugin-*` | 低 |
| `cordis.yml` 中插件引用 | 包名对应调整 | 低 |

**版本差异风险**：

| 项目 | 上游 npm | Harness vendor |
|------|----------|---------------|
| cordis | 4.0.0-rc.7 | 4.0.1（自定义 patch） |
| loader | 未知 | vendor 版 |
| include | 未知 | vendor 版 |

上游 npm 可能缺少 Harness vendor 的自定义 patch，API 行为可能存在细微差异。

**优点**：
- 最简洁，`npm install` 即可
- 完全独立，不依赖 Harness 仓库
- 有预构建产物，无需 tsc
- 社区维护，自动获取上游更新

**缺点**：
- 版本可能与 Harness vendor 不同步（上游 RC vs vendor patch）
- Harness 特有功能可能缺失
- bin.js 启动器需重写或用上游方式
- 教程内容与 Harness 生态脱钩

**适用场景**：面向通用 Cordis 学习者、不依赖 Harness 特有功能。

## 4 综合对比

| 维度 | A 现状 | B 拷贝 lib/ | C 拷贝 src/ + tsc | D 打包 | E npm cordis |
|------|--------|-----------|------------------|--------|-------------|
| **独立性** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **克隆即运行** | ✗ | ✓ | ✗（需构建） | ✓ | ✓（需 npm install） |
| **仓库体积** | 32 KB | ~880 KB | ~194 KB + 构建 | ~200 KB | 32 KB |
| **维护成本** | 最低 | 高 | 中 | 中 | 低 |
| **vendor 同步** | 自动 | 手动 | 手动 | 手动 | npm 自动 |
| **调试友好度** | ★★★★★ | ★★★★★ | ★★★★ | ★★ | ★★★★ |
| **类型安全** | ✓ | ✓ | ✓ | 需额外 .d.ts | ✓ |
| **Node 版本要求** | 22+ | 无限制 | 22+ | 无限制 | 无限制 |
| **实现难度** | 已完成 | 中 | 中-高 | 中 | 低-中 |

## 5 推荐方案

### 首选推荐：方案 E（npm cordis）+ 方案 A（Harness vendor）双轨制

**理由**：

1. 教程的核心价值是"教学 Cordis 框架"，而非"教学 Harness vendor 集成"。方案 E 让大多数用户只需 `npm install cordis` 即可运行教程，门槛最低。

2. 同时保留方案 A 作为"Harness 深度实践"分支或附录，供需要在 Harness 仓库内开发插件的用户参考。

3. 方案 E 的主要风险（版本不同步）在教程场景中影响有限：入门级示例使用的是 Cordis 核心 API，在上游和 vendor 版之间差异极小。

### 实施路径

```
阶段 1：方案 E 快速验证（约 1 小时）
  ├── npm init + npm install cordis cordis-plugin-loader cordis-plugin-include
  ├── 9 个 .ts 文件 import 路径替换
  ├── cordis.yml 插件路径调整
  ├── 逐步骤运行验证
  └── 确认核心 API 兼容性

阶段 2：文档同步更新（约 30 分钟）
  ├── README.md 更新安装说明
  ├── 入门指南 MD/DOCX 修订包名说明
  └── 保留方案 A 的构建说明作为附录

阶段 3：独立仓库发布（约 15 分钟）
  ├── 清理 Harness 仓库内的 tmp/cordis-tutorial
  ├── 独立仓库 push
  └── 更新两版文档中的仓库地址
```

### 备选：方案 D（打包）—— 如需完全离线分发

如果目标用户无法访问 npm registry（内网环境），方案 D 是最佳备选：
- 用 esbuild 将 5 个 vendor 包打包为 `cordis-runtime.js`（~200 KB minified）
- 教程 import 该文件，无需安装任何依赖
- 需额外生成 `.d.ts` 和 sourcemap

## 6 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 上游 cordis API 变更导致教程失败 | 教程不可运行 | 锁定版本（`npm install cordis@4.0.0-rc.7`），CI 验证 |
| 上游缺少 Harness 特有功能 | 部分步骤不适用 | 将 Harness 特有步骤（如 09-harness-tool）标注为"仅 vendor 版" |
| 方案 E 与方案 A 教程分叉 | 维护两套 import 路径 | 用 `import * as Cordis from 'cordis'` 统一入口，脚本做路径替换 |
| npm registry 不可达 | 无法安装 | 提供 `package-lock.json` + 离线包；或降级到方案 D |

## 7 结论

对于 Cordis 零基础入门教程的定位，**方案 E（npm cordis）** 是最佳独立化路径：以最低成本实现完全独立，与方案 A（Harness vendor）构成双轨制，覆盖"通用学习者"和"Harness 开发者"两类用户。方案 D（打包）作为离线分发备选。

建议首先执行阶段 1 的快速验证，确认上游 `cordis` 包的 API 兼容性后，再推进后续阶段。
