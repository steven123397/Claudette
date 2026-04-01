import { expect, it, vi } from 'vitest'

import { createOpenAICompatibleProvider } from '../../../src/provider/openaiCompatible/client'
import { createToolRegistry } from '../../../src/tools/registry'

it('returns assistant text when provider responds without tool calls', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello from Claudette.',
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    ),
  )
  const provider = createOpenAICompatibleProvider({
    apiKey: 'test-key',
    baseUrl: 'https://example.com/v1',
    fetch: fetchMock,
    getModel: () => 'gpt-4.1-mini',
  })

  const result = await provider.complete({
    messages: [{ role: 'user', content: 'Hello' }],
  })

  expect(result).toEqual({
    type: 'final',
    message: {
      role: 'assistant',
      content: 'Hello from Claudette.',
    },
  })

  expect(fetchMock).toHaveBeenCalledTimes(1)

  const [url, init] = fetchMock.mock.calls[0]
  const body = JSON.parse(String(init?.body))

  expect(url).toBe('https://example.com/v1/chat/completions')
  expect(init).toMatchObject({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-key',
    },
  })
  expect(body).toMatchObject({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: 'Hello' }],
  })
})

it('returns structured tool calls when provider responds with function calls', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Let me inspect that file.',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'read',
                    arguments: '{"filePath":"README.md"}',
                  },
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    ),
  )
  const provider = createOpenAICompatibleProvider({
    apiKey: 'test-key',
    baseUrl: 'https://example.com/v1',
    fetch: fetchMock,
    getModel: () => 'gpt-4.1-mini',
  })

  const result = await provider.complete({
    messages: [{ role: 'user', content: 'Read README.md' }],
    tools: createToolRegistry().list(),
  })

  expect(result).toEqual({
    type: 'tool_calls',
    message: {
      role: 'assistant',
      content: 'Let me inspect that file.',
      toolCalls: [
        {
          id: 'call_1',
          name: 'read',
          input: { filePath: 'README.md' },
        },
      ],
    },
    toolCalls: [
      {
        id: 'call_1',
        name: 'read',
        input: { filePath: 'README.md' },
      },
    ],
  })

  const [, init] = fetchMock.mock.calls[0]
  const body = JSON.parse(String(init?.body))

  expect(body.tools).toContainEqual(
    expect.objectContaining({
      type: 'function',
      function: expect.objectContaining({
        name: 'read',
      }),
    }),
  )
})
