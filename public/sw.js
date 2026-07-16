/*
 * Service worker — offline app shell for the portal-served PWA.
 *
 * Registered per-project (script lives at /pp/asset_manager/<project>/sw.js, so
 * its scope is that project only). Strategy:
 *  - navigations: network-first; the last good page is cached as '__shell__' and
 *    served when offline. Redirected responses (portal login) are never cached.
 *  - other GETs (hashed assets, seed/hwpx scripts, icons, CDN fonts):
 *    stale-while-revalidate.
 * Asset data itself lives in localStorage, so a cached shell = a working app.
 */
const CACHE = 'cens-assets-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req)
        // Cache only a real, non-redirected page (not the portal login redirect).
        if (res.ok && !res.redirected) {
          const cache = await caches.open(CACHE)
          cache.put('__shell__', res.clone())
        }
        return res
      } catch {
        const cache = await caches.open(CACHE)
        const shell = await cache.match('__shell__')
        return shell || Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(req)
    const network = fetch(req)
      .then((res) => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone())
        return res
      })
      .catch(() => null)
    return cached || (await network) || Response.error()
  })())
})
