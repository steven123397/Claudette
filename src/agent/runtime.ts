import { randomUUID } from 'node:crypto'

import type { AppConfig } from '../config/env'
import type { ChatProvider, ProviderToolCall } from '../provider/types'
import {
  getSessionDir,
  loadSessionIndex,
  upsertSessionIndexEntry,
} from '../session/index'
import { resumeTranscript } from '../session/resume'
import { appendTranscript } from '../session/store'
import type { TranscriptMessage } from '../session/types'
import type { ToolRegistry } from '../tools/types'
import { buildTurnContext } from './contextBuilder'
import { runTurnLoop } from './turnLoop'

const DEFAULT_MAX_TOOL_ITERATIONS = 8

export type AgentRuntimeSessionState = {
  currentSessionId: string | null
}

export type CreateAgentRuntimeOptions = {
  config: AppConfig
  createSessionId?: () => string
  maxToolIterations?: number
  now?: () => Date
  provider: ChatProvider
  session: AgentRuntimeSessionState
  tools: ToolRegistry
  workspaceRoot: string
}

export type AgentRuntimeResult = {
  finalMessage: TranscriptMessage
  sessionId: string
  toolCalls: ProviderToolCall[]
  turnMessages: TranscriptMessage[]
}

export type AgentRuntime = {
  respond(userInput: string): Promise<AgentRuntimeResult>
}

export function createAgentRuntime(
  options: CreateAgentRuntimeOptions,
): AgentRuntime {
  const createSessionId = options.createSessionId ?? randomUUID
  const maxToolIterations =
    options.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
  const now = options.now ?? (() => new Date())

  return {
    async respond(userInput: string): Promise<AgentRuntimeResult> {
      const sessionId = options.session.currentSessionId ?? createSessionId()
      const sessionDir = getSessionDir(options.workspaceRoot, sessionId)
      const history = await resumeTranscript(sessionDir)
      const context = buildTurnContext({
        history,
        toolRegistry: options.tools,
        userInput,
      })
      const turnResult = await runTurnLoop({
        maxToolIterations,
        messages: context.providerInput.messages,
        provider: options.provider,
        toolRegistry: options.tools,
        workspaceRoot: options.workspaceRoot,
      })
      const timestamp = now().toISOString()
      const currentIndex = await loadSessionIndex(options.workspaceRoot)
      const existingEntry = currentIndex.find(entry => entry.id === sessionId)

      await appendTranscript(sessionDir, [
        context.userMessage,
        ...turnResult.turnMessages,
      ])
      await upsertSessionIndexEntry(options.workspaceRoot, {
        id: sessionId,
        title: existingEntry?.title ?? createSessionTitle(userInput),
        model: options.config.model,
        createdAt: existingEntry?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })

      options.session.currentSessionId = sessionId

      return {
        finalMessage: turnResult.finalMessage,
        sessionId,
        toolCalls: turnResult.toolCalls,
        turnMessages: turnResult.turnMessages,
      }
    },
  }
}

function createSessionTitle(userInput: string): string {
  const normalized = userInput.trim()

  if (normalized === '') {
    return 'New session'
  }

  return normalized.length <= 60
    ? normalized
    : `${normalized.slice(0, 57)}...`
}
