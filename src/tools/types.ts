export type ToolSchemaProperty = {
  type: 'boolean' | 'number' | 'string'
  description?: string
}

export type ToolSchema = {
  type: 'object'
  properties: Record<string, ToolSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export type ToolContext = {
  workspaceRoot: string
}

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: string
  description: string
  schema: ToolSchema
  isReadOnly: boolean
  isConcurrencySafe: boolean
  validate(input: unknown): TInput
  execute(input: TInput, context: ToolContext): Promise<TOutput>
}

export type AnyToolDefinition = ToolDefinition<any, any>

export type ToolRegistry = {
  items: readonly AnyToolDefinition[]
  get(name: string): AnyToolDefinition | undefined
  list(): readonly AnyToolDefinition[]
}

export type ToolCall = {
  name: string
  input: unknown
}
