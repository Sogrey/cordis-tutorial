// ============================================================
// 步骤 2：生命周期与 Effect
// ============================================================
// 学习目标：
//   - 理解 ctx.effect() 的注册即 disposer 模式
//   - 理解 fiber.dispose() 递归卸载子插件
//   - 理解 Fiber 状态机：PENDING -> LOADING -> ACTIVE -> DISPOSED
//
// 运行方式：node run.mjs 02
// 预期输出：
//   heartbeat plugin loading
//   tick
//   tick
//   tick
//   heartbeat cleaned up
//   disposed
// ============================================================

import type { Context } from '@deepseek-ai/cordis'

export const name = 'lifecycle-demo'

function heartbeat(ctx: Context) {
  console.log('heartbeat plugin loading')
  ctx.effect(() => {
    const timer = setInterval(() => console.log('tick'), 200)
    return () => {
      clearInterval(timer)
      console.log('heartbeat cleaned up')
    }
  })
}

export function apply(ctx: Context) {
  // 从代码挂载子插件（而非通过 YAML）
  const fiber = ctx.plugin(heartbeat)

  // 700ms 后手动卸载子插件
  ctx.effect(() => {
    const timer = setTimeout(async () => {
      await fiber.dispose()
      console.log('disposed')
      process.exit(0)
    }, 700)
    return () => clearTimeout(timer)
  })
}
