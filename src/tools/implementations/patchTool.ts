import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { assertPathInsideWorkspace } from '../../workspace/policy'
import type { ToolDefinition, ToolSchema } from '../types'
import { toWorkspaceRelativePath } from './shared'

export type PatchToolInput = {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

export type PatchToolOutput = {
  filePath: string
  replacements: number
  bytesWritten: number
  summary: string
}

const schema: ToolSchema = {
  type: 'object',
  properties: {
    filePath: {
      type: 'string',
      description: 'Workspace-relative file path to patch',
    },
    oldString: {
      type: 'string',
      description: 'Exact text to replace',
    },
    newString: {
      type: 'string',
      description: 'Replacement text',
    },
    replaceAll: {
      type: 'boolean',
      description: 'Whether every exact match should be replaced',
    },
  },
  required: ['filePath', 'oldString', 'newString'],
  additionalProperties: false,
}

function countOccurrences(content: string, search: string): number {
  let count = 0
  let offset = 0

  while (true) {
    const matchIndex = content.indexOf(search, offset)

    if (matchIndex === -1) {
      return count
    }

    count += 1
    offset = matchIndex + search.length
  }
}

export function validatePatchToolInput(input: unknown): PatchToolInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('patch input must be an object')
  }

  const candidate = input as Record<string, unknown>

  if (typeof candidate.filePath !== 'string' || candidate.filePath.trim() === '') {
    throw new Error('filePath must be a non-empty string')
  }

  if (typeof candidate.oldString !== 'string' || candidate.oldString === '') {
    throw new Error('oldString must be a non-empty string')
  }

  if (typeof candidate.newString !== 'string') {
    throw new Error('newString must be a string')
  }

  if (
    candidate.replaceAll !== undefined &&
    typeof candidate.replaceAll !== 'boolean'
  ) {
    throw new Error('replaceAll must be a boolean')
  }

  return {
    filePath: candidate.filePath,
    oldString: candidate.oldString,
    newString: candidate.newString,
    replaceAll: candidate.replaceAll as boolean | undefined,
  }
}

export const patchTool: ToolDefinition<PatchToolInput, PatchToolOutput> = {
  name: 'patch',
  description: 'Apply exact string replacements to a workspace file',
  schema,
  isReadOnly: false,
  isConcurrencySafe: false,
  validate: validatePatchToolInput,
  async execute(input, context) {
    const absolutePath = assertPathInsideWorkspace(context.workspaceRoot, input.filePath)
    const currentContent = await readFile(absolutePath, 'utf8')

    let replacements = 0
    let nextContent = currentContent

    if (input.replaceAll) {
      replacements = countOccurrences(currentContent, input.oldString)

      if (replacements === 0) {
        throw new Error('oldString was not found in the target file')
      }

      nextContent = currentContent.split(input.oldString).join(input.newString)
    } else {
      const matchIndex = currentContent.indexOf(input.oldString)

      if (matchIndex === -1) {
        throw new Error('oldString was not found in the target file')
      }

      replacements = 1
      nextContent =
        currentContent.slice(0, matchIndex) +
        input.newString +
        currentContent.slice(matchIndex + input.oldString.length)
    }

    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, nextContent, 'utf8')

    const filePath = toWorkspaceRelativePath(context.workspaceRoot, absolutePath)
    const bytesWritten = Buffer.byteLength(nextContent, 'utf8')
    const replacementLabel = replacements === 1 ? 'replacement' : 'replacements'

    return {
      filePath,
      replacements,
      bytesWritten,
      summary: `Patched ${filePath} (${replacements} ${replacementLabel})`,
    }
  },
}
