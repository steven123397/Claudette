import { createContainer, type AppContainer } from './container'
import { loadAppConfig, type AppEnv } from '../config/env'
import type { ChatProvider } from '../provider/types'
import { startRepl as defaultStartRepl } from '../repl/startRepl'

export type StartRepl = (container: AppContainer) => Promise<void> | void

export type BootstrapOptions = {
  cwd?: string
  env?: AppEnv
  provider?: ChatProvider
  startRepl?: StartRepl
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<AppContainer> {
  const config = loadAppConfig(options.env)
  const container = createContainer({
    cwd: options.cwd ?? process.cwd(),
    config,
    provider: options.provider,
  })

  await (options.startRepl ?? defaultStartRepl)(container)

  return container
}
