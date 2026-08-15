// ============================================================
// 步骤 3：服务与依赖
// ============================================================
// 学习目标：
//   - 理解 Service 子类如何提供具名能力
//   - 理解 inject 声明服务依赖
//   - 理解声明合并让 ctx.<key> 类型安全
//   - 理解加载顺序由依赖关系决定，而非文件顺序
//
// 运行方式：node run.mjs 03
// 预期输出：Hello, world!
// ============================================================

// ---------- greeter.ts：提供服务方 ----------

import { Service, type Context } from '@deepseek-ai/cordis'

// 声明合并：让 ctx.greeter 在类型层面可见
declare module '@deepseek-ai/cordis' {
  interface Context {
    greeter: GreeterService
  }
}

export class GreeterService extends Service {
  constructor(ctx: Context) {
    // 以名称 'greeter' 注册
    super(ctx, 'greeter')
  }

  greet(who: string) {
    return `Hello, ${who}!`
  }
}

export const name = 'greeter'

export function apply(ctx: Context) {
  // Service 子类本身就是插件
  ctx.plugin(GreeterService)
}
