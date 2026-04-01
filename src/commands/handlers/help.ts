import type { CommandDefinition } from '../types'

export function createHelpCommand(
  getCommands: () => readonly CommandDefinition[],
): CommandDefinition {
  return {
    name: 'help',
    description: 'Show available slash commands',
    kind: 'local',
    async execute() {
      const lines = ['Available commands:']

      for (const command of getCommands()) {
        lines.push(`/${command.name} - ${command.description}`)
      }

      return {
        type: 'system',
        content: lines.join('\n'),
      }
    },
  }
}
