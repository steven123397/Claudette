import type { AnyToolDefinition } from '../tools/types'

export type ProviderToolCall = {
  id: string
  name: string
  input: unknown
}

export type ProviderSystemMessage = {
  role: 'system'
  content: string
}

export type ProviderUserMessage = {
  role: 'user'
  content: string
}

export type ProviderAssistantMessage = {
  role: 'assistant'
  content: string
  toolCalls?: ProviderToolCall[]
}

export type ProviderToolMessage = {
  role: 'tool'
  content: string
  toolCallId: string
  toolName: string
}

export type ProviderMessage =
  | ProviderSystemMessage
  | ProviderUserMessage
  | ProviderAssistantMessage
  | ProviderToolMessage

export type ProviderTurnInput = {
  messages: readonly ProviderMessage[]
  tools?: readonly AnyToolDefinition[]
}

export type ProviderFinalResult = {
  type: 'final'
  message: ProviderAssistantMessage
}

export type ProviderToolCallResult = {
  type: 'tool_calls'
  message: ProviderAssistantMessage & { toolCalls: ProviderToolCall[] }
  toolCalls: ProviderToolCall[]
}

export type ProviderTurnResult = ProviderFinalResult | ProviderToolCallResult

export type ChatProvider = {
  complete(input: ProviderTurnInput): Promise<ProviderTurnResult>
}
