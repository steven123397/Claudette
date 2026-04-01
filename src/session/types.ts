export const TRANSCRIPT_ROLES = ['system', 'user', 'assistant', 'tool'] as const

export type TranscriptRole = (typeof TRANSCRIPT_ROLES)[number]

export type TranscriptToolCall = {
  id: string
  name: string
  input: unknown
}

export type TranscriptSystemMessage = {
  role: 'system'
  content: string
}

export type TranscriptUserMessage = {
  role: 'user'
  content: string
}

export type TranscriptAssistantMessage = {
  role: 'assistant'
  content: string
  toolCalls?: TranscriptToolCall[]
}

export type TranscriptToolMessage = {
  role: 'tool'
  content: string
  toolCallId?: string
  toolName?: string
  isError?: boolean
}

export type TranscriptMessage =
  | TranscriptSystemMessage
  | TranscriptUserMessage
  | TranscriptAssistantMessage
  | TranscriptToolMessage

export type SessionIndexEntry = {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
}

export function isTranscriptMessage(value: unknown): value is TranscriptMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const message = value as Partial<TranscriptMessage>

  if (
    typeof message.role !== 'string' ||
    !TRANSCRIPT_ROLES.includes(message.role as TranscriptRole) ||
    typeof message.content !== 'string'
  ) {
    return false
  }

  if (message.role === 'assistant') {
    const toolCalls = (message as Partial<TranscriptAssistantMessage>).toolCalls

    if (toolCalls === undefined) {
      return true
    }

    return Array.isArray(toolCalls) && toolCalls.every(isTranscriptToolCall)
  }

  if (message.role === 'tool') {
    const toolMessage = message as Partial<TranscriptToolMessage>

    return (
      (toolMessage.toolCallId === undefined || typeof toolMessage.toolCallId === 'string') &&
      (toolMessage.toolName === undefined || typeof toolMessage.toolName === 'string') &&
      (toolMessage.isError === undefined || typeof toolMessage.isError === 'boolean')
    )
  }

  return true
}

export function isSessionIndexEntry(value: unknown): value is SessionIndexEntry {
  if (!value || typeof value !== 'object') {
    return false
  }

  const entry = value as Partial<SessionIndexEntry>

  return (
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.model === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.updatedAt === 'string'
  )
}

function isTranscriptToolCall(value: unknown): value is TranscriptToolCall {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const toolCall = value as Partial<TranscriptToolCall>

  return (
    typeof toolCall.id === 'string' &&
    typeof toolCall.name === 'string' &&
    'input' in toolCall
  )
}
