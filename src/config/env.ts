export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'

import { resolveModel } from './models'

export type AppEnv = Record<string, string | undefined>

export type AppConfig = {
  apiBaseUrl: string
  apiKey?: string
  model: string
}

export function loadAppConfig(env: AppEnv = process.env): AppConfig {
  return {
    apiBaseUrl: env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL,
    apiKey: env.OPENAI_API_KEY,
    model: resolveModel(env.CLAUDETTE_MODEL),
  }
}
