import type { CommandDefinition } from '../types'

export const modelCommand: CommandDefinition = {
  name: 'model',
  description: 'Show or change the default model',
  kind: 'local',
  async execute(args, context) {
    const nextModel = args.trim()

    if (nextModel === '') {
      return {
        type: 'system',
        content: `Current model: ${context.config.model}`,
      }
    }

    context.config.model = nextModel

    return {
      type: 'system',
      content: `Default model set to ${nextModel}.`,
    }
  },
}
