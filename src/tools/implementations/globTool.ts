import { matchesGlob } from 'node:path'

import type { ToolDefinition, ToolSchema } from '../types'
import { collectWorkspaceFiles, toWorkspaceRelativePath } from './shared'

export type GlobToolInput = {
  pattern: string
}

export type GlobToolOutput = {
  paths: string[]
}

const schema: ToolSchema = {
  type: 'object',
  properties: {
    pattern: {
      type: 'string',
      description: 'Glob pattern matched against workspace-relative file paths',
    },
  },
  required: ['pattern'],
  additionalProperties: false,
}

export function validateGlobToolInput(input: unknown): GlobToolInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('glob input must be an object')
  }

  const candidate = input as Record<string, unknown>

  if (typeof candidate.pattern !== 'string' || candidate.pattern.trim() === '') {
    throw new Error('pattern must be a non-empty string')
  }

  return {
    pattern: candidate.pattern,
  }
}

export const globTool: ToolDefinition<GlobToolInput, GlobToolOutput> = {
  name: 'glob',
  description: 'Find files by glob pattern within the workspace',
  schema,
  isReadOnly: true,
  isConcurrencySafe: true,
  validate: validateGlobToolInput,
  async execute(input, context) {
    const files = await collectWorkspaceFiles(context.workspaceRoot)
    const paths = files
      .map(file => toWorkspaceRelativePath(context.workspaceRoot, file))
      .filter(file => matchesGlob(file, input.pattern))
      .sort((left, right) => left.localeCompare(right))

    return { paths }
  },
}
