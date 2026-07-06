import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface FrontendContractBoundaryViolation {
  path: string
  line: number
}

export interface FrontendContractBoundaryResult {
  message: string
  violations: FrontendContractBoundaryViolation[]
}

interface FrontendContractBoundaryOptions {
  rootDir: string
}

const frontendSourcePath = 'apps/frontend/src'
const allowedAdapterPath = 'apps/frontend/src/api/'
const forbiddenImportPattern =
  /(^|\n)\s*import\s+(?:type\s+)?(?:\{[\s\S]*?\}|\*\s+as\s+\w+|\w+(?:\s*,\s*\{[\s\S]*?\})?)\s+from\s+['"](?:@megiddo\/contracts|@orpc\/client(?:\/fetch)?)['"]/g

const toRepoPath = (path: string) => path.split(sep).join('/')

const isMissingDirectoryError = (caught: unknown): caught is NodeJS.ErrnoException =>
  caught instanceof Error && 'code' in caught && caught.code === 'ENOENT'

const isSourceFile = (filePath: string) => filePath.endsWith('.ts') || filePath.endsWith('.tsx')

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
        return listSourceFiles(filePath)
      }

      return Promise.resolve(isSourceFile(filePath) ? [filePath] : [])
    }),
  )

  return files.flat()
}

const lineForIndex = (source: string, index: number) => source.slice(0, index).split('\n').length

export const checkFrontendContractBoundaries = async ({
  rootDir,
}: FrontendContractBoundaryOptions): Promise<FrontendContractBoundaryResult> => {
  const sourceDir = join(rootDir, frontendSourcePath)
  const files = await listSourceFiles(sourceDir)
  const violations: FrontendContractBoundaryViolation[] = []

  for (const file of files) {
    const repoPath = toRepoPath(relative(rootDir, file))

    if (repoPath.startsWith(allowedAdapterPath)) {
      continue
    }

    const source = await readFile(file, 'utf8')

    for (const match of source.matchAll(forbiddenImportPattern)) {
      const importIndex = match.index + match[0].indexOf('import')
      violations.push({ path: repoPath, line: lineForIndex(source, importIndex) })
    }
  }

  const details = violations.map(violation => `${violation.path}:${violation.line}`).join('\n')
  const message = [
    'Frontend API Adapter seam rule: frontend UI files must not import contract Resource types, raw contract details, or raw oRPC clients directly.',
    'Move contract-to-UI mapping into apps/frontend/src/api/frontend-api-adapter.ts and depend on frontend-owned models instead.',
    details,
  ]
    .filter(Boolean)
    .join('\n')

  return { message, violations }
}

const runCli = async () => {
  const result = await checkFrontendContractBoundaries({ rootDir: process.cwd() })

  if (result.violations.length > 0) {
    console.error(result.message)
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runCli()
}
