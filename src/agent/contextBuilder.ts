import type { ProviderMessage, ProviderTurnInput } from '../provider/types'
import type {
  TranscriptAssistantMessage,
  TranscriptMessage,
  TranscriptToolMessage,
  TranscriptUserMessage,
} from '../session/types'
import type { ToolRegistry } from '../tools/types'

const DEFAULT_SYSTEM_PROMPT =
  'You are Claudette, a teaching-oriented coding assistant working inside the current workspace.'

export type BuildTurnContextOptions = {
  history: readonly TranscriptMessage[]
  toolRegistry: ToolRegistry
  userInput: string
}

export type BuiltTurnContext = {
  providerInput: ProviderTurnInput
  userMessage: TranscriptUserMessage
}

export function buildTurnContext(options: BuildTurnContextOptions): BuiltTurnContext {
  const userMessage: TranscriptUserMessage = {
    role: 'user',
    content: options.userInput,
  }
  const providerMessages: ProviderMessage[] = [
    {
      role: 'system',
      content: DEFAULT_SYSTEM_PROMPT,
    },
  ]

  for (const message of options.history) {
    const mappedMessage = mapTranscriptMessageToProvider(message)

    if (mappedMessage) {
      providerMessages.push(mappedMessage)
    }
  }

  providerMessages.push(userMessage)

  return {
    providerInput: {
      messages: providerMessages,
      tools: options.toolRegistry.list(),
    },
    userMessage,
  }
}

function mapTranscriptMessageToProvider(
  message: TranscriptMessage,
): ProviderMessage | null {
  switch (message.role) {
    case 'system':
    case 'user':
      return {
        role: message.role,
        content: message.content,
      }
    case 'assistant':
      return mapAssistantMessage(message)
    case 'tool':
      return mapToolMessage(message)
  }
}

function mapAssistantMessage(
  message: TranscriptAssistantMessage,
): ProviderMessage {
  return {
    role: 'assistant',
    content: message.content,
    ...(message.toolCalls && message.toolCalls.length > 0
      ? { toolCalls: message.toolCalls }
      : {}),
  }
}

function mapToolMessage(
  message: TranscriptToolMessage,
): ProviderMessage | null {
  if (!message.toolCallId || !message.toolName) {
    return null
  }

  return {
    role: 'tool',
    content: message.content,
    toolCallId: message.toolCallId,
    toolName: message.toolName,
  }
}
