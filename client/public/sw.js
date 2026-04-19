// LifeOS Service Worker
// Estrategias:
//   /assets/* (JS/CSS hasheados por Vite) → cache-first (son inmutables por hash)
//   /api/*                                 → network-only (nunca cachear datos)
//   index.html / /                         → network-first con fallback a caché
//   resto (icons, manifest)                → stale-while-revalidate

const CACHE_VERSION = 'lifeos-v3'
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// ── Install: pre-cachear app shell ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL_ASSETS))
  )
  // Activar inmediatamente sin esperar a que cierren las pestañas anteriores
  self.skipWaiting()
})

// ── Activate: limpiar versiones antiguas y tomar control ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // 1. API → siempre red, sin caché
  if (url.pathname.startsWith('/api/')) return

  // 2. Assets hasheados de Vite (/assets/*.js, /assets/*.css)
  //    Cache-first: el hash garantiza inmutabilidad
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  // 3. index.html y raíz → network-first para recibir actualizaciones del shell
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirst(event.request))
    return
  }

  // 4. Resto (icons, manifest, otros estáticos) → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request))
})

// ── Estrategia: Cache-First ───────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION)
    cache.put(request, response.clone())
  }
  return response
}

// ── Estrategia: Network-First con fallback a caché ───────────────────────────
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? new Response('Offline — recarga cuando tengas conexión', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }
}

// ── Estrategia: Stale-While-Revalidate ───────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  return cached ?? await fetchPromise
}
