import { readFile } from 'node:fs/promises'

import { assertPathInsideWorkspace } from '../../workspace/policy'
import type { ToolDefinition, ToolSchema } from '../types'
import { splitTextIntoLines, toWorkspaceRelativePath } from './shared'

export type ReadToolInput = {
  filePath: string
  startLine?: number
  endLine?: number
}

export type ReadToolOutput = {
  filePath: string
  content: string
  startLine: number
  endLine: number
  totalLines: number
}

const schema: ToolSchema = {
  type: 'object',
  properties: {
    filePath: {
      type: 'string',
      description: 'Workspace-relative file path to read',
    },
    startLine: {
      type: 'number',
      description: 'Inclusive starting line number',
    },
    endLine: {
      type: 'number',
      description: 'Inclusive ending line number',
    },
  },
  required: ['filePath'],
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

export function validateReadToolInput(input: unknown): ReadToolInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('read input must be an object')
  }

  const candidate = input as Record<string, unknown>
  const filePath = candidate.filePath

  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new Error('filePath must be a non-empty string')
  }

  const startLine = parseOptionalPositiveInteger(candidate.startLine, 'startLine')
  const endLine = parseOptionalPositiveInteger(candidate.endLine, 'endLine')

  if (
    startLine !== undefined &&
    endLine !== undefined &&
    startLine > endLine
  ) {
    throw new Error('startLine must be less than or equal to endLine')
  }

  return {
    filePath,
    startLine,
    endLine,
  }
}

export const readTool: ToolDefinition<ReadToolInput, ReadToolOutput> = {
  name: 'read',
  description: 'Read a text file from the workspace',
  schema,
  isReadOnly: true,
  isConcurrencySafe: true,
  validate: validateReadToolInput,
  async execute(input, context) {
    const absolutePath = assertPathInsideWorkspace(context.workspaceRoot, input.filePath)
    const rawContent = await readFile(absolutePath, 'utf8')
    const lines = splitTextIntoLines(rawContent)
    const totalLines = lines.length

    if (input.startLine === undefined && input.endLine === undefined) {
      return {
        filePath: toWorkspaceRelativePath(context.workspaceRoot, absolutePath),
        content: rawContent,
        startLine: totalLines === 0 ? 0 : 1,
        endLine: totalLines,
        totalLines,
      }
    }

    if (totalLines === 0) {
      throw new Error('Cannot read a line range from an empty file')
    }

    const startLine = input.startLine ?? 1
    const endLine = input.endLine ?? totalLines

    if (startLine > totalLines || endLine > totalLines) {
      throw new Error('Requested line range is outside the file')
    }

    return {
      filePath: toWorkspaceRelativePath(context.workspaceRoot, absolutePath),
      content: lines.slice(startLine - 1, endLine).join('\n'),
      startLine,
      endLine,
      totalLines,
    }
  },
}
