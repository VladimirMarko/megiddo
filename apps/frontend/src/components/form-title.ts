const readFormData = (formElement: HTMLFormElement) => {
  const view = formElement.ownerDocument.defaultView

  if (!view) {
    throw new Error('Missing browser window')
  }

  return new view.FormData(formElement)
}

export const readTitle = (formElement: HTMLFormElement) => {
  const title = readFormData(formElement).get('title')

  return String(title ?? '').trim()
}
