import { isAbsolute, relative } from 'node:path'

import { normalizeWorkspaceRoot, resolveWorkspacePath } from './paths'

export function assertPathInsideWorkspace(root: string, target: string): string {
  const normalizedRoot = normalizeWorkspaceRoot(root)
  const resolvedPath = resolveWorkspacePath(normalizedRoot, target)
  const relativePath = relative(normalizedRoot, resolvedPath)

  if (relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))) {
    return resolvedPath
  }

  throw new Error(`Path is outside workspace: ${target}`)
}
