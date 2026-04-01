import type { AgentRuntimeResult } from '../agent/runtime'
import type { CommandRegistry } from '../commands/types'
import type { AppConfig } from '../config/env'
import type { TranscriptMessage } from '../session/types'
import type { ToolRegistry } from '../tools/types'

export type ReplRuntime = {
  respond(userInput: string): Promise<Pick<AgentRuntimeResult, 'turnMessages'>>
}

export type HandleInputContext = {
  config: AppConfig
  commands: CommandRegistry
  runtime: ReplRuntime
  session: {
    currentSessionId: string | null
  }
  tools: ToolRegistry
  workspace: {
    root: string
  }
}

export type HandleInputResult = {
  messages: TranscriptMessage[]
  action?: {
    type: 'clear' | 'exit'
  }
}

export type InputQueue = {
  drain(): TranscriptMessage[]
  isEmpty(): boolean
  push(...messages: TranscriptMessage[]): void
}

export function createInputQueue(): InputQueue {
  let items: TranscriptMessage[] = []

  return {
    drain() {
      const drained = items
      items = []
      return drained
    },
    isEmpty() {
      return items.length === 0
    },
    push(...messages) {
      items.push(...messages)
    },
  }
}

export async function handleInput(
  input: string,
  context: HandleInputContext,
): Promise<HandleInputResult> {
  if (input.startsWith('/')) {
    return handleCommandInput(input, context)
  }

  return handleRuntimeInput(input, context)
}

async function handleCommandInput(
  input: string,
  context: HandleInputContext,
): Promise<HandleInputResult> {
  try {
    const result = await context.commands.execute(input, {
      workspaceRoot: context.workspace.root,
      config: context.config,
      tools: context.tools,
      currentSessionId: context.session.currentSessionId,
      setCurrentSessionId: sessionId => {
        context.session.currentSessionId = sessionId
      },
    })

    if (result.type === 'prompt') {
      return handleRuntimeInput(input, context)
    }

    const messages: TranscriptMessage[] = [
      {
        role: 'system',
        content: result.content,
      },
    ]

    if (result.action?.type === 'resume') {
      messages.push(...result.action.transcript)
    }

    return {
      messages,
      action:
        result.action?.type === 'clear' || result.action?.type === 'exit'
          ? { type: result.action.type }
          : undefined,
    }
  } catch (error) {
    return createErrorResult(error)
  }
}

async function handleRuntimeInput(
  input: string,
  context: HandleInputContext,
): Promise<HandleInputResult> {
  try {
    const result = await context.runtime.respond(input)

    return {
      messages: result.turnMessages,
    }
  } catch (error) {
    return createErrorResult(error)
  }
}

function createErrorResult(error: unknown): HandleInputResult {
  return {
    messages: [
      {
        role: 'system',
        content: error instanceof Error ? error.message : 'Unexpected REPL error',
      },
    ],
  }
}
