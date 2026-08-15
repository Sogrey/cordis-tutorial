// ============================================================
// 步骤 4：事件系统
// ============================================================
// 学习目标：
//   - 理解类型化事件的声明合并（interface Events）
//   - 理解 ctx.emit() 广播分发
//   - 理解 ctx.on() 监听器随插件卸载自动移除
//
// 运行方式：node run.mjs 04
// 预期输出：
//   [stats] tool_call -> 1
//   [stats] tool_call -> 2
//   [stats] prompt -> 1
// ============================================================

// ---------- stats.ts：事件发布方（Service） ----------

import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    stats: StatsService
  }
  interface Events {
    'stats/report'(name: string, count: number): void
  }
}

export class StatsService extends Service {
  private counts = new Map<string, number>()

  constructor(ctx: Context) {
    super(ctx, 'stats')
  }

  bump(name: string) {
    const next = (this.counts.get(name) ?? 0) + 1
    this.counts.set(name, next)
    // 发出事件
    this.ctx.emit('stats/report', name, next)
  }
}

export const name = 'stats'

export function apply(ctx: Context) {
  ctx.plugin(StatsService)
}
