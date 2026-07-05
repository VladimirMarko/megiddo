import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import type { AuthProviderAdapter } from './identity-use-cases'

export interface EmbeddedDevelopmentAuthProviderAdapterOptions {
  databasePath: string
}

export interface EmbeddedDevelopmentAuthProviderAdapter extends AuthProviderAdapter {
  close(): void
}

interface DevelopmentUserRow {
  id: string
}

export const createEmbeddedDevelopmentAuthProviderAdapter = ({
  databasePath,
}: EmbeddedDevelopmentAuthProviderAdapterOptions): EmbeddedDevelopmentAuthProviderAdapter => {
  mkdirSync(dirname(databasePath), { recursive: true })

  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')
  const database = new DatabaseSync(databasePath)

  database.exec(`
    CREATE TABLE IF NOT EXISTS development_users (
      id TEXT PRIMARY KEY
    );
  `)

  const findUser = database.prepare(`
    SELECT id
    FROM development_users
    WHERE id = ?
  `)
  const insertUser = database.prepare(`
    INSERT INTO development_users (id)
    VALUES (?)
  `)

  return {
    async resolveDevelopmentUser(subject = 'dev:viewer') {
      const existing = findUser.get(subject) as DevelopmentUserRow | undefined

      if (existing) {
        return { id: existing.id }
      }

      insertUser.run(subject)

      return { id: subject }
    },
    close() {
      database.close()
    },
  }
}
