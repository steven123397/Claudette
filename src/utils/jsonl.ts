import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'

type Validator<T> = (value: unknown) => value is T

export async function appendJsonl<T>(filePath: string, entries: readonly T[]): Promise<void> {
  if (entries.length === 0) {
    return
  }

  await mkdir(dirname(filePath), { recursive: true })

  const payload = `${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`
  await appendFile(filePath, payload, 'utf8')
}

export async function readJsonl<T>(filePath: string, validator?: Validator<T>): Promise<T[]> {
  const contents = await readUtf8OrEmpty(filePath)

  if (!contents) {
    return []
  }

  return contents
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map((line, index) => {
      const parsed = JSON.parse(line) as unknown

      if (validator && !validator(parsed)) {
        throw new Error(`Invalid JSONL entry at line ${index + 1}`)
      }

      return parsed as T
    })
}

export async function readJsonlRecover<T>(filePath: string, validator?: Validator<T>): Promise<T[]> {
  const contents = await readUtf8OrEmpty(filePath)

  if (!contents) {
    return []
  }

  const entries: T[] = []

  for (const line of contents.split('\n')) {
    if (line.trim().length === 0) {
      continue
    }

    try {
      const parsed = JSON.parse(line) as unknown

      if (!validator || validator(parsed)) {
        entries.push(parsed as T)
      }
    } catch {
      continue
    }
  }

  return entries
}

async function readUtf8OrEmpty(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (isNotFoundError(error)) {
      return ''
    }

    throw error
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
