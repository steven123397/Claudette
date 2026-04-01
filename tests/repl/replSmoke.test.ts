import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it, vi } from 'vitest'

import { bootstrap } from '../../src/app/bootstrap'
import { getSessionDir, loadSessionIndex } from '../../src/session/index'
import { loadTranscript } from '../../src/session/store'
import type { ChatProvider } from '../../src/provider/types'
import { createCommandRegistry } from '../../src/commands/registry'
import { handleInput, type HandleInputContext } from '../../src/repl/inputQueue'
import { startRepl, type ReplIO } from '../../src/repl/startRepl'
import { createToolRegistry } from '../../src/tools/registry'

let workspaceRoot: string | undefined

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }
})

function createContext(overrides: Partial<HandleInputContext> = {}): HandleInputContext {
  if (!workspaceRoot) {
    throw new Error('workspaceRoot is not initialized')
  }

  return {
    config: {
      apiBaseUrl: 'https://example.com/v1',
      model: 'gpt-4.1-mini',
    },
    commands: createCommandRegistry(),
    tools: createToolRegistry(),
    workspace: {
      root: workspaceRoot,
    },
    session: {
      currentSessionId: null,
    },
    runtime: {
      respond: vi.fn(),
    },
    ...overrides,
  }
}

it('routes slash commands without invoking the runtime', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-repl-'))
  const runtime = {
    respond: vi.fn(),
  }

  const result = await handleInput(
    '/help',
    createContext({
      runtime,
    }),
  )

  expect(result.messages).toHaveLength(1)
  expect(result.messages[0]).toMatchObject({
    role: 'system',
  })
  expect(result.messages[0]?.content).toContain('/session')
  expect(runtime.respond).not.toHaveBeenCalled()
})

it('runs a minimal repl loop and exits on /exit', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-repl-'))
  const runtime = {
    respond: vi.fn().mockResolvedValue({
      sessionId: 'session-1',
      finalMessage: {
        role: 'assistant',
        content: 'Hello from the runtime.',
      },
      toolCalls: [],
      turnMessages: [
        {
          role: 'assistant',
          content: 'Hello from the runtime.',
        },
      ],
    }),
  }
  const writes: string[] = []
  const prompts: string[] = []
  const inputs = ['/tools', 'hello', '/exit']
  const io: ReplIO = {
    async read(prompt) {
      prompts.push(prompt)
      return inputs.shift() ?? null
    },
    write(text) {
      writes.push(text)
    },
    clear() {
      writes.push('<clear>')
    },
    close() {
      writes.push('<closed>')
    },
  }

  await startRepl(
    createContext({
      runtime,
    }),
    { io },
  )

  expect(runtime.respond).toHaveBeenCalledOnce()
  expect(runtime.respond).toHaveBeenCalledWith('hello')
  expect(prompts[0]).toContain('claudette')
  expect(writes.join('\n')).toContain('read')
  expect(writes.join('\n')).toContain('Hello from the runtime.')
  expect(writes.join('\n')).toContain('Exiting Claudette.')
  expect(writes.at(-1)).toBe('<closed>')
})

it('supports one local command turn and one runtime turn through bootstrap', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-repl-'))
  await writeFile(
    join(workspaceRoot, 'package.json'),
    JSON.stringify({
      name: 'demo-repl',
      version: '1.0.0',
    }),
  )

  const provider: ChatProvider = {
    complete: vi
      .fn()
      .mockResolvedValueOnce({
        type: 'tool_calls',
        message: {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: 'tool-1',
              name: 'read',
              input: {
                filePath: 'package.json',
              },
            },
          ],
        },
        toolCalls: [
          {
            id: 'tool-1',
            name: 'read',
            input: {
              filePath: 'package.json',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        type: 'final',
        message: {
          role: 'assistant',
          content: 'Inspected package metadata.',
        },
      }),
  }
  const writes: string[] = []
  const inputs = ['/tools', 'inspect package', '/session list', '/exit']
  const io: ReplIO = {
    async read() {
      return inputs.shift() ?? null
    },
    write(text) {
      writes.push(text)
    },
    clear() {
      writes.push('<clear>')
    },
    close() {
      writes.push('<closed>')
    },
  }

  const container = await bootstrap({
    cwd: workspaceRoot,
    env: {
      CLAUDETTE_MODEL: 'gpt-4.1-mini',
    },
    provider,
    startRepl: app => startRepl(app, { io }),
  })

  expect(provider.complete).toHaveBeenCalledTimes(2)
  expect(writes.join('\n')).toContain('read')
  expect(writes.join('\n')).toContain('Calling tools: read')
  expect(writes.join('\n')).toContain('Inspected package metadata.')
  expect(writes.join('\n')).toContain('Saved sessions:')
  expect(writes.join('\n')).toContain(container.session.currentSessionId ?? '')
  expect(container.session.currentSessionId).not.toBeNull()

  const sessions = await loadSessionIndex(workspaceRoot)

  expect(sessions).toHaveLength(1)
  expect(sessions[0]?.title).toBe('inspect package')

  const transcript = await loadTranscript(
    getSessionDir(workspaceRoot, container.session.currentSessionId ?? ''),
  )
  const toolMessage = transcript.find(
    message =>
      message.role === 'tool' &&
      message.toolCallId === 'tool-1' &&
      message.toolName === 'read',
  )

  expect(toolMessage).toBeDefined()
  expect(toolMessage?.content).toContain('"filePath": "package.json"')
  expect(toolMessage?.content).toContain('demo-repl')
  expect(writes.at(-1)).toBe('<closed>')
})
