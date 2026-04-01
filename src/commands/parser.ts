import type { ParsedCommand } from './types'

export function parseCommand(input: string): ParsedCommand | null {
  if (!input.startsWith('/')) {
    return null
  }

  const trimmed = input.slice(1).trim()

  if (trimmed === '') {
    return null
  }

  const firstWhitespaceIndex = trimmed.search(/\s/)

  if (firstWhitespaceIndex === -1) {
    return {
      name: trimmed,
      args: '',
    }
  }

  return {
    name: trimmed.slice(0, firstWhitespaceIndex),
    args: trimmed.slice(firstWhitespaceIndex).trim(),
  }
}
