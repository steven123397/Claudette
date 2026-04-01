import type { ChatProvider, ProviderTurnInput, ProviderTurnResult } from '../types'
import {
  mapAssistantMessageFromOpenAI,
  mapMessagesToOpenAI,
  mapToolsToOpenAI,
  type OpenAICompatibleAssistantResponseMessage,
} from './messageMapper'

type FetchLike = typeof fetch

type OpenAICompatibleProviderOptions = {
  apiKey?: string
  baseUrl: string
  fetch?: FetchLike
  getModel: () => string
}

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: OpenAICompatibleAssistantResponseMessage
  }>
  error?: {
    message?: string
  }
}

export function createOpenAICompatibleProvider(
  options: OpenAICompatibleProviderOptions,
): ChatProvider {
  const fetchImplementation = options.fetch ?? globalThis.fetch?.bind(globalThis)

  if (!fetchImplementation) {
    throw new Error('Fetch API is not available in the current runtime')
  }

  return {
    async complete(input: ProviderTurnInput): Promise<ProviderTurnResult> {
      const response = await fetchImplementation(buildCompletionsUrl(options.baseUrl), {
        method: 'POST',
        headers: buildHeaders(options.apiKey),
        body: JSON.stringify({
          model: options.getModel(),
          messages: mapMessagesToOpenAI(input.messages),
          ...(input.tools && input.tools.length > 0
            ? { tools: mapToolsToOpenAI(input.tools) }
            : {}),
        }),
      })
      const payload = await parseResponse(response)
      const message = payload.choices?.[0]?.message

      if (!message) {
        throw new Error('OpenAI-compatible response did not include a message')
      }

      const assistantMessage = mapAssistantMessageFromOpenAI(message)

      const toolCalls = assistantMessage.toolCalls

      if (toolCalls && toolCalls.length > 0) {
        return {
          type: 'tool_calls',
          message: {
            ...assistantMessage,
            toolCalls,
          },
          toolCalls,
        }
      }

      return {
        type: 'final',
        message: assistantMessage,
      }
    },
  }
}

function buildHeaders(apiKey?: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  }
}

function buildCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`
}

async function parseResponse(response: Response): Promise<OpenAICompatibleResponse> {
  const rawBody = await response.text()
  const payload = rawBody === '' ? {} : safeJsonParse(rawBody)

  if (!response.ok) {
    const errorMessage = extractErrorMessage(payload) ?? response.statusText
    throw new Error(
      `OpenAI-compatible request failed with ${response.status}: ${errorMessage}`,
    )
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('OpenAI-compatible response must be a JSON object')
  }

  return payload as OpenAICompatibleResponse
}

function safeJsonParse(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to parse provider response JSON: ${detail}`)
  }
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  const candidate = payload as OpenAICompatibleResponse
  return candidate.error?.message
}
