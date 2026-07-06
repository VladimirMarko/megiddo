export const createCookieJarFetch = (fetch = globalThis.fetch) => {
  let cookie: string | undefined

  return async (request: Request) => {
    const requestWithCookie = cookie
      ? new Request(request, { headers: { ...Object.fromEntries(request.headers), cookie } })
      : request
    const response = await fetch(requestWithCookie)
    const setCookie = response.headers.get('set-cookie')

    if (setCookie) {
      cookie = setCookie.split(';')[0]
    }

    return response
  }
}
