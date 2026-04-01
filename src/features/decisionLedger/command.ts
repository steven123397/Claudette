import type { CommandDefinition } from '../../commands/types'
import {
  createDecisionLedgerStore,
  type DecisionLedgerEntry,
} from './store'

const DECISION_ADD_PATTERN = /^add\s+(.+?)\s+--because\s+(.+)$/s

export const decisionCommand: CommandDefinition = {
  name: 'decision',
  description: 'Record and list project decisions.',
  kind: 'local',
  async execute(args, context) {
    const normalizedArgs = args.trim()
    const store = createDecisionLedgerStore(context.workspaceRoot)

    if (normalizedArgs === 'list') {
      const items = await store.list()

      return {
        type: 'system',
        content: formatDecisionList(items),
      }
    }

    const parsedAdd = parseDecisionAddArgs(normalizedArgs)

    if (parsedAdd) {
      const entry = await store.append({
        summary: parsedAdd.summary,
        rationale: parsedAdd.rationale,
        sessionId: context.currentSessionId,
      })

      return {
        type: 'system',
        content: formatDecisionAdded(entry),
      }
    }

    return {
      type: 'system',
      content: [
        'Usage:',
        '/decision add <summary> --because <rationale>',
        '/decision list',
      ].join('\n'),
    }
  },
}

function parseDecisionAddArgs(
  args: string,
): { rationale: string; summary: string } | null {
  const match = DECISION_ADD_PATTERN.exec(args)

  if (!match) {
    return null
  }

  const [, summary, rationale] = match

  return {
    summary: summary.trim(),
    rationale: rationale.trim(),
  }
}

function formatDecisionAdded(entry: DecisionLedgerEntry): string {
  return [
    `Recorded decision: ${entry.summary}`,
    `Because: ${entry.rationale}`,
    `Timestamp: ${entry.timestamp}`,
    `Session: ${entry.sessionId ?? 'none'}`,
  ].join('\n')
}

function formatDecisionList(items: readonly DecisionLedgerEntry[]): string {
  if (items.length === 0) {
    return 'No recorded decisions yet.'
  }

  return items
    .map((item, index) =>
      [
        `${index + 1}. ${item.summary}`,
        `   Because: ${item.rationale}`,
        `   Timestamp: ${item.timestamp}`,
        `   Session: ${item.sessionId ?? 'none'}`,
      ].join('\n'),
    )
    .join('\n\n')
}
