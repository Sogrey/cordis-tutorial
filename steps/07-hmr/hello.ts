// ============================================================
// 步骤 7：组合与热重载（HMR）
// ============================================================
// 学习目标：
//   - 理解 cordis.yml 配置项的 id / disabled 元数据
//   - 理解 id 提供稳定标识，避免"先删再加"的误判
//   - 理解 HMR：修改文件后旧 fiber 卸载、新 fiber 加载
//
// 运行方式：node run.mjs 07
//   启动后会看到 "hello from my first plugin"
//   编辑 hello.ts 修改日志内容并保存，观察自动重载
//
// 注意：本步骤需要 cordis-plugin-hmr 和 cordis-plugin-timer 插件。
//   如果没有安装这些插件，启动器会显示 PENDING 诊断信息。
//   你也可以手动修改 hello.ts 后重新运行，体验"重启即更新"。
// ============================================================

import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello'

export function apply(ctx: Context) {
  console.log('hello from my first plugin')
  // 修改这行文字后保存，如果有 HMR 插件会自动重载
  // 没有 HMR 插件时，重新运行也能看到变化
}
