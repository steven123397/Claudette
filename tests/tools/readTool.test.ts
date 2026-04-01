import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, describe, expect, it } from 'vitest'

import { dispatchToolCall } from '../../src/tools/dispatcher'
import { createToolRegistry } from '../../src/tools/registry'
import type { ToolContext } from '../../src/tools/types'

let workspaceRoot: string | undefined
let outsideRoot: string | undefined

afterEach(async () => {
  if (workspaceRoot) {
    await rm(workspaceRoot, { force: true, recursive: true })
    workspaceRoot = undefined
  }

  if (outsideRoot) {
    await rm(outsideRoot, { force: true, recursive: true })
    outsideRoot = undefined
  }
})

function createContext(): ToolContext {
  if (!workspaceRoot) {
    throw new Error('workspaceRoot is not initialized')
  }

  return { workspaceRoot }
}

describe('tool registry', () => {
  it('registers read-only tools with metadata', () => {
    const registry = createToolRegistry()
    const read = registry.get('read')

    expect(read?.schema.type).toBe('object')
    expect(read?.isReadOnly).toBe(true)
    expect(read?.isConcurrencySafe).toBe(true)
  })
})

describe('read tool', () => {
  it('reads a file within workspace', async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
    await mkdir(join(workspaceRoot, 'src'), { recursive: true })
    await writeFile(join(workspaceRoot, 'src', 'a.ts'), 'export const answer = 42', 'utf8')

    const result = await dispatchToolCall(createToolRegistry(), {
      name: 'read',
      input: { filePath: 'src/a.ts' },
    }, createContext())

    expect(result).toEqual({
      filePath: 'src/a.ts',
      content: 'export const answer = 42',
      startLine: 1,
      endLine: 1,
      totalLines: 1,
    })
  })

  it('supports reading an inclusive line range', async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
    await writeFile(join(workspaceRoot, 'notes.txt'), 'alpha\nbeta\ngamma\ndelta', 'utf8')

    const result = await dispatchToolCall(createToolRegistry(), {
      name: 'read',
      input: { filePath: 'notes.txt', startLine: 2, endLine: 3 },
    }, createContext())

    expect(result).toEqual({
      filePath: 'notes.txt',
      content: 'beta\ngamma',
      startLine: 2,
      endLine: 3,
      totalLines: 4,
    })
  })

  it('rejects paths outside workspace', async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
    outsideRoot = await mkdtemp(join(tmpdir(), 'claudette-outside-'))
    await writeFile(join(outsideRoot, 'secret.txt'), 'nope', 'utf8')

    await expect(dispatchToolCall(createToolRegistry(), {
      name: 'read',
      input: { filePath: '../secret.txt' },
    }, createContext())).rejects.toThrow(/outside workspace/i)
  })

  it('rejects an invalid line range before reading', async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
    await writeFile(join(workspaceRoot, 'notes.txt'), 'alpha\nbeta', 'utf8')

    await expect(dispatchToolCall(createToolRegistry(), {
      name: 'read',
      input: { filePath: 'notes.txt', startLine: 3, endLine: 1 },
    }, createContext())).rejects.toThrow(/startLine.*endLine/i)
  })
})
