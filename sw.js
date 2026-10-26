// Doit rester identique à VERSION dans app.js : 'lift-cloud-' + VERSION.
const CACHE = 'lift-cloud-v30';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'fiches.js', 'backend.js', 'firebase-config.js', 'firebase.js', 'manifest.webmanifest',
  'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-mask.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// L'app demande quelle version est réellement servie (diagnostic dans Réglages).
self.addEventListener('message', e => {
  const d = e.data;
  if (d !== 'version' && !(d && d.type === 'version')) return;
  const msg = { type: 'swv', cache: CACHE };
  if (e.source) { e.source.postMessage(msg); return; }
  self.clients.matchAll({ includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage(msg)));
});

// Stale-while-revalidate pour les fichiers de l'app ; les appels Gemini (autre origine) ne passent pas par le cache.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
