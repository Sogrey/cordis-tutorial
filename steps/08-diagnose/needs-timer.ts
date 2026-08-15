// ============================================================
// 步骤 8：诊断始终无法加载的插件
// ============================================================
// 学习目标：
//   - 理解 inject 指定的服务无人提供时，插件保持 PENDING
//   - 理解 PENDING 不是错误，提供方可能稍后才挂载
//   - 学会通过 registry 查看插件 fiber 状态
//
// 运行方式：node run.mjs 08
// 预期输出：
//   needs-timer is PENDING — a required service is missing
//   [diagnose] all plugins are active（如果 timer 插件已安装）
//
// 尝试在 @deepseek-ai/cordis.yml 中添加 timer 插件后重新运行
// ============================================================

import type { Context } from '@deepseek-ai/cordis'

// 这个插件依赖 'timer' 服务——本步骤不提供它
export const name = 'needs-timer'
export const inject = ['timer']

export function apply(ctx: Context) {
  console.log('needs-timer loaded')
}
