// ============================================================
// 步骤 9：进入 Harness——注册真实工具
// ============================================================
// 学习目标：
//   - 将前面所有概念综合运用
//   - 理解 tools 服务的 register/execute 模式
//   - 理解 defineTool 的 parameters/output/execute 三件套
//   - 理解通过事件观察工具执行结果
//
// 运行方式：node run.mjs 09
//   使用 mock-tools.ts 提供的简化 Tools 服务
//   无需完整 Harness 环境即可运行
//
// 预期输出：
//   [tool-logger] greet -> Hello, Cordis!
//   tool replied: [{"type":"text","text":"Hello, Cordis!"}]
// ============================================================

// ---------- greet-tool.ts：注册一个工具 ----------

import type { Context } from '@deepseek-ai/cordis'

// 工具定义（简化版，展示模式）
interface ToolCall {
  callId: string
  name: string
  arguments: Record<string, any>
  signal: AbortSignal
}

interface ToolResult {
  content: { type: string; text: string }[]
}

// 简化的工具注册接口
interface ToolsService {
  register(tool: {
    name: string
    description: string
    parameters: Record<string, any>
    output: { schema: any; render: (args: any, value: any) => any[] }
    execute: (args: any) => Promise<any>
  }): () => void
  execute(call: ToolCall): Promise<ToolResult>
}

// 声明合并
declare module '@deepseek-ai/cordis' {
  interface Context {
    tools: ToolsService
  }
  interface Events {
    'tools/result'(exec: ToolCall, result: ToolResult): void
  }
}

export const name = 'greet-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  // 注册工具——返回的 disposer 是 effect，卸载时自动注销
  ctx.tools.register({
    name: 'greet',
    description: 'Greet the named person.',
    parameters: {
      name: { type: 'string', required: true, description: 'Who to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: any, value: any) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  })

  // 驱动一次工具调用（模拟模型行为）
  void (async () => {
    const result = await ctx.tools.execute({
      callId: 'demo-1',
      name: 'greet',
      arguments: { name: 'Cordis' },
      signal: new AbortController().signal,
    })
    console.log('tool replied:', JSON.stringify(result.content))
  })()
}
