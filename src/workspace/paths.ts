import { isAbsolute, resolve } from 'node:path'

export function normalizeWorkspaceRoot(root: string): string {
  return resolve(root)
}

export function resolveWorkspacePath(root: string, target: string): string {
  const normalizedRoot = normalizeWorkspaceRoot(root)

  if (isAbsolute(target)) {
    return resolve(target)
  }

  return resolve(normalizedRoot, target)
}
