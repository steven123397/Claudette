import { expect, it } from 'vitest'

import { createToolRegistry } from '../../../src/tools/registry'
import {
  mapMessagesToOpenAI,
  mapToolsToOpenAI,
} from '../../../src/provider/openaiCompatible/messageMapper'
import type { ProviderMessage } from '../../../src/provider/types'

it('maps internal tool definitions to OpenAI tool schema', () => {
  const tools = mapToolsToOpenAI(createToolRegistry().list())
  const readTool = tools.find(tool => tool.function.name === 'read')

  expect(readTool).toEqual({
    type: 'function',
    function: {
      name: 'read',
      description: 'Read a text file from the workspace',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Workspace-relative file path to read',
          },
          startLine: {
            type: 'number',
            description: 'Inclusive starting line number',
          },
          endLine: {
            type: 'number',
            description: 'Inclusive ending line number',
          },
        },
        required: ['filePath'],
        additionalProperties: false,
      },
    },
  })
})

it('maps assistant tool calls and tool results to OpenAI messages', () => {
  const messages: ProviderMessage[] = [
    { role: 'system', content: 'You are Claudette.' },
    { role: 'user', content: 'Read README.md' },
    {
      role: 'assistant',
      content: 'I will inspect the file.',
      toolCalls: [
        {
          id: 'call_1',
          name: 'read',
          input: { filePath: 'README.md' },
        },
      ],
    },
    {
      role: 'tool',
      content: '# Claudette',
      toolCallId: 'call_1',
      toolName: 'read',
    },
  ]

  expect(mapMessagesToOpenAI(messages)).toEqual([
    { role: 'system', content: 'You are Claudette.' },
    { role: 'user', content: 'Read README.md' },
    {
      role: 'assistant',
      content: 'I will inspect the file.',
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
    {
      role: 'tool',
      content: '# Claudette',
      tool_call_id: 'call_1',
    },
  ])
})
