// ---------- diagnose.ts：诊断 PENDING 状态的插件 ----------
// 列出所有 PENDING 的 fiber（所需服务尚未就绪的插件）

import type { Context } from '@deepseek-ai/cordis'

// FiberState 是 const enum，编译时会被内联为数字，运行时不存在该对象
// PENDING=0, LOADING=1, ACTIVE=2, FAILED=3, DISPOSED=4, UNLOADING=5
const FIBER_PENDING = 0

export const name = 'diagnose'

export function apply(ctx: Context) {
  setTimeout(() => {
    let found = false
    for (const runtime of ctx.registry.values()) {
      for (const fiber of runtime.fibers) {
        if (fiber.state === FIBER_PENDING) {
          console.log(`${fiber.name} is PENDING — a required service is missing`)
          found = true
        }
      }
    }
    if (!found) {
      console.log('[diagnose] all plugins are active')
    }
  }, 500)
}
