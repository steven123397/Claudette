import type { ToolCall, ToolContext, ToolRegistry } from './types'

export async function dispatchToolCall(
  registry: ToolRegistry,
  call: ToolCall,
  context: ToolContext,
): Promise<unknown> {
  const tool = registry.get(call.name)

  if (!tool) {
    throw new Error(`Unknown tool: ${call.name}`)
  }

  const input = tool.validate(call.input)

  return tool.execute(input, context)
}
