import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

export type ProjectCompassSection = {
  title: string
  lines: string[]
}

export type ProjectCompassSummary = {
  sections: ProjectCompassSection[]
}

type PackageJsonSnapshot = {
  name?: string
  version?: string
  scripts: Record<string, string>
  dependencies: string[]
  devDependencies: string[]
}

const ENTRY_CANDIDATE_ORDER = [
  'src/cli/entry.ts',
  'src/index.ts',
  'src/main.ts',
  'src/app/bootstrap.ts',
] as const

export async function analyzeProjectCompass(
  workspaceRoot: string,
): Promise<ProjectCompassSummary> {
  const packageJson = await loadPackageJsonSnapshot(workspaceRoot)
  const srcFiles = await listFiles(workspaceRoot, 'src')
  const srcEntries = await listTopLevelEntries(workspaceRoot, 'src')
  const testFiles = await listFiles(workspaceRoot, 'tests')
  const docFiles = await listFiles(workspaceRoot, 'docs')
  const toolFiles = await listFiles(workspaceRoot, join('src', 'tools', 'implementations'))
  const entryFiles = detectEntryFiles(srcFiles)

  return {
    sections: [
      {
        title: '项目定位',
        lines: buildPositioningLines(workspaceRoot, packageJson, srcFiles, docFiles),
      },
      {
        title: '入口与模块',
        lines: buildEntryAndModuleLines(srcEntries, srcFiles, entryFiles),
      },
      {
        title: '工具与测试',
        lines: buildToolingAndTestLines(packageJson, toolFiles, testFiles),
      },
      {
        title: '当前缺口',
        lines: buildGapLines(packageJson, srcFiles, testFiles, docFiles, entryFiles),
      },
    ],
  }
}

function buildPositioningLines(
  workspaceRoot: string,
  packageJson: PackageJsonSnapshot | null,
  srcFiles: readonly string[],
  docFiles: readonly string[],
): string[] {
  const packageLine = packageJson
    ? `Package: ${packageJson.name ?? basename(workspaceRoot)}@${packageJson.version ?? '0.0.0'}`
    : 'Package: No package.json found.'

  return [
    `Workspace: ${basename(workspaceRoot)}`,
    packageLine,
    `Source files: ${srcFiles.length}`,
    `Docs files: ${docFiles.length}`,
  ]
}

function buildEntryAndModuleLines(
  srcEntries: readonly string[],
  srcFiles: readonly string[],
  entryFiles: readonly string[],
): string[] {
  if (srcFiles.length === 0) {
    return ['No src/ directory detected.']
  }

  return [
    `Entry candidates: ${formatList(entryFiles, 'none detected')}`,
    `Top-level modules: ${formatList(srcEntries, 'none detected')}`,
    `Sample source files: ${formatList(srcFiles.slice(0, 5), 'none detected')}`,
  ]
}

function buildToolingAndTestLines(
  packageJson: PackageJsonSnapshot | null,
  toolFiles: readonly string[],
  testFiles: readonly string[],
): string[] {
  const scripts = packageJson ? Object.keys(packageJson.scripts).sort() : []
  const tooling = packageJson
    ? [...packageJson.dependencies, ...packageJson.devDependencies]
        .sort()
        .slice(0, 6)
    : []

  return [
    `Scripts: ${formatList(scripts, packageJson ? 'none' : 'package.json unavailable')}`,
    `Dependencies: ${formatList(tooling, packageJson ? 'none' : 'package.json unavailable')}`,
    `Tool implementations: ${formatList(normalizeToolNames(toolFiles), 'none detected')}`,
    testFiles.length === 0
      ? 'No tests/ directory detected.'
      : `Test files (${testFiles.length}): ${formatList(testFiles.slice(0, 5), 'none detected')}`,
  ]
}

function buildGapLines(
  packageJson: PackageJsonSnapshot | null,
  srcFiles: readonly string[],
  testFiles: readonly string[],
  docFiles: readonly string[],
  entryFiles: readonly string[],
): string[] {
  const gaps: string[] = []

  if (!packageJson) {
    gaps.push('No package.json found.')
  }

  if (srcFiles.length === 0) {
    gaps.push('No src/ directory detected.')
  }

  if (testFiles.length === 0) {
    gaps.push('No tests/ directory detected.')
  }

  if (docFiles.length === 0) {
    gaps.push('No docs/ directory detected.')
  }

  if (packageJson && Object.keys(packageJson.scripts).length === 0) {
    gaps.push('package.json has no scripts field.')
  }

  if (srcFiles.length > 0 && entryFiles.length === 0) {
    gaps.push('No obvious entry file detected under src/.')
  }

  return gaps.length > 0 ? gaps : ['No obvious gaps from basic scan.']
}

async function loadPackageJsonSnapshot(
  workspaceRoot: string,
): Promise<PackageJsonSnapshot | null> {
  try {
    const raw = await readFile(join(workspaceRoot, 'package.json'), 'utf8')
    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }

    const packageJson = parsed as Record<string, unknown>

    return {
      name: typeof packageJson.name === 'string' ? packageJson.name : undefined,
      version: typeof packageJson.version === 'string' ? packageJson.version : undefined,
      scripts: readStringRecord(packageJson.scripts),
      dependencies: Object.keys(readStringRecord(packageJson.dependencies)),
      devDependencies: Object.keys(readStringRecord(packageJson.devDependencies)),
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

async function listTopLevelEntries(
  workspaceRoot: string,
  relativeDir: string,
): Promise<string[]> {
  try {
    const entries = await readdir(join(workspaceRoot, relativeDir), {
      withFileTypes: true,
    })

    return entries.map(entry => entry.name).sort()
  } catch (error) {
    if (isNotFoundError(error)) {
      return []
    }

    throw error
  }
}

async function listFiles(workspaceRoot: string, relativeDir: string): Promise<string[]> {
  const startPath = join(workspaceRoot, relativeDir)

  try {
    const entries = await readdir(startPath, { withFileTypes: true })
    const files: string[] = []

    for (const entry of entries) {
      const childRelativePath = join(relativeDir, entry.name)

      if (entry.isDirectory()) {
        files.push(...(await listFiles(workspaceRoot, childRelativePath)))
        continue
      }

      if (entry.isFile()) {
        files.push(childRelativePath.replaceAll('\\', '/'))
      }
    }

    return files.sort()
  } catch (error) {
    if (isNotFoundError(error)) {
      return []
    }

    throw error
  }
}

function detectEntryFiles(srcFiles: readonly string[]): string[] {
  const preferredEntries = ENTRY_CANDIDATE_ORDER.filter(candidate =>
    srcFiles.includes(candidate),
  )

  if (preferredEntries.length > 0) {
    return [...preferredEntries]
  }

  return srcFiles.filter(filePath =>
    /(?:^|\/)(?:entry|main|index)\.[^.]+$/.test(filePath),
  )
}

function normalizeToolNames(toolFiles: readonly string[]): string[] {
  return toolFiles
    .map(filePath => basename(filePath).replace(/Tool\.[^.]+$/, ''))
    .sort()
}

function formatList(items: readonly string[], fallback: string): string {
  if (items.length === 0) {
    return fallback
  }

  return items.join(', ')
}

function readStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => {
      const [, itemValue] = entry
      return typeof itemValue === 'string'
    }),
  )
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
