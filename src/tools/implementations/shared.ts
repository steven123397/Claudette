import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import { assertPathInsideWorkspace } from '../../workspace/policy'

export async function collectWorkspaceFiles(
  workspaceRoot: string,
  currentDir: string = workspaceRoot,
): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name))
  const files: string[] = []

  for (const entry of sortedEntries) {
    const entryPath = assertPathInsideWorkspace(workspaceRoot, join(currentDir, entry.name))

    if (entry.isDirectory()) {
      files.push(...await collectWorkspaceFiles(workspaceRoot, entryPath))
      continue
    }

    if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

export function splitTextIntoLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n')

  if (normalized === '') {
    return []
  }

  const lines = normalized.split('\n')

  if (normalized.endsWith('\n')) {
    lines.pop()
  }

  return lines
}

export function toWorkspaceRelativePath(workspaceRoot: string, target: string): string {
  const safePath = assertPathInsideWorkspace(workspaceRoot, target)
  return relative(workspaceRoot, safePath).split(sep).join('/')
}
