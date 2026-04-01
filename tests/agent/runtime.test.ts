import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it, vi } from 'vitest'

import { createAgentRuntime } from '../../src/agent/runtime'
import { loadSessionIndex, getSessionDir } from '../../src/session/index'
import { loadTranscript } from '../../src/session/store'
import type { ChatProvider } from '../../src/provider/types'
import { createToolRegistry } from '../../src/tools/registry'

let workspaceRoot: string | undefined

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }
})

it('runs tool loop until the provider returns final text', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-runtime-'))
  await writeFile(join(workspaceRoot, 'README.md'), '# Claudette\n', 'utf8')

  const complete = vi.fn()
  const provider: ChatProvider = {
    complete,
  }
  const session = { currentSessionId: null as string | null }
  const runtime = createAgentRuntime({
    workspaceRoot,
    config: {
      apiBaseUrl: 'https://example.com/v1',
      model: 'gpt-4.1-mini',
    },
    session,
    provider,
    tools: createToolRegistry(),
    createSessionId: () => 'session-1',
    now: () => new Date('2026-04-01T00:00:00.000Z'),
  })

  complete
    .mockResolvedValueOnce({
      type: 'tool_calls',
      message: {
        role: 'assistant',
        content: 'I will inspect the README first.',
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
    .mockResolvedValueOnce({
      type: 'final',
      message: {
        role: 'assistant',
        content: 'This repository contains the Claudette mini CLI project.',
      },
    })

  const result = await runtime.respond('Summarize this repo')

  expect(result.finalMessage).toEqual({
    role: 'assistant',
    content: 'This repository contains the Claudette mini CLI project.',
  })
  expect(result.toolCalls).toEqual([
    {
      id: 'call_1',
      name: 'read',
      input: { filePath: 'README.md' },
    },
  ])
  expect(session.currentSessionId).toBe('session-1')
  expect(complete).toHaveBeenCalledTimes(2)

  const transcript = await loadTranscript(getSessionDir(workspaceRoot, 'session-1'))

  expect(transcript[0]).toEqual({
    role: 'user',
    content: 'Summarize this repo',
  })
  expect(transcript[1]).toEqual({
    role: 'assistant',
    content: 'I will inspect the README first.',
    toolCalls: [
      {
        id: 'call_1',
        name: 'read',
        input: { filePath: 'README.md' },
      },
    ],
  })
  expect(transcript[2]).toMatchObject({
    role: 'tool',
    toolCallId: 'call_1',
    toolName: 'read',
  })
  expect(JSON.parse(transcript[2].content)).toMatchObject({
    filePath: 'README.md',
    content: '# Claudette\n',
    totalLines: 1,
  })
  expect(transcript[3]).toEqual({
    role: 'assistant',
    content: 'This repository contains the Claudette mini CLI project.',
  })

  const index = await loadSessionIndex(workspaceRoot)

  expect(index).toEqual([
    {
      id: 'session-1',
      title: 'Summarize this repo',
      model: 'gpt-4.1-mini',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    },
  ])
})

it('stops the turn and records a structured error when a tool is unknown', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-runtime-'))

  const complete = vi.fn().mockResolvedValue({
    type: 'tool_calls',
    message: {
      role: 'assistant',
      content: 'I will call a missing tool.',
      toolCalls: [
        {
          id: 'call_1',
          name: 'missing_tool',
          input: {},
        },
      ],
    },
    toolCalls: [
      {
        id: 'call_1',
        name: 'missing_tool',
        input: {},
      },
    ],
  })
  const provider: ChatProvider = {
    complete,
  }
  const runtime = createAgentRuntime({
    workspaceRoot,
    config: {
      apiBaseUrl: 'https://example.com/v1',
      model: 'gpt-4.1-mini',
    },
    session: { currentSessionId: null },
    provider,
    tools: createToolRegistry(),
    createSessionId: () => 'session-1',
    now: () => new Date('2026-04-01T00:00:00.000Z'),
  })

  const result = await runtime.respond('Use a missing tool')

  expect(result.finalMessage).toEqual({
    role: 'system',
    content: 'Unknown tool: missing_tool',
  })
  expect(complete).toHaveBeenCalledTimes(1)

  const transcript = await loadTranscript(getSessionDir(workspaceRoot, 'session-1'))

  expect(transcript[2]).toEqual({
    role: 'tool',
    content: 'Unknown tool: missing_tool',
    toolCallId: 'call_1',
    toolName: 'missing_tool',
    isError: true,
  })
  expect(transcript[3]).toEqual({
    role: 'system',
    content: 'Unknown tool: missing_tool',
  })
})

it('throws when tool loop iterations exceed the configured maximum', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-runtime-'))
  await writeFile(join(workspaceRoot, 'README.md'), '# Claudette\n', 'utf8')

  const complete = vi
    .fn()
    .mockResolvedValue({
      type: 'tool_calls',
      message: {
        role: 'assistant',
        content: 'Still working.',
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
  const provider: ChatProvider = {
    complete,
  }
  const runtime = createAgentRuntime({
    workspaceRoot,
    config: {
      apiBaseUrl: 'https://example.com/v1',
      model: 'gpt-4.1-mini',
    },
    session: { currentSessionId: null },
    provider,
    tools: createToolRegistry(),
    createSessionId: () => 'session-1',
    maxToolIterations: 1,
    now: () => new Date('2026-04-01T00:00:00.000Z'),
  })

  await expect(runtime.respond('Loop forever')).rejects.toThrow(
    'Tool loop exceeded the configured maximum of 1 iterations',
  )
})
