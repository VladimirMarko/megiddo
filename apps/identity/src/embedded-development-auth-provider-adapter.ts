import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import type { DummyAuthAccountResourceV1 } from '@megiddo/contracts'
import type { AuthProviderAdapter } from './identity-use-cases'
import { dummyDemoAccounts } from './identity-use-cases'

export interface EmbeddedDevelopmentAuthProviderAdapterOptions {
  databasePath: string
  seedDemoAccounts?: boolean
}

export interface EmbeddedDevelopmentAuthProviderAdapter extends AuthProviderAdapter {
  close(): void
}

interface DevelopmentUserRow {
  display_name: string | null
  id: string
}

export const createEmbeddedDevelopmentAuthProviderAdapter = ({
  databasePath,
  seedDemoAccounts = false,
}: EmbeddedDevelopmentAuthProviderAdapterOptions): EmbeddedDevelopmentAuthProviderAdapter => {
  mkdirSync(dirname(databasePath), { recursive: true })

  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')
  const database = new DatabaseSync(databasePath)

  database.exec(`
    CREATE TABLE IF NOT EXISTS development_users (
      id TEXT PRIMARY KEY,
      display_name TEXT
    );
  `)

  try {
    database.exec('ALTER TABLE development_users ADD COLUMN display_name TEXT;')
  } catch {
    // Existing databases created after this migration already have the column.
  }

  const findUser = database.prepare(`
    SELECT id, display_name
    FROM development_users
    WHERE id = ?
  `)
  const insertUser = database.prepare(`
    INSERT INTO development_users (id, display_name)
    VALUES (?, ?)
  `)
  const listDemoUsers = database.prepare(`
    SELECT id, display_name
    FROM development_users
    WHERE id IN (${dummyDemoAccounts.map(() => '?').join(', ')})
    ORDER BY CASE id ${dummyDemoAccounts.map((account, index) => `WHEN '${account.principalId}' THEN ${index}`).join(' ')} END
  `)
  const insertDemoUser = database.prepare(`
    INSERT OR IGNORE INTO development_users (id, display_name)
    VALUES (?, ?)
  `)

  if (seedDemoAccounts) {
    for (const account of dummyDemoAccounts) {
      insertDemoUser.run(account.principalId, account.displayName)
    }
  }

  const toUserReference = (row: DevelopmentUserRow) =>
    row.display_name ? { displayName: row.display_name, id: row.id } : { id: row.id }

  return {
    async listDummyAccounts() {
      if (!seedDemoAccounts) {
        return []
      }

      return (listDemoUsers.all(...dummyDemoAccounts.map(account => account.principalId)) as DevelopmentUserRow[]).map(
        (row): DummyAuthAccountResourceV1 => ({ displayName: row.display_name ?? row.id, principalId: row.id }),
      )
    },
    async resolveDummyPrincipal(principalId) {
      const existing = findUser.get(principalId) as DevelopmentUserRow | undefined

      return existing ? toUserReference(existing) : undefined
    },
    async resolveDevelopmentUser(subject = 'dev:viewer') {
      const existing = findUser.get(subject) as DevelopmentUserRow | undefined

      if (existing) {
        return toUserReference(existing)
      }

      insertUser.run(subject, null)

      return { id: subject }
    },
    close() {
      database.close()
    },
  }
}
