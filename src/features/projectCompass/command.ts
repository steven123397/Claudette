import type { CommandDefinition } from '../../commands/types'
import { analyzeProjectCompass } from './analyzer'

export const compassCommand: CommandDefinition = {
  name: 'compass',
  description: 'Show a lightweight project compass.',
  kind: 'local',
  async execute(args, context) {
    if (args.trim().length > 0) {
      return {
        type: 'system',
        content: ['Usage:', '/compass'].join('\n'),
      }
    }

    const summary = await analyzeProjectCompass(context.workspaceRoot)

    return {
      type: 'system',
      content: formatProjectCompass(summary.sections),
    }
  },
}

function formatProjectCompass(
  sections: ReadonlyArray<{ title: string; lines: readonly string[] }>,
): string {
  return sections
    .map(section =>
      [section.title, ...section.lines.map(line => `- ${line}`)].join('\n'),
    )
    .join('\n\n')
}
