import { getSessionDir, loadSessionIndex } from '../../session/index'
import { resumeTranscript } from '../../session/resume'
import type { CommandDefinition } from '../types'

function formatSessionList() {
  return 'Usage: /session list | /session resume <id>'
}

export const sessionCommand: CommandDefinition = {
  name: 'session',
  description: 'List or resume project sessions',
  kind: 'local',
  async execute(args, context) {
    const [subcommand = 'list', sessionId] = args.split(/\s+/).filter(Boolean)

    if (subcommand === 'list') {
      const sessions = await loadSessionIndex(context.workspaceRoot)

      if (sessions.length === 0) {
        return {
          type: 'system',
          content: 'No saved sessions.',
        }
      }

      const lines = ['Saved sessions:']

      for (const session of sessions) {
        lines.push(`- ${session.id} ${session.title} [${session.model}]`)
      }

      return {
        type: 'system',
        content: lines.join('\n'),
      }
    }

    if (subcommand === 'resume') {
      if (!sessionId) {
        return {
          type: 'system',
          content: 'Usage: /session resume <id>',
        }
      }

      const sessions = await loadSessionIndex(context.workspaceRoot)
      const existingSession = sessions.find(session => session.id === sessionId)

      if (!existingSession) {
        return {
          type: 'system',
          content: `Session not found: ${sessionId}.`,
        }
      }

      const transcript = await resumeTranscript(
        getSessionDir(context.workspaceRoot, sessionId),
      )

      context.setCurrentSessionId?.(sessionId)

      return {
        type: 'system',
        content: `Resumed session ${sessionId}.`,
        action: {
          type: 'resume',
          sessionId,
          transcript,
        },
      }
    }

    return {
      type: 'system',
      content: formatSessionList(),
    }
  },
}
