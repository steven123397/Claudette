import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it } from 'vitest'

import { getSessionDir, getTranscriptPath } from '../../src/session/index'
import { resumeTranscript } from '../../src/session/resume'

let workspaceRoot: string | undefined

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }
})

it('drops malformed and invalid transcript lines while resuming', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-workspace-'))
  const sessionDir = getSessionDir(workspaceRoot, 'session-1')
  const transcriptPath = getTranscriptPath(sessionDir)

  await mkdir(sessionDir, { recursive: true })
  await writeFile(
    transcriptPath,
    [
      JSON.stringify({ role: 'user', content: 'hi' }),
      '{"role":"assistant"',
      JSON.stringify({ role: 'assistant', content: 'hello' }),
      JSON.stringify({ role: 'tool', content: 42 }),
    ].join('\n'),
    'utf8',
  )

  const transcript = await resumeTranscript(sessionDir)

  expect(transcript).toEqual([
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
  ])
})
