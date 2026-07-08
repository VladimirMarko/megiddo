import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { getMigrations } from 'better-auth/db/migration'
import type { AuthProviderAdapter } from './identity-use-cases'
import { PasswordAuthError } from './identity-use-cases'

export interface EmbeddedBetterAuthProviderAdapterOptions {
  baseURL?: string
  databasePath?: string
  secret?: string
}

export interface EmbeddedBetterAuthProviderAdapter extends AuthProviderAdapter {
  close(): void
}

type BetterAuthUser = {
  id: string
  name: string
}

const betterAuthSessionCookieName = 'better-auth.session_token'

const sessionCookieValue = (response: Response) => {
  const setCookie = response.headers.get('set-cookie')
  const sessionCookie = setCookie
    ?.split(',')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${betterAuthSessionCookieName}=`))

  if (!sessionCookie) {
    throw new PasswordAuthError('Better Auth did not issue a browser session')
  }

  const value = sessionCookie.slice(`${betterAuthSessionCookieName}=`.length).split(';')[0]

  if (!value) {
    throw new PasswordAuthError('Better Auth issued an empty browser session')
  }

  return value
}

const sessionHeaders = (sessionId: string) => new Headers({ cookie: `${betterAuthSessionCookieName}=${sessionId}` })

const toUserReference = (user: BetterAuthUser) => ({ displayName: user.name, id: user.id })

const toPasswordAuthError = (error: unknown) => {
  if (error instanceof APIError) {
    return new PasswordAuthError(error.message)
  }

  return error
}

export const createEmbeddedBetterAuthProviderAdapter = ({
  baseURL = 'http://localhost:3002',
  databasePath = ':memory:',
  secret,
}: EmbeddedBetterAuthProviderAdapterOptions = {}): EmbeddedBetterAuthProviderAdapter => {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true })
  }

  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')
  const database = new DatabaseSync(databasePath)
  const options = {
    baseURL,
    database,
    emailAndPassword: { enabled: true },
    secret,
  }
  const auth = betterAuth(options)
  let migration: Promise<void> | undefined
  const ensureMigrated = () => {
    migration ??= getMigrations(options).then(({ runMigrations }) => runMigrations())

    return migration
  }
  const issueSession = async (response: Response) => {
    const json = (await response.json()) as { user: BetterAuthUser }

    return {
      browserSession: { id: sessionCookieValue(response) },
      user: toUserReference(json.user),
    }
  }

  return {
    supportsPasswordAuth: true,
    async createBrowserSession() {
      throw new PasswordAuthError('Direct browser session creation is not available for Better Auth')
    },
    async createDummyPrincipal() {
      throw new PasswordAuthError('Dummy sign-up is not available for Better Auth')
    },
    async deleteBrowserSession(sessionId) {
      await ensureMigrated()
      await auth.api.signOut({ headers: sessionHeaders(sessionId) })
    },
    async listDummyAccounts() {
      return []
    },
    async resolveBrowserSession(sessionId) {
      await ensureMigrated()
      const session = await auth.api.getSession({ headers: sessionHeaders(sessionId) })

      return session ? toUserReference(session.user) : undefined
    },
    async resolveDummyPrincipal() {
      return undefined
    },
    async resolveDevelopmentUser(subject = 'dev:viewer') {
      return { id: subject }
    },
    async signInWithPassword(input) {
      await ensureMigrated()

      try {
        return await issueSession(
          await auth.api.signInEmail({
            asResponse: true,
            body: { email: input.email, password: input.password },
          }),
        )
      } catch (error) {
        throw toPasswordAuthError(error)
      }
    },
    async signUpWithPassword(input) {
      await ensureMigrated()

      try {
        return await issueSession(
          await auth.api.signUpEmail({
            asResponse: true,
            body: { email: input.email, name: input.displayName, password: input.password },
          }),
        )
      } catch (error) {
        throw toPasswordAuthError(error)
      }
    },
    close() {
      database.close()
    },
  }
}
