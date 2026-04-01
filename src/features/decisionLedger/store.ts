import { join } from 'node:path'

import { appendJsonl, readJsonl } from '../../utils/jsonl'

export type DecisionLedgerEntry = {
  summary: string
  rationale: string
  timestamp: string
  sessionId: string | null
}

export type DecisionLedgerAppendInput = {
  summary: string
  rationale: string
  sessionId: string | null
}

export type DecisionLedgerStore = {
  append(input: DecisionLedgerAppendInput): Promise<DecisionLedgerEntry>
  list(): Promise<DecisionLedgerEntry[]>
}

export type CreateDecisionLedgerStoreOptions = {
  now?: () => Date
}

export function createDecisionLedgerStore(
  workspaceRoot: string,
  options: CreateDecisionLedgerStoreOptions = {},
): DecisionLedgerStore {
  const now = options.now ?? (() => new Date())
  const filePath = getDecisionLedgerPath(workspaceRoot)

  return {
    async append(input) {
      const entry = createDecisionLedgerEntry(input, now)

      await appendJsonl(filePath, [entry])

      return entry
    },
    async list() {
      const items = await readJsonl(filePath, isDecisionLedgerEntry)

      return items.sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    },
  }
}

export function getDecisionLedgerPath(workspaceRoot: string): string {
  return join(workspaceRoot, '.claudette', 'decision-ledger.jsonl')
}

function createDecisionLedgerEntry(
  input: DecisionLedgerAppendInput,
  now: () => Date,
): DecisionLedgerEntry {
  return {
    summary: input.summary,
    rationale: input.rationale,
    timestamp: now().toISOString(),
    sessionId: input.sessionId,
  }
}

function isDecisionLedgerEntry(value: unknown): value is DecisionLedgerEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const entry = value as Partial<DecisionLedgerEntry>

  return (
    typeof entry.summary === 'string' &&
    typeof entry.rationale === 'string' &&
    typeof entry.timestamp === 'string' &&
    (entry.sessionId === null || typeof entry.sessionId === 'string')
  )
}
