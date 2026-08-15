// ---------- mock-tools.ts：简化的 Tools Service mock ----------
// 在没有 Harness 环境时，提供一个最小化的 tools 服务
// 让步骤 9 可以独立运行

import { Service, type Context } from '@deepseek-ai/cordis'

class MockToolsService extends Service {
  private tools = new Map<string, any>()

  constructor(ctx: Context) {
    super(ctx, 'tools')
  }

  register(tool: any): () => void {
    this.tools.set(tool.name, tool)
    return () => {
      this.tools.delete(tool.name)
    }
  }

  async execute(call: any): Promise<any> {
    const tool = this.tools.get(call.name)
    if (!tool) throw new Error(`Tool not found: ${call.name}`)
    const value = await tool.execute(call.arguments)
    const content = tool.output.render(call.arguments, value)
    const result = { content }
    // 发出 tools/result 事件
    this.ctx.emit('tools/result', call, result)
    return result
  }
}

export const name = 'mock-tools'

export function apply(ctx: Context) {
  ctx.plugin(MockToolsService)
}
