import type { ToolSchema, AnyToolDefinition } from '../../tools/types'
import type {
  ProviderAssistantMessage,
  ProviderMessage,
  ProviderToolCall,
} from '../types'

export type OpenAICompatibleTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: ToolSchema
  }
}

export type OpenAICompatibleToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export type OpenAICompatibleMessage =
  | {
      role: 'system' | 'user'
      content: string
    }
  | {
      role: 'assistant'
      content: string
      tool_calls?: OpenAICompatibleToolCall[]
    }
  | {
      role: 'tool'
      content: string
      tool_call_id: string
    }

export type OpenAICompatibleAssistantResponseMessage = {
  role: 'assistant'
  content: string | null
  tool_calls?: OpenAICompatibleToolCall[]
}

export function mapToolsToOpenAI(
  tools: readonly AnyToolDefinition[],
): OpenAICompatibleTool[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    },
  }))
}

export function mapMessagesToOpenAI(
  messages: readonly ProviderMessage[],
): OpenAICompatibleMessage[] {
  return messages.map(message => {
    switch (message.role) {
      case 'system':
      case 'user':
        return {
          role: message.role,
          content: message.content,
        }
      case 'assistant':
        return {
          role: 'assistant',
          content: message.content,
          ...(message.toolCalls && message.toolCalls.length > 0
            ? {
                tool_calls: mapToolCallsToOpenAI(message.toolCalls),
              }
            : {}),
        }
      case 'tool':
        return {
          role: 'tool',
          content: message.content,
          tool_call_id: message.toolCallId,
        }
    }
  })
}

export function mapAssistantMessageFromOpenAI(
  message: OpenAICompatibleAssistantResponseMessage,
): ProviderAssistantMessage {
  const toolCalls = mapToolCallsFromOpenAI(message.tool_calls)

  if (toolCalls.length === 0) {
    return {
      role: 'assistant',
      content: message.content ?? '',
    }
  }

  return {
    role: 'assistant',
    content: message.content ?? '',
    toolCalls,
  }
}

function mapToolCallsToOpenAI(
  toolCalls: readonly ProviderToolCall[],
): OpenAICompatibleToolCall[] {
  return toolCalls.map(toolCall => ({
    id: toolCall.id,
    type: 'function',
    function: {
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.input),
    },
  }))
}

function mapToolCallsFromOpenAI(
  toolCalls: readonly OpenAICompatibleToolCall[] | undefined,
): ProviderToolCall[] {
  if (!toolCalls || toolCalls.length === 0) {
    return []
  }

  return toolCalls.map(toolCall => ({
    id: toolCall.id,
    name: toolCall.function.name,
    input: parseToolArguments(toolCall),
  }))
}

function parseToolArguments(toolCall: OpenAICompatibleToolCall): unknown {
  try {
    return JSON.parse(toolCall.function.arguments)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(
      `Failed to parse provider tool arguments for ${toolCall.function.name}: ${detail}`,
    )
  }
}
