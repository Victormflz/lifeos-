export async function apiFetch(url, options = {}) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new Error('Sin conexión con el servidor. Verifica tu internet.')
  }

  let body = null
  try { body = await res.json() } catch { /* response vacía o no-JSON */ }

  if (!res.ok) {
    throw new Error(body?.error || `Error del servidor (${res.status})`)
  }

  return body
}
