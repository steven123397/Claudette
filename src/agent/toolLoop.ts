import type { ChatProvider, ProviderMessage, ProviderToolCall, ProviderTurnResult } from '../provider/types'
import type {
  TranscriptAssistantMessage,
  TranscriptMessage,
  TranscriptSystemMessage,
  TranscriptToolMessage,
} from '../session/types'
import { dispatchToolCall } from '../tools/dispatcher'
import type { ToolRegistry } from '../tools/types'

export type ToolLoopOptions = {
  initialMessages: readonly ProviderMessage[]
  initialResult: ProviderTurnResult
  maxToolIterations: number
  provider: ChatProvider
  toolRegistry: ToolRegistry
  workspaceRoot: string
}

export type ToolLoopResult = {
  finalMessage: TranscriptMessage
  toolCalls: ProviderToolCall[]
  turnMessages: TranscriptMessage[]
}

export async function runToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
  const providerMessages = [...options.initialMessages]
  const turnMessages: TranscriptMessage[] = []
  const toolCalls: ProviderToolCall[] = []
  let result = options.initialResult
  let iteration = 0

  while (true) {
    if (result.type === 'final') {
      const finalMessage: TranscriptAssistantMessage = {
        role: 'assistant',
        content: result.message.content,
      }

      turnMessages.push(finalMessage)

      return {
        finalMessage,
        toolCalls,
        turnMessages,
      }
    }

    if (iteration >= options.maxToolIterations) {
      throw new Error(
        `Tool loop exceeded the configured maximum of ${options.maxToolIterations} iterations`,
      )
    }

    iteration += 1
    toolCalls.push(...result.toolCalls)

    const assistantMessage: TranscriptAssistantMessage = {
      role: 'assistant',
      content: result.message.content,
      toolCalls: result.toolCalls,
    }

    turnMessages.push(assistantMessage)
    providerMessages.push({
      role: 'assistant',
      content: result.message.content,
      toolCalls: result.toolCalls,
    })

    const execution = await executeToolCalls(
      result.toolCalls,
      options.toolRegistry,
      options.workspaceRoot,
    )

    turnMessages.push(...execution.turnMessages)

    if (execution.finalMessage) {
      turnMessages.push(execution.finalMessage)

      return {
        finalMessage: execution.finalMessage,
        toolCalls,
        turnMessages,
      }
    }

    providerMessages.push(...execution.providerMessages)
    result = await options.provider.complete({
      messages: providerMessages,
      tools: options.toolRegistry.list(),
    })
  }
}

async function executeToolCalls(
  toolCalls: readonly ProviderToolCall[],
  toolRegistry: ToolRegistry,
  workspaceRoot: string,
): Promise<{
  finalMessage?: TranscriptSystemMessage
  providerMessages: ProviderMessage[]
  turnMessages: TranscriptToolMessage[]
}> {
  const providerMessages: ProviderMessage[] = []
  const turnMessages: TranscriptToolMessage[] = []

  for (const toolCall of toolCalls) {
    try {
      const result = await dispatchToolCall(
        toolRegistry,
        {
          name: toolCall.name,
          input: toolCall.input,
        },
        { workspaceRoot },
      )
      const content = serializeToolResult(result)
      const toolMessage: TranscriptToolMessage = {
        role: 'tool',
        content,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      }

      turnMessages.push(toolMessage)
      providerMessages.push({
        role: 'tool',
        content,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      })
    } catch (error) {
      const content = error instanceof Error ? error.message : 'Tool execution failed'
      const toolMessage: TranscriptToolMessage = {
        role: 'tool',
        content,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        isError: true,
      }

      turnMessages.push(toolMessage)

      return {
        finalMessage: {
          role: 'system',
          content,
        },
        providerMessages,
        turnMessages,
      }
    }
  }

  return {
    providerMessages,
    turnMessages,
  }
}

function serializeToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result
  }

  if (result === undefined) {
    return ''
  }

  return JSON.stringify(result, null, 2)
}
