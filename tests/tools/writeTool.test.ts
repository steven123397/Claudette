import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it } from 'vitest'

import { dispatchToolCall } from '../../src/tools/dispatcher'
import { createToolRegistry } from '../../src/tools/registry'
import type { ToolContext } from '../../src/tools/types'

let workspaceRoot: string | undefined

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }
})

function createContext(): ToolContext {
  if (!workspaceRoot) {
    throw new Error('workspaceRoot is not initialized')
  }

  return { workspaceRoot }
}

it('writes content inside workspace only', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))

  const result = await dispatchToolCall(createToolRegistry(), {
    name: 'write',
    input: { filePath: 'notes.txt', content: 'hello' },
  }, createContext())

  expect(await readFile(join(workspaceRoot, 'notes.txt'), 'utf8')).toBe('hello')
  expect(result).toEqual({
    filePath: 'notes.txt',
    bytesWritten: 5,
    created: true,
    summary: 'Wrote notes.txt (5 bytes, created)',
  })
})

it('overwrites an existing file by default', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
  await writeFile(join(workspaceRoot, 'notes.txt'), 'old', 'utf8')

  const result = await dispatchToolCall(createToolRegistry(), {
    name: 'write',
    input: { filePath: 'notes.txt', content: 'hello' },
  }, createContext())

  expect(await readFile(join(workspaceRoot, 'notes.txt'), 'utf8')).toBe('hello')
  expect(result).toEqual({
    filePath: 'notes.txt',
    bytesWritten: 5,
    created: false,
    summary: 'Wrote notes.txt (5 bytes, updated)',
  })
})

it('rejects writes outside workspace', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))

  await expect(dispatchToolCall(createToolRegistry(), {
    name: 'write',
    input: { filePath: '../secret.txt', content: 'nope' },
  }, createContext())).rejects.toThrow(/outside workspace/i)
})
