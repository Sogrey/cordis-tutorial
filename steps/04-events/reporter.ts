// ---------- reporter.ts：事件监听方 ----------

import type { Context } from '@deepseek-ai/cordis'
// 引入声明合并（仅类型，无运行时依赖）
import type {} from './stats.ts'

export const name = 'reporter'
export const inject = ['stats']

export function apply(ctx: Context) {
  // 监听事件——ctx.on() 本身是 effect，卸载时自动移除
  ctx.on('stats/report', (name, count) => {
    console.log(`[stats] ${name} -> ${count}`)
  })

  // 触发几次事件
  ctx.stats.bump('tool_call')
  ctx.stats.bump('tool_call')
  ctx.stats.bump('prompt')
}
