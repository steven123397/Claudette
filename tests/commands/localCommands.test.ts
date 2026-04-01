import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it } from 'vitest'

import { createCommandRegistry } from '../../src/commands/registry'
import type { CommandContext, CommandResult, SystemCommandResult } from '../../src/commands/types'
import { getSessionDir, upsertSessionIndexEntry } from '../../src/session/index'
import { appendTranscript } from '../../src/session/store'
import { createToolRegistry } from '../../src/tools/registry'

let workspaceRoot: string | undefined
let currentSessionId: string | null = null

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }

  currentSessionId = null
})

function createContext(): CommandContext {
  if (!workspaceRoot) {
    throw new Error('workspaceRoot is not initialized')
  }

  return {
    workspaceRoot,
    config: {
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1-mini',
    },
    tools: createToolRegistry(),
    currentSessionId,
    setCurrentSessionId(sessionId) {
      currentSessionId = sessionId
    },
  }
}

function expectSystemResult(result: CommandResult): SystemCommandResult {
  expect(result.type).toBe('system')

  if (result.type !== 'system') {
    throw new Error('Expected a system command result')
  }

  return result
}

it('returns help text for /help', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-commands-'))
  const registry = createCommandRegistry()

  const result = expectSystemResult(
    await registry.execute('/help', createContext()),
  )

  expect(result.content).toContain('/session')
})

it('returns a clear action for /clear', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-commands-'))
  const registry = createCommandRegistry()

  const result = await registry.execute('/clear', createContext())

  expect(result).toEqual({
    type: 'system',
    content: 'Cleared current REPL view.',
    action: { type: 'clear' },
  })
})

it('returns an exit action for /exit', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-commands-'))
  const registry = createCommandRegistry()

  const result = await registry.execute('/exit', createContext())

  expect(result).toEqual({
    type: 'system',
    content: 'Exiting Claudette.',
    action: { type: 'exit' },
  })
})

it('lists saved sessions for /session list', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-commands-'))
  const registry = createCommandRegistry()

  await upsertSessionIndexEntry(workspaceRoot, {
    id: 'session-1',
    title: 'Demo session',
    model: 'gpt-4.1-mini',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:01:00.000Z',
  })

  const result = await registry.execute('/session list', createContext())
  const systemResult = expectSystemResult(result)

  expect(systemResult.content).toContain('session-1')
  expect(systemResult.content).toContain('Demo session')
})

it('loads transcript state for /session resume <id>', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-commands-'))
  const registry = createCommandRegistry()

  await upsertSessionIndexEntry(workspaceRoot, {
    id: 'session-1',
    title: 'Demo session',
    model: 'gpt-4.1-mini',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:01:00.000Z',
  })
  await appendTranscript(getSessionDir(workspaceRoot, 'session-1'), [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
  ])

  const result = await registry.execute('/session resume session-1', createContext())

  expect(currentSessionId).toBe('session-1')
  expect(result).toEqual({
    type: 'system',
    content: 'Resumed session session-1.',
    action: {
      type: 'resume',
      sessionId: 'session-1',
      transcript: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
    },
  })
})

it('supports reading and switching the default model via /model', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-commands-'))
  const registry = createCommandRegistry()
  const context = createContext()

  const current = expectSystemResult(await registry.execute('/model', context))
  const switched = expectSystemResult(
    await registry.execute('/model gpt-4.1', context),
  )

  expect(current.content).toContain('gpt-4.1-mini')
  expect(context.config.model).toBe('gpt-4.1')
  expect(switched).toEqual({
    type: 'system',
    content: 'Default model set to gpt-4.1.',
  })
})

it('lists enabled tools for /tools', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-commands-'))
  const registry = createCommandRegistry()

  const result = expectSystemResult(
    await registry.execute('/tools', createContext()),
  )

  expect(result.content).toContain('read')
  expect(result.content).toContain('patch')
})
