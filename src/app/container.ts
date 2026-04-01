import { resolve } from 'node:path'

import { createAgentRuntime, type AgentRuntime } from '../agent/runtime'
import { createCommandRegistry } from '../commands/registry'
import type { CommandRegistry } from '../commands/types'
import { loadAppConfig, type AppConfig } from '../config/env'
import { createOpenAICompatibleProvider } from '../provider/openaiCompatible/client'
import type { ChatProvider } from '../provider/types'
import { createToolRegistry } from '../tools/registry'
import type { ToolRegistry } from '../tools/types'

export type WorkspaceFacade = {
  root: string
}

export type SessionFacade = {
  currentSessionId: string | null
}

export type AppContainer = {
  config: AppConfig
  workspace: WorkspaceFacade
  session: SessionFacade
  tools: ToolRegistry
  commands: CommandRegistry
  runtime: AgentRuntime
}

export type CreateContainerOptions = {
  cwd: string
  config?: AppConfig
  provider?: ChatProvider
}

function createSessionFacade(): SessionFacade {
  return {
    currentSessionId: null,
  }
}

export function createContainer(options: CreateContainerOptions): AppContainer {
  const config = options.config ?? loadAppConfig()
  const workspace = {
    root: resolve(options.cwd),
  }
  const session = createSessionFacade()
  const tools = createToolRegistry()
  const provider =
    options.provider ??
    createOpenAICompatibleProvider({
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl,
      getModel: () => config.model,
    })

  return {
    config,
    workspace,
    session,
    tools,
    commands: createCommandRegistry(),
    runtime: createAgentRuntime({
      config,
      provider,
      session,
      tools,
      workspaceRoot: workspace.root,
    }),
  }
}
