import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface RawEnvAccessViolation {
  line: number
  path: string
}

export interface RawEnvAccessResult {
  message: string
  violations: RawEnvAccessViolation[]
}

interface RawEnvAccessOptions {
  paths?: string[]
  rootDir: string
}

const ignoredDirectories = new Set(['.git', '.sandcastle', '.turbo', 'coverage', 'dist', 'node_modules'])
const rawEnvAccessPattern = /\bprocess\.env\b|\bimport\.meta\.env\b/g

const allowedExactPaths = new Set([
  // Process entrypoints validate concrete runtime env and construct real infrastructure.
  'apps/api/src/server.ts',
  'apps/identity/src/server.ts',
  'apps/todo/src/server.ts',
  // Vite exposes only prefixed frontend env values; main.ts passes them into the frontend env contract.
  'apps/frontend/src/main.ts',
  // Local telemetry is best-effort process instrumentation configured at service startup.
  'packages/platform/src/local-telemetry.ts',
  // Integration harnesses may merge the parent process env when spawning child processes.
  'tests/integration/local-development-workflow.test.ts',
])

const allowedPathPrefixes = [
  // Env Contracts are the owning validation seam for runtime env values.
  'apps/api/src/env-contract.ts',
  'apps/identity/src/env-contract.ts',
  'apps/todo/src/env-contract.ts',
  'apps/frontend/src/env.ts',
  // Tooling scripts are process seams rather than application runtime modules.
  'scripts/',
]

const toRepoPath = (path: string) => path.split(sep).join('/')
const isSourceFile = (filePath: string) =>
  filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.mts') || filePath.endsWith('.cts')
const isPathInside = (path: string, parentPath: string) => path === parentPath || path.startsWith(`${parentPath}/`)
const lineForIndex = (source: string, index: number) => source.slice(0, index).split('\n').length
const isMissingDirectoryError = (caught: unknown): caught is NodeJS.ErrnoException =>
  caught instanceof Error && 'code' in caught && caught.code === 'ENOENT'

const isAllowedRawEnvPath = (repoPath: string) =>
  allowedExactPaths.has(repoPath) || allowedPathPrefixes.some(path => repoPath === path || repoPath.startsWith(path))

const listSourceFiles = async (dir: string): Promise<string[]> => {
  let entries: Awaited<ReturnType<typeof readdir>>

  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (caught) {
    if (isMissingDirectoryError(caught)) {
      return []
    }

    throw caught
  }

  const files = await Promise.all(
    entries.map(entry => {
      const filePath = join(dir, entry.name)

      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? Promise.resolve([]) : listSourceFiles(filePath)
      }

      return Promise.resolve(isSourceFile(filePath) ? [filePath] : [])
    }),
  )

  return files.flat()
}

const listRequestedSourceFiles = async (rootDir: string, paths: string[]): Promise<string[]> => {
  if (paths.length === 0) {
    return listSourceFiles(rootDir)
  }

  const rootPath = toRepoPath(resolve(rootDir))
  const files = await Promise.all(
    paths.map(async path => {
      const absolutePath = resolve(rootDir, path)
      const repoPath = toRepoPath(absolutePath)

      if (!isPathInside(repoPath, rootPath)) {
        return []
      }

      let pathStat: Awaited<ReturnType<typeof stat>>

      try {
        pathStat = await stat(absolutePath)
      } catch (caught) {
        if (isMissingDirectoryError(caught)) {
          return []
        }

        throw caught
      }

      if (pathStat.isDirectory()) {
        return listSourceFiles(absolutePath)
      }

      return isSourceFile(absolutePath) ? [absolutePath] : []
    }),
  )

  return files.flat()
}

export const checkRawEnvAccess = async ({ paths = [], rootDir }: RawEnvAccessOptions): Promise<RawEnvAccessResult> => {
  const files = await listRequestedSourceFiles(rootDir, paths)
  const violations: RawEnvAccessViolation[] = []

  for (const file of files) {
    const repoPath = toRepoPath(relative(rootDir, file))
    const source = await readFile(file, 'utf8')

    for (const match of source.matchAll(rawEnvAccessPattern)) {
      if (!isAllowedRawEnvPath(repoPath)) {
        violations.push({ line: lineForIndex(source, match.index), path: repoPath })
      }
    }
  }

  const details = violations.map(violation => `${violation.path}:${violation.line}`).join('\n')
  const message = [
    'Raw env access rule: application runtime modules must not access raw runtime env directly.',
    'Use the owning env-contract module, an approved process entrypoint, the Vite-safe frontend env seam, or a tooling seam instead.',
    details,
  ]
    .filter(Boolean)
    .join('\n')

  return { message, violations }
}

const runCli = async () => {
  const result = await checkRawEnvAccess({ paths: process.argv.slice(2), rootDir: process.cwd() })

  if (result.violations.length > 0) {
    console.error(result.message)
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runCli()
}
