import type { CommandDefinition } from '../types'

export const exitCommand: CommandDefinition = {
  name: 'exit',
  description: 'Exit the current Claudette session',
  kind: 'local',
  async execute() {
    return {
      type: 'system',
      content: 'Exiting Claudette.',
      action: { type: 'exit' },
    }
  },
}
