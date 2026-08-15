// ============================================================
// 步骤 5：Waterfall——转换或短路
// ============================================================
// 学习目标：
//   - 理解 waterfall 是环绕中间件
//   - 理解调用 next() 放行 vs 不调用 next() 短路
//   - 理解监听器按注册顺序执行
//
// 运行方式：node run.mjs 05
// 预期输出：
//   HELLO
//   ** BLOCKED **
// ============================================================

import type { Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Events {
    'demo/transform'(input: string, next: () => Promise<string>): Promise<string>
  }
}

export const name = 'waterfall-demo'

export function apply(ctx: Context) {
  // 监听器 1：包装下游结果（around advice）
  ctx.on('demo/transform', async (input, next) => {
    const downstream = await next()
    return downstream.toUpperCase()
  })

  // 监听器 2：拥有决策权时短路
  ctx.on('demo/transform', async (input, next) => {
    if (input.includes('blocked')) return '** blocked **'
    return next()
  })

  // 触发两次 waterfall
  void (async () => {
    // 第 1 次：两个监听器都放行，最终结果被 toUpperCase 转换
    console.log(await ctx.waterfall('demo/transform', 'hello', async () => 'hello'))
    // 第 2 次：监听器 2 短路，最内层默认逻辑不会执行
    console.log(await ctx.waterfall('demo/transform', 'blocked words', async () => 'blocked words'))
    process.exit(0)
  })()
}
