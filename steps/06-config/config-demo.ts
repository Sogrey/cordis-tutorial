// ============================================================
// 步骤 6：配置验证
// ============================================================
// 学习目标：
//   - 理解 Schema 声明配置验证
//   - 理解 apply(ctx, config) 接收经过验证的配置
//   - 理解默认值自动补齐
//
// 运行方式：node run.mjs 06
// 预期输出：
//   Hello, alpha!
//   Hello, beta!
//
// 尝试修改 cordis.yml 中的 config，观察输出变化。
// 传入无效配置（如 targets: 'not-an-array'）会触发 ValidationError。
// ============================================================

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export const name = 'config-demo'

// TypeScript 接口：消费方获得类型
export interface Config {
  greeting: string
  targets: string[]
}

// 运行时 schema：Cordis 获得验证器
export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  targets: Schema.array(String).default(['world']),
})

export function apply(ctx: Context, config: Config) {
  for (const target of config.targets) {
    console.log(`${config.greeting}, ${target}!`)
  }
}
