import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

it('returns relative matches for glob patterns', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
  await mkdir(join(workspaceRoot, 'src', 'nested'), { recursive: true })
  await writeFile(join(workspaceRoot, 'src', 'app.ts'), 'export const app = true', 'utf8')
  await writeFile(join(workspaceRoot, 'src', 'nested', 'util.ts'), 'export const util = true', 'utf8')
  await writeFile(join(workspaceRoot, 'README.md'), '# demo', 'utf8')

  const result = await dispatchToolCall(createToolRegistry(), {
    name: 'glob',
    input: { pattern: 'src/**/*.ts' },
  }, createContext())

  expect(result).toEqual({
    paths: ['src/app.ts', 'src/nested/util.ts'],
  })
})

it('returns file path, line number, and preview for grep matches', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
  await mkdir(join(workspaceRoot, 'src'), { recursive: true })
  await writeFile(
    join(workspaceRoot, 'src', 'app.ts'),
    'export const value = 1\nconst alpha = value\nconst beta = value',
    'utf8',
  )
  await writeFile(join(workspaceRoot, 'README.md'), 'alpha docs', 'utf8')

  const result = await dispatchToolCall(createToolRegistry(), {
    name: 'grep',
    input: { pattern: 'alpha', filePattern: 'src/**/*.ts' },
  }, createContext())

  expect(result).toEqual({
    matches: [
      {
        filePath: 'src/app.ts',
        lineNumber: 2,
        preview: 'const alpha = value',
      },
    ],
  })
})

it('supports case-insensitive grep', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-tools-'))
  await mkdir(join(workspaceRoot, 'docs'), { recursive: true })
  await writeFile(join(workspaceRoot, 'docs', 'guide.md'), 'Compass\nDecision\ncompass', 'utf8')

  const result = await dispatchToolCall(createToolRegistry(), {
    name: 'grep',
    input: { pattern: 'compass', filePattern: 'docs/**/*.md', ignoreCase: true },
  }, createContext())

  expect(result).toEqual({
    matches: [
      {
        filePath: 'docs/guide.md',
        lineNumber: 1,
        preview: 'Compass',
      },
      {
        filePath: 'docs/guide.md',
        lineNumber: 3,
        preview: 'compass',
      },
    ],
  })
})
