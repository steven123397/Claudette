import { describe, expect, it } from 'vitest'

import {
  DEFAULT_QWEN_BASE_URL,
  DEFAULT_QWEN_MODEL,
  loadAppConfig,
} from '../../src/config/env'
import { DEFAULT_MODEL } from '../../src/config/models'

describe('loadAppConfig', () => {
  it('uses DashScope compatibility defaults when DASHSCOPE_API_KEY is provided', () => {
    const config = loadAppConfig({
      DASHSCOPE_API_KEY: 'dashscope-key',
    })

    expect(config).toEqual({
      apiBaseUrl: DEFAULT_QWEN_BASE_URL,
      apiKey: 'dashscope-key',
      model: DEFAULT_QWEN_MODEL,
    })
  })

  it('supports QWEN_* aliases for explicit base URL and model', () => {
    const config = loadAppConfig({
      QWEN_API_KEY: 'qwen-key',
      QWEN_BASE_URL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      QWEN_MODEL: 'qwen3-coder-plus',
    })

    expect(config).toEqual({
      apiBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      apiKey: 'qwen-key',
      model: 'qwen3-coder-plus',
    })
  })

  it('keeps explicit OPENAI_* settings ahead of qwen aliases', () => {
    const config = loadAppConfig({
      OPENAI_API_KEY: 'openai-key',
      OPENAI_BASE_URL: 'https://example.com/v1',
      DASHSCOPE_API_KEY: 'dashscope-key',
      QWEN_MODEL: 'qwen3-coder-plus',
    })

    expect(config).toEqual({
      apiBaseUrl: 'https://example.com/v1',
      apiKey: 'openai-key',
      model: DEFAULT_MODEL,
    })
  })
})
