// biome-ignore lint/correctness/noUnusedImports: node test JSX transform expects React in scope.
import * as React from 'react'

const title = 'Megiddo'

export function Title() {
  return <h1>{title}</h1>
}
