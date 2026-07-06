import type { FrontendAuthCapabilities } from '../api/frontend-api-adapter'
import { Title } from './title'

type AuthSessionPromptProps = {
  capabilities: FrontendAuthCapabilities | undefined
  dummyAuthLoginShortcutEnabled: boolean
  message: string
  messageRole?: 'alert'
  onDummySignIn: (principalId: string) => void
}

export function AuthSessionPrompt({
  capabilities,
  dummyAuthLoginShortcutEnabled,
  message,
  messageRole,
  onDummySignIn,
}: AuthSessionPromptProps) {
  const dummyAccounts = dummyAuthLoginShortcutEnabled ? (capabilities?.dummy?.accounts ?? []) : []

  return (
    <main className="todo-shell auth-shell">
      <div>
        <Title />
        <p className="auth-eyebrow">Local workspace</p>
      </div>
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-copy">
          <h2 id="auth-heading">Choose a workspace identity</h2>
          <p role={messageRole}>{message}</p>
        </div>
        {dummyAccounts.length > 0 ? (
          <fieldset className="auth-account-list">
            <legend className="sr-only">Dummy sign-in shortcuts</legend>
            {dummyAccounts.map(account => (
              <button key={account.principalId} onClick={() => onDummySignIn(account.principalId)} type="button">
                <span>{account.displayName}</span>
                <small>Continue as {account.displayName}</small>
              </button>
            ))}
          </fieldset>
        ) : (
          <p className="todo-message">No sign-in shortcuts are enabled for this workspace.</p>
        )}
      </section>
    </main>
  )
}
