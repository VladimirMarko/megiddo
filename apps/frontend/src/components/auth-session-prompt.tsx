// biome-ignore lint/correctness/noUnusedImports: node test JSX transform expects React in scope.
import * as React from 'react'

type AuthSessionPromptProps = {
  buttonText: string
  message: string
  messageRole?: 'alert'
  onSignIn: () => void
}

export function AuthSessionPrompt({ buttonText, message, messageRole, onSignIn }: AuthSessionPromptProps) {
  return (
    <main>
      <h1>Todos</h1>
      <p role={messageRole}>{message}</p>
      <button onClick={onSignIn} type="button">
        {buttonText}
      </button>
    </main>
  )
}
