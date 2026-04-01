import type { CommandDefinition } from '../types'

export const toolsCommand: CommandDefinition = {
  name: 'tools',
  description: 'List enabled tools and their purpose',
  kind: 'local',
  async execute(args, context) {
    void args

    const lines = ['Enabled tools:']

    for (const tool of context.tools.list()) {
      lines.push(`- ${tool.name}: ${tool.description}`)
    }

    return {
      type: 'system',
      content: lines.join('\n'),
    }
  },
}
