import { type FormEvent, useState } from 'react'
import type { FrontendAuthCapabilities } from '../api/frontend-api-adapter'
import { Title } from './title'

type AuthSessionPromptProps = {
  capabilities: FrontendAuthCapabilities | undefined
  dummyAuthLoginShortcutEnabled: boolean
  message: string
  messageRole?: 'alert'
  onDummySignIn: (principalId: string) => void
  onDummySignUp: (displayName: string) => void
  onPasswordSignIn: (input: PasswordSignInInput) => void
  onPasswordSignUp: (input: PasswordSignUpInput) => void
}

type PasswordSignInInput = { email: string; password: string }
type PasswordSignUpInput = PasswordSignInInput & { displayName: string }

export function AuthSessionPrompt({
  capabilities,
  dummyAuthLoginShortcutEnabled,
  message,
  messageRole,
  onDummySignIn,
  onDummySignUp,
  onPasswordSignIn,
  onPasswordSignUp,
}: AuthSessionPromptProps) {
  const dummyAccounts = dummyAuthLoginShortcutEnabled ? (capabilities?.dummy?.accounts ?? []) : []
  const dummySignUpAvailable = capabilities?.signUpMethods.includes('dummy') ?? false
  const passwordSignInAvailable = capabilities?.signInMethods.includes('password') ?? false
  const passwordSignUpAvailable = capabilities?.signUpMethods.includes('password') ?? false
  const [displayName, setDisplayName] = useState('')
  const [passwordEmail, setPasswordEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordDisplayName, setPasswordDisplayName] = useState('')
  const [newPasswordEmail, setNewPasswordEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const passwordSignInDisabled = passwordEmail.trim().length === 0 || password.length < 8
  const passwordSignUpDisabled =
    passwordDisplayName.trim().length === 0 || newPasswordEmail.trim().length === 0 || newPassword.length < 8
  const showNoSignInOptionsMessage = dummyAccounts.length === 0 && !passwordSignInAvailable

  const submitPasswordSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onPasswordSignIn({ email: passwordEmail, password })
  }

  const submitPasswordSignUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onPasswordSignUp({ displayName: passwordDisplayName, email: newPasswordEmail, password: newPassword })
  }

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
        {passwordSignInAvailable ? (
          <form className="auth-sign-up-form password-auth-form" onSubmit={submitPasswordSignIn}>
            <label>
              Email
              <input
                autoComplete="email"
                name="email"
                onChange={event => setPasswordEmail(event.currentTarget.value)}
                placeholder="you@example.com"
                type="email"
                value={passwordEmail}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                name="password"
                onChange={event => setPassword(event.currentTarget.value)}
                placeholder="Your password"
                type="password"
                value={password}
              />
            </label>
            <button disabled={passwordSignInDisabled} type="submit">
              Sign in
            </button>
          </form>
        ) : null}
        {passwordSignUpAvailable ? (
          <form className="auth-sign-up-form password-auth-form" onSubmit={submitPasswordSignUp}>
            <label>
              Create account name
              <input
                autoComplete="name"
                name="displayName"
                onChange={event => setPasswordDisplayName(event.currentTarget.value)}
                placeholder="Pat Password"
                type="text"
                value={passwordDisplayName}
              />
            </label>
            <label>
              Account email
              <input
                autoComplete="email"
                name="newEmail"
                onChange={event => setNewPasswordEmail(event.currentTarget.value)}
                placeholder="pat@example.com"
                type="email"
                value={newPasswordEmail}
              />
            </label>
            <label>
              Account password
              <input
                autoComplete="new-password"
                name="newPassword"
                onChange={event => setNewPassword(event.currentTarget.value)}
                placeholder="At least 8 characters"
                type="password"
                value={newPassword}
              />
            </label>
            <button disabled={passwordSignUpDisabled} type="submit">
              Create account and continue
            </button>
          </form>
        ) : null}
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
        ) : null}
        {showNoSignInOptionsMessage ? (
          <p className="todo-message">No sign-in shortcuts are enabled for this workspace.</p>
        ) : null}
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
