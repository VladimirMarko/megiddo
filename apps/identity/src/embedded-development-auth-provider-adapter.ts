import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import type { DummyAuthAccountResourceV1 } from '@megiddo/contracts'
import type { AuthProviderAdapter } from './identity-use-cases'
import { dummyDemoAccounts, PrincipalCollisionError } from './identity-use-cases'

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

interface TableColumnRow {
  name: string
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

    CREATE TABLE IF NOT EXISTS browser_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL
    );
  `)

  const developmentUserColumns = database.prepare('PRAGMA table_info(development_users);').all() as TableColumnRow[]
  const hasDisplayNameColumn = developmentUserColumns.some(column => column.name === 'display_name')

  if (!hasDisplayNameColumn) {
    database.exec('ALTER TABLE development_users ADD COLUMN display_name TEXT;')
  }

  const demoAccountIds = dummyDemoAccounts.map(account => account.principalId)
  const demoAccountPlaceholders = demoAccountIds.map(() => '?').join(', ')
  const demoAccountOrder = demoAccountIds.map((_, index) => `WHEN ? THEN ${index}`).join(' ')

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
    WHERE id IN (${demoAccountPlaceholders})
    ORDER BY CASE id ${demoAccountOrder} END
  `)
  const insertDemoUser = database.prepare(`
    INSERT OR IGNORE INTO development_users (id, display_name)
    VALUES (?, ?)
  `)
  const listUsers = database.prepare(`
    SELECT id, display_name
    FROM development_users
  `)
  const insertBrowserSession = database.prepare(`
    INSERT INTO browser_sessions (id, user_id)
    VALUES (?, ?)
  `)
  const findBrowserSession = database.prepare(`
    SELECT user_id
    FROM browser_sessions
    WHERE id = ?
  `)
  const deleteBrowserSession = database.prepare(`
    DELETE FROM browser_sessions
    WHERE id = ?
  `)

  if (seedDemoAccounts) {
    for (const account of dummyDemoAccounts) {
      insertDemoUser.run(account.principalId, account.displayName)
    }
  }

  const toUserReference = (row: DevelopmentUserRow) =>
    row.display_name ? { displayName: row.display_name, id: row.id } : { id: row.id }

  return {
    async createBrowserSession(user) {
      const id = randomUUID()
      insertBrowserSession.run(id, user.id)

      return { id }
    },
    async createDummyPrincipal(account) {
      const existing = findUser.get(account.principalId) as DevelopmentUserRow | undefined

      if (existing) {
        throw new PrincipalCollisionError(account.principalId)
      }

      insertUser.run(account.principalId, account.displayName)

      return { displayName: account.displayName, id: account.principalId }
    },
    async deleteBrowserSession(sessionId) {
      deleteBrowserSession.run(sessionId)
    },
    async listDummyAccounts() {
      const demoRows = seedDemoAccounts
        ? (listDemoUsers.all(...demoAccountIds, ...demoAccountIds) as DevelopmentUserRow[])
        : []
      const demoIds = new Set(demoRows.map(row => row.id))
      const createdRows = (listUsers.all() as DevelopmentUserRow[])
        .filter(row => row.id.startsWith('dummy:') && !demoIds.has(row.id))
        .sort((left, right) => left.id.localeCompare(right.id))

      return [...demoRows, ...createdRows].map(
        (row): DummyAuthAccountResourceV1 => ({ displayName: row.display_name ?? row.id, principalId: row.id }),
      )
    },
    async resolveBrowserSession(sessionId) {
      const session = findBrowserSession.get(sessionId) as { user_id: string } | undefined

      if (!session) {
        return undefined
      }

      const existing = findUser.get(session.user_id) as DevelopmentUserRow | undefined

      return existing ? toUserReference(existing) : undefined
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
