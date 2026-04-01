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

it('replaces exact text once by default', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
  await writeFile(join(workspaceRoot, 'a.ts'), 'old old', 'utf8')

  const result = await dispatchToolCall(createToolRegistry(), {
    name: 'patch',
    input: {
      filePath: 'a.ts',
      oldString: 'old',
      newString: 'new',
    },
  }, createContext())

  expect(await readFile(join(workspaceRoot, 'a.ts'), 'utf8')).toBe('new old')
  expect(result).toEqual({
    filePath: 'a.ts',
    replacements: 1,
    bytesWritten: 7,
    summary: 'Patched a.ts (1 replacement)',
  })
})

it('replaces every exact match when replaceAll is true', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
  await writeFile(join(workspaceRoot, 'a.ts'), 'old old', 'utf8')

  const result = await dispatchToolCall(createToolRegistry(), {
    name: 'patch',
    input: {
      filePath: 'a.ts',
      oldString: 'old',
      newString: 'new',
      replaceAll: true,
    },
  }, createContext())

  expect(await readFile(join(workspaceRoot, 'a.ts'), 'utf8')).toBe('new new')
  expect(result).toEqual({
    filePath: 'a.ts',
    replacements: 2,
    bytesWritten: 7,
    summary: 'Patched a.ts (2 replacements)',
  })
})

it('fails when oldString is not found', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
  await writeFile(join(workspaceRoot, 'a.ts'), 'hello', 'utf8')

  await expect(dispatchToolCall(createToolRegistry(), {
    name: 'patch',
    input: {
      filePath: 'a.ts',
      oldString: 'old',
      newString: 'new',
    },
  }, createContext())).rejects.toThrow(/oldString was not found/i)
})

it('rejects patches outside workspace', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))

  await expect(dispatchToolCall(createToolRegistry(), {
    name: 'patch',
    input: {
      filePath: '../a.ts',
      oldString: 'old',
      newString: 'new',
    },
  }, createContext())).rejects.toThrow(/outside workspace/i)
})
