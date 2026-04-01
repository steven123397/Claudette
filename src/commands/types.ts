import type { AppConfig } from '../config/env'
import type { TranscriptMessage } from '../session/types'
import type { ToolRegistry } from '../tools/types'

export type CommandKind = 'local' | 'prompt'

export type CommandAction =
  | { type: 'clear' }
  | { type: 'exit' }
  | {
      type: 'resume'
      sessionId: string
      transcript: TranscriptMessage[]
    }

export type SystemCommandResult = {
  type: 'system'
  content: string
  action?: CommandAction
}

export type PromptCommandResult = {
  type: 'prompt'
  name: string
  args: string
}

export type CommandResult = SystemCommandResult | PromptCommandResult

export type CommandContext = {
  workspaceRoot: string
  config: AppConfig
  tools: ToolRegistry
  currentSessionId: string | null
  setCurrentSessionId?: (sessionId: string | null) => void
}

export type CommandDefinition = {
  name: string
  description: string
  kind: CommandKind
  execute(args: string, context: CommandContext): Promise<CommandResult>
}

export type ParsedCommand = {
  name: string
  args: string
}

export type CommandRegistry = {
  items: readonly CommandDefinition[]
  get(name: string): CommandDefinition | undefined
  list(): readonly CommandDefinition[]
  execute(input: string, context: CommandContext): Promise<CommandResult>
}
