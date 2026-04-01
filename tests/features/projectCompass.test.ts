import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, expect, it } from 'vitest'

import { createCommandRegistry } from '../../src/commands/registry'
import type {
  CommandContext,
  CommandResult,
  SystemCommandResult,
} from '../../src/commands/types'
import { analyzeProjectCompass } from '../../src/features/projectCompass/analyzer'
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

it('summarizes package metadata, entry files and test files', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-compass-'))

  await mkdir(join(workspaceRoot, 'src', 'cli'), { recursive: true })
  await mkdir(join(workspaceRoot, 'src', 'agent'), { recursive: true })
  await mkdir(join(workspaceRoot, 'tests', 'agent'), { recursive: true })
  await mkdir(join(workspaceRoot, 'docs'), { recursive: true })

  await writeFile(
    join(workspaceRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'demo-workspace',
        version: '1.0.0',
        scripts: {
          build: 'tsc -p tsconfig.json',
          test: 'vitest run',
        },
      },
      null,
      2,
    ),
  )
  await writeFile(join(workspaceRoot, 'src', 'cli', 'entry.ts'), 'export {}\n')
  await writeFile(join(workspaceRoot, 'src', 'agent', 'runtime.ts'), 'export {}\n')
  await writeFile(
    join(workspaceRoot, 'tests', 'agent', 'runtime.test.ts'),
    'export {}\n',
  )
  await writeFile(join(workspaceRoot, 'docs', 'overview.md'), '# Demo\n')

  const result = await analyzeProjectCompass(workspaceRoot)

  expect(result.sections.map(section => section.title)).toEqual([
    '项目定位',
    '入口与模块',
    '工具与测试',
    '当前缺口',
  ])
  expect(result.sections[0]?.lines.join('\n')).toContain('demo-workspace')
  expect(result.sections[1]?.lines.join('\n')).toContain('src/cli/entry.ts')
  expect(result.sections[1]?.lines.join('\n')).toContain('agent')
  expect(result.sections[2]?.lines.join('\n')).toContain('build')
  expect(result.sections[2]?.lines.join('\n')).toContain(
    'tests/agent/runtime.test.ts',
  )
  expect(result.sections[3]?.lines.join('\n')).toContain(
    'No obvious gaps from basic scan.',
  )
})

it('supports /compass and degrades for an empty workspace', async () => {
  workspaceRoot = await mkdtemp(join(tmpdir(), 'claudette-compass-'))
  const registry = createCommandRegistry()

  const result = expectSystemResult(
    await registry.execute('/compass', createContext()),
  )

  expect(result.content).toContain('项目定位')
  expect(result.content).toContain('入口与模块')
  expect(result.content).toContain('工具与测试')
  expect(result.content).toContain('当前缺口')
  expect(result.content).toContain('No package.json found.')
  expect(result.content).toContain('No src/ directory detected.')
  expect(result.content).toContain('No tests/ directory detected.')
  expect(result.content).toContain('No docs/ directory detected.')
})
