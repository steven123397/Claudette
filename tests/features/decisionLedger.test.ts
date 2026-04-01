import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it } from 'vitest'

import { createCommandRegistry } from '../../src/commands/registry'
import type {
  CommandContext,
  CommandResult,
  SystemCommandResult,
} from '../../src/commands/types'
import { createDecisionLedgerStore } from '../../src/features/decisionLedger/store'
import { createToolRegistry } from '../../src/tools/registry'

let workspaceRoot: string | undefined

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }
})

function createContext(): CommandContext {
  if (!workspaceRoot) {
    throw new Error('workspaceRoot is not initialized')
  }

  return {
    workspaceRoot,
    config: {
      apiBaseUrl: 'https://example.com/v1',
      model: 'gpt-4.1-mini',
    },
    tools: createToolRegistry(),
    currentSessionId: 'session-1',
  }
}

function expectSystemResult(result: CommandResult): SystemCommandResult {
  expect(result.type).toBe('system')

  if (result.type !== 'system') {
    throw new Error('Expected a system command result')
  }

  return result
}

it('appends decisions and lists them in chronological order', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-decision-'))
  let callCount = 0
  const timestamps = [
    '2026-04-01T00:00:00.000Z',
    '2026-04-01T00:01:00.000Z',
  ]
  const decisionStore = createDecisionLedgerStore(workspaceRoot, {
    now: () => new Date(timestamps[callCount++]),
  })

  await decisionStore.append({
    summary: 'Use Vitest',
    rationale: 'Lightweight',
    sessionId: 'session-1',
  })
  await decisionStore.append({
    summary: 'Keep REPL line-based',
    rationale: 'Teaching-first',
    sessionId: null,
  })

  const items = await decisionStore.list()

  expect(items).toEqual([
    {
      summary: 'Use Vitest',
      rationale: 'Lightweight',
      timestamp: '2026-04-01T00:00:00.000Z',
      sessionId: 'session-1',
    },
    {
      summary: 'Keep REPL line-based',
      rationale: 'Teaching-first',
      timestamp: '2026-04-01T00:01:00.000Z',
      sessionId: null,
    },
  ])
})

it('supports /decision add and /decision list', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-decision-'))
  const registry = createCommandRegistry()

  const addResult = expectSystemResult(
    await registry.execute(
      '/decision add Use Vitest --because Lightweight and fast',
      createContext(),
    ),
  )
  const listResult = expectSystemResult(
    await registry.execute('/decision list', createContext()),
  )

  expect(addResult.content).toContain('Recorded decision')
  expect(addResult.content).toContain('Use Vitest')
  expect(listResult.content).toContain('Use Vitest')
  expect(listResult.content).toContain('Lightweight and fast')
  expect(listResult.content).toContain('session-1')
})
