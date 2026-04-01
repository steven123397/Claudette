export type ModelDefinition = {
  id: string
  label: string
}

const modelCatalog: readonly ModelDefinition[] = Object.freeze([
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
  },
])

export const DEFAULT_MODEL = modelCatalog[0].id

export function listModels(): readonly ModelDefinition[] {
  return modelCatalog
}

export function findModel(modelId: string): ModelDefinition | undefined {
  return modelCatalog.find(model => model.id === modelId)
}

export function resolveModel(modelId?: string | null): string {
  const normalized = modelId?.trim()

  if (!normalized) {
    return DEFAULT_MODEL
  }

  return normalized
}
