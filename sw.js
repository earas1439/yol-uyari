// Yol Uyarı – service worker: uygulamanın internetsiz açılması ve bildirimler
const SHELL = 'yu-shell-v3';
const FILES = ['./', 'index.html', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png',
  'lib/leaflet.js', 'lib/leaflet.css', 'lib/leaflet-rotate.js', 'lib/pmtiles.js', 'lib/protomaps-leaflet.js', 'data/radars-tr.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('yu-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Uygulama dosyaları: önce internet (güncel sürüm), yoksa kayıtlı kopya.
// Sunucu API'si, harita dosyası (parçalı indirme) ve dış servisler önbelleğe alınmaz.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/admin/') || url.pathname.endsWith('.pmtiles') || req.headers.has('range')) return;
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./') || await cache.match('index.html') : null);
      if (hit) return hit;
      throw err;
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  })());
});
