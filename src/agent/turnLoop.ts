import type { ChatProvider, ProviderMessage } from '../provider/types'
import type { ToolRegistry } from '../tools/types'
import { runToolLoop, type ToolLoopResult } from './toolLoop'

export type TurnLoopOptions = {
  maxToolIterations: number
  messages: readonly ProviderMessage[]
  provider: ChatProvider
  toolRegistry: ToolRegistry
  workspaceRoot: string
}

export async function runTurnLoop(options: TurnLoopOptions): Promise<ToolLoopResult> {
  const initialResult = await options.provider.complete({
    messages: options.messages,
    tools: options.toolRegistry.list(),
  })

  return runToolLoop({
    initialMessages: options.messages,
    initialResult,
    maxToolIterations: options.maxToolIterations,
    provider: options.provider,
    toolRegistry: options.toolRegistry,
    workspaceRoot: options.workspaceRoot,
  })
}
