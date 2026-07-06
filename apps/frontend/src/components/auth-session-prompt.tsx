import { useState } from 'react'
import type { FrontendAuthCapabilities } from '../api/frontend-api-adapter'
import { Title } from './title'

type AuthSessionPromptProps = {
  capabilities: FrontendAuthCapabilities | undefined
  dummyAuthLoginShortcutEnabled: boolean
  message: string
  messageRole?: 'alert'
  onDummySignIn: (principalId: string) => void
  onDummySignUp: (displayName: string) => void
}

export function AuthSessionPrompt({
  capabilities,
  dummyAuthLoginShortcutEnabled,
  message,
  messageRole,
  onDummySignIn,
  onDummySignUp,
}: AuthSessionPromptProps) {
  const dummyAccounts = dummyAuthLoginShortcutEnabled ? (capabilities?.dummy?.accounts ?? []) : []
  const dummySignUpAvailable = capabilities?.signUpMethods.includes('dummy') ?? false
  const [displayName, setDisplayName] = useState('')

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
        {dummySignUpAvailable ? (
          <form
            className="auth-sign-up-form"
            onSubmit={event => {
              event.preventDefault()
              const FormDataConstructor = event.currentTarget.ownerDocument.defaultView?.FormData ?? FormData
              const formData = new FormDataConstructor(event.currentTarget)
              const submittedDisplayName = String(formData.get('displayName') ?? '')
              onDummySignUp(submittedDisplayName)
            }}
          >
            <label>
              Create a local identity
              <input
                aria-label="Display name"
                name="displayName"
                onChange={event => setDisplayName(event.currentTarget.value)}
                placeholder="Charlie Example"
                type="text"
                value={displayName}
              />
            </label>
            <button disabled={displayName.trim().length === 0} type="submit">
              Sign up and continue
            </button>
          </form>
        ) : null}
      </section>
    </main>
  )
}
