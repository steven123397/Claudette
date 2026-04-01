import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { assertPathInsideWorkspace } from '../../workspace/policy'
import type { ToolDefinition, ToolSchema } from '../types'
import { toWorkspaceRelativePath } from './shared'

export type WriteToolInput = {
  filePath: string
  content: string
}

export type WriteToolOutput = {
  filePath: string
  bytesWritten: number
  created: boolean
  summary: string
}

const schema: ToolSchema = {
  type: 'object',
  properties: {
    filePath: {
      type: 'string',
      description: 'Workspace-relative file path to create or overwrite',
    },
    content: {
      type: 'string',
      description: 'UTF-8 text content written to the target file',
    },
  },
  required: ['filePath', 'content'],
  additionalProperties: false,
}

function isNotFoundError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}

export function validateWriteToolInput(input: unknown): WriteToolInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('write input must be an object')
  }

  const candidate = input as Record<string, unknown>

  if (typeof candidate.filePath !== 'string' || candidate.filePath.trim() === '') {
    throw new Error('filePath must be a non-empty string')
  }

  if (typeof candidate.content !== 'string') {
    throw new Error('content must be a string')
  }

  return {
    filePath: candidate.filePath,
    content: candidate.content,
  }
}

export const writeTool: ToolDefinition<WriteToolInput, WriteToolOutput> = {
  name: 'write',
  description: 'Create or overwrite a text file inside the workspace',
  schema,
  isReadOnly: false,
  isConcurrencySafe: false,
  validate: validateWriteToolInput,
  async execute(input, context) {
    const absolutePath = assertPathInsideWorkspace(context.workspaceRoot, input.filePath)
    let created = false

    try {
      await stat(absolutePath)
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error
      }

      created = true
    }

    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, input.content, 'utf8')

    const filePath = toWorkspaceRelativePath(context.workspaceRoot, absolutePath)
    const bytesWritten = Buffer.byteLength(input.content, 'utf8')

    return {
      filePath,
      bytesWritten,
      created,
      summary: `Wrote ${filePath} (${bytesWritten} bytes, ${created ? 'created' : 'updated'})`,
    }
  },
}
