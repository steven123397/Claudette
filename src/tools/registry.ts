import { globTool } from './implementations/globTool'
import { grepTool } from './implementations/grepTool'
import { patchTool } from './implementations/patchTool'
import { readTool } from './implementations/readTool'
import { writeTool } from './implementations/writeTool'
import type { AnyToolDefinition, ToolRegistry } from './types'

const toolDefinitions: readonly AnyToolDefinition[] = Object.freeze([
  readTool,
  globTool,
  grepTool,
  writeTool,
  patchTool,
])

export function createToolRegistry(): ToolRegistry {
  const items = [...toolDefinitions]
  const byName = new Map(items.map(tool => [tool.name, tool] as const))

  return {
    items,
    get(name: string) {
      return byName.get(name)
    },
    list() {
      return items
    },
  }
}
