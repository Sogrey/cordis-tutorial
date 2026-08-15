// ============================================================
// 步骤 1：第一个插件
// ============================================================
// 学习目标：
//   - 理解 Cordis 插件的基本形态：函数插件
//   - 理解 apply(ctx) 是插件的入口
//   - 理解 cordis.yml 如何组合应用
//
// 运行方式：node run.mjs 01
// 预期输出：hello from my first plugin
// ============================================================

import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello'

export function apply(ctx: Context) {
  console.log('hello from my first plugin')
}
