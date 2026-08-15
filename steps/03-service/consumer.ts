// ---------- consumer.ts：消费服务方 ----------

import type { Context } from '@deepseek-ai/cordis'

export const name = 'consumer'
// 声明依赖：等待 greeter 服务就绪后才启动
export const inject = ['greeter']

export function apply(ctx: Context) {
  // 此时 ctx.greeter 保证已就绪
  console.log(ctx.greeter.greet('world'))
}
