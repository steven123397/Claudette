import type { CommandDefinition } from '../types'

export const clearCommand: CommandDefinition = {
  name: 'clear',
  description: 'Clear the current REPL view',
  kind: 'local',
  async execute() {
    return {
      type: 'system',
      content: 'Cleared current REPL view.',
      action: { type: 'clear' },
    }
  },
}
