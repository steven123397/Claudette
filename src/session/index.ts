import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { isSessionIndexEntry, type SessionIndexEntry } from './types'

export function getClaudetteDir(workspaceRoot: string): string {
  return join(resolve(workspaceRoot), '.claudette')
}

export function getSessionsDir(workspaceRoot: string): string {
  return join(getClaudetteDir(workspaceRoot), 'sessions')
}

export function getSessionDir(workspaceRoot: string, sessionId: string): string {
  return join(getSessionsDir(workspaceRoot), sessionId)
}

export function getTranscriptPath(sessionDir: string): string {
  return join(resolve(sessionDir), 'transcript.jsonl')
}

export function getSessionIndexPath(workspaceRoot: string): string {
  return join(getSessionsDir(workspaceRoot), 'index.json')
}

export async function loadSessionIndex(workspaceRoot: string): Promise<SessionIndexEntry[]> {
  try {
    const filePath = getSessionIndexPath(workspaceRoot)
    const contents = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(contents) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isSessionIndexEntry)
  } catch (error) {
    if (isNotFoundError(error)) {
      return []
    }

    throw error
  }
}

export async function upsertSessionIndexEntry(
  workspaceRoot: string,
  entry: SessionIndexEntry,
): Promise<SessionIndexEntry[]> {
  const currentEntries = await loadSessionIndex(workspaceRoot)
  const nextEntries = currentEntries.filter(currentEntry => currentEntry.id !== entry.id)

  nextEntries.push(entry)
  nextEntries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

  const filePath = getSessionIndexPath(workspaceRoot)
  await mkdir(getSessionsDir(workspaceRoot), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(nextEntries, null, 2)}\n`, 'utf8')

  return nextEntries
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
