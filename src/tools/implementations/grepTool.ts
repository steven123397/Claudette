import { readFile } from 'node:fs/promises'
import { matchesGlob } from 'node:path'

import { assertPathInsideWorkspace } from '../../workspace/policy'
import type { ToolDefinition, ToolSchema } from '../types'
import { collectWorkspaceFiles, splitTextIntoLines, toWorkspaceRelativePath } from './shared'

export type GrepToolInput = {
  pattern: string
  filePattern?: string
  ignoreCase?: boolean
  maxResults?: number
}

export type GrepMatch = {
  filePath: string
  lineNumber: number
  preview: string
}

export type GrepToolOutput = {
  matches: GrepMatch[]
}

const schema: ToolSchema = {
  type: 'object',
  properties: {
    pattern: {
      type: 'string',
      description: 'Regular expression pattern matched against each line',
    },
    filePattern: {
      type: 'string',
      description: 'Optional glob that filters which files are searched',
    },
    ignoreCase: {
      type: 'boolean',
      description: 'Whether the regular expression should be case-insensitive',
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of matches to return',
    },
  },
  required: ['pattern'],
  additionalProperties: false,
}

function parseOptionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName} must be a positive integer`)
  }

  return value
}

export function validateGrepToolInput(input: unknown): GrepToolInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('grep input must be an object')
  }

  const candidate = input as Record<string, unknown>

  if (typeof candidate.pattern !== 'string' || candidate.pattern.trim() === '') {
    throw new Error('pattern must be a non-empty string')
  }

  if (
    candidate.filePattern !== undefined &&
    (typeof candidate.filePattern !== 'string' || candidate.filePattern.trim() === '')
  ) {
    throw new Error('filePattern must be a non-empty string when provided')
  }

  if (
    candidate.ignoreCase !== undefined &&
    typeof candidate.ignoreCase !== 'boolean'
  ) {
    throw new Error('ignoreCase must be a boolean')
  }

  try {
    new RegExp(candidate.pattern, candidate.ignoreCase ? 'i' : undefined)
  } catch (error) {
    throw new Error(
      `pattern must be a valid regular expression: ${(error as Error).message}`,
    )
  }

  return {
    pattern: candidate.pattern,
    filePattern: candidate.filePattern as string | undefined,
    ignoreCase: candidate.ignoreCase as boolean | undefined,
    maxResults: parseOptionalPositiveInteger(candidate.maxResults, 'maxResults'),
  }
}

export const grepTool: ToolDefinition<GrepToolInput, GrepToolOutput> = {
  name: 'grep',
  description: 'Search for regular expression matches in workspace files',
  schema,
  isReadOnly: true,
  isConcurrencySafe: true,
  validate: validateGrepToolInput,
  async execute(input, context) {
    const expression = new RegExp(input.pattern, input.ignoreCase ? 'i' : undefined)
    const maxResults = input.maxResults ?? 50
    const files = await collectWorkspaceFiles(context.workspaceRoot)
    const matches: GrepMatch[] = []

    for (const file of files) {
      const filePath = toWorkspaceRelativePath(context.workspaceRoot, file)

      if (input.filePattern && !matchesGlob(filePath, input.filePattern)) {
        continue
      }

      const safePath = assertPathInsideWorkspace(context.workspaceRoot, file)
      const content = await readFile(safePath, 'utf8')
      const lines = splitTextIntoLines(content)

      for (const [index, line] of lines.entries()) {
        if (!expression.test(line)) {
          continue
        }

        matches.push({
          filePath,
          lineNumber: index + 1,
          preview: line,
        })

        if (matches.length >= maxResults) {
          return { matches }
        }
      }
    }

    return { matches }
  },
}
