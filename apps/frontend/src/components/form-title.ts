const readFormData = (formElement: HTMLFormElement) => {
  const view = formElement.ownerDocument.defaultView

  if (!view) {
    throw new Error('Missing browser window')
  }

  return new view.FormData(formElement)
}

export const readTitle = (formElement: HTMLFormElement) => String(readFormData(formElement).get('title') ?? '').trim()
