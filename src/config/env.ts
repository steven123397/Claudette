export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_QWEN_BASE_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const DEFAULT_QWEN_MODEL = 'qwen3.5-plus'

import { resolveModel } from './models'

export type AppEnv = Record<string, string | undefined>

export type AppConfig = {
  apiBaseUrl: string
  apiKey?: string
  model: string
}

export function loadAppConfig(env: AppEnv = process.env): AppConfig {
  const openaiApiKey = readEnvValue(env, 'OPENAI_API_KEY')
  const qwenApiKey = firstDefinedEnvValue(env, [
    'DASHSCOPE_API_KEY',
    'QWEN_API_KEY',
  ])
  const openaiBaseUrl = readEnvValue(env, 'OPENAI_BASE_URL')
  const qwenBaseUrl = firstDefinedEnvValue(env, [
    'DASHSCOPE_BASE_URL',
    'QWEN_BASE_URL',
  ])
  const claudetteModel = readEnvValue(env, 'CLAUDETTE_MODEL')
  const qwenModel = firstDefinedEnvValue(env, [
    'DASHSCOPE_MODEL',
    'QWEN_MODEL',
  ])
  const useQwenPreset =
    !openaiApiKey &&
    (qwenApiKey !== undefined || qwenBaseUrl !== undefined || qwenModel !== undefined)

  return {
    apiBaseUrl:
      openaiBaseUrl ??
      (useQwenPreset ? qwenBaseUrl ?? DEFAULT_QWEN_BASE_URL : DEFAULT_OPENAI_BASE_URL),
    apiKey: openaiApiKey ?? qwenApiKey,
    model: resolveModel(
      claudetteModel ??
        (useQwenPreset ? qwenModel ?? DEFAULT_QWEN_MODEL : undefined),
    ),
  }
}

function firstDefinedEnvValue(
  env: AppEnv,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = readEnvValue(env, key)

    if (value !== undefined) {
      return value
    }
  }

  return undefined
}

function readEnvValue(env: AppEnv, key: string): string | undefined {
  const value = env[key]?.trim()

  return value === '' ? undefined : value
}
