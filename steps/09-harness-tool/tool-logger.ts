// ---------- tool-logger.ts：通过事件观察工具执行 ----------

import type { Context } from '@deepseek-ai/cordis'
import type {} from './greet-tool.ts'

export const name = 'tool-logger'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.on('tools/result', (exec, result) => {
    const text = result.content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('')
    console.log(`[tool-logger] ${exec.name} -> ${text}`)
  })
}
