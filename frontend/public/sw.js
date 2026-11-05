const CACHE_NAME = 'mesai-takip-v2'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// ── Günlük hatırlatma bildirimleri ──
self.addEventListener('push', e => {
  let veri = {}
  try { veri = e.data ? e.data.json() : {} } catch { veri = { govde: e.data && e.data.text() } }
  e.waitUntil(
    self.registration.showNotification(veri.baslik || 'Mesai Takip', {
      body: veri.govde || 'Bugünün kayıtlarını girmeyi unutmayın.',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'gunluk-hatirlatma',
      renotify: true,
      data: { url: veri.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const hedef = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(liste => {
      for (const c of liste) { if ('focus' in c) { c.navigate(hedef); return c.focus() } }
      return self.clients.openWindow(hedef)
    })
  )
})
