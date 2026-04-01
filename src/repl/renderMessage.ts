import type { TranscriptAssistantMessage, TranscriptMessage } from '../session/types'

export function renderMessage(message: TranscriptMessage): string {
  switch (message.role) {
    case 'assistant':
      return renderBlock('assistant', resolveAssistantContent(message))
    case 'system':
      return renderBlock('system', message.content)
    case 'tool':
      return renderBlock(resolveToolLabel(message.toolName, message.isError), message.content)
    case 'user':
      return renderBlock('user', message.content)
  }
}

function resolveAssistantContent(message: TranscriptAssistantMessage): string {
  if (message.content.trim() !== '') {
    return message.content
  }

  if (!message.toolCalls || message.toolCalls.length === 0) {
    return '(empty)'
  }

  return `Calling tools: ${message.toolCalls.map(toolCall => toolCall.name).join(', ')}`
}

function resolveToolLabel(toolName?: string, isError?: boolean): string {
  const baseLabel = toolName ? `tool:${toolName}` : 'tool'

  return isError ? `${baseLabel}:error` : baseLabel
}

function renderBlock(label: string, content: string): string {
  const lines = (content === '' ? '(empty)' : content).split('\n')

  return lines
    .map((line, index) => (index === 0 ? `${label}> ${line}` : `  ${line}`))
    .join('\n')
}
