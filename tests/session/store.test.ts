import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it } from 'vitest'

import { getSessionDir, loadSessionIndex, upsertSessionIndexEntry } from '../../src/session/index'
import { appendTranscript, loadTranscript } from '../../src/session/store'

let workspaceRoot: string | undefined

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }
})

it('appends and reloads transcript lines in order', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-workspace-'))
  const sessionDir = getSessionDir(workspaceRoot, 'session-1')

  await appendTranscript(sessionDir, [{ role: 'user', content: 'hi' }])
  await appendTranscript(sessionDir, [{ role: 'assistant', content: 'hello' }])

  const transcript = await loadTranscript(sessionDir)

  expect(transcript).toEqual([
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
  ])
})

it('persists session index entries by id', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-workspace-'))
  const createdAt = new Date('2026-04-01T00:00:00.000Z').toISOString()
  const updatedAt = new Date('2026-04-01T00:01:00.000Z').toISOString()

  await upsertSessionIndexEntry(workspaceRoot, {
    id: 'session-1',
    title: 'Demo session',
    model: 'gpt-4.1-mini',
    createdAt,
    updatedAt,
  })

  const index = await loadSessionIndex(workspaceRoot)

  expect(index).toEqual([
    {
      id: 'session-1',
      title: 'Demo session',
      model: 'gpt-4.1-mini',
      createdAt,
      updatedAt,
    },
  ])
})
