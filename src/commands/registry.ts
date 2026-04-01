import { clearCommand } from './handlers/clear'
import { exitCommand } from './handlers/exit'
import { createHelpCommand } from './handlers/help'
import { decisionCommand } from '../features/decisionLedger/command'
import { compassCommand } from '../features/projectCompass/command'
import { modelCommand } from './handlers/model'
import { sessionCommand } from './handlers/session'
import { toolsCommand } from './handlers/tools'
import { parseCommand } from './parser'
import type { CommandDefinition, CommandRegistry } from './types'

export function createCommandRegistry(): CommandRegistry {
  let items: CommandDefinition[] = []

  const getCommands = () => items

  items = [
    createHelpCommand(getCommands),
    clearCommand,
    exitCommand,
    sessionCommand,
    modelCommand,
    toolsCommand,
    decisionCommand,
    compassCommand,
  ]

  const commandsByName = new Map(items.map(command => [command.name, command] as const))

  return {
    items,
    get(name: string) {
      return commandsByName.get(name)
    },
    list() {
      return items
    },
    async execute(input, context) {
      const parsed = parseCommand(input)

      if (!parsed) {
        return {
          type: 'system',
          content: 'Input is not a slash command.',
        }
      }

      const command = commandsByName.get(parsed.name)

      if (!command) {
        return {
          type: 'system',
          content: `Unknown command: /${parsed.name}`,
        }
      }

      if (command.kind === 'prompt') {
        return {
          type: 'prompt',
          name: command.name,
          args: parsed.args,
        }
      }

      return command.execute(parsed.args, context)
    },
  }
}
