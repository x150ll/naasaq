/* نَسَق — Service Worker */
const VERSION = 'naasaq-v1.4.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/maskable-192.png',
  './assets/maskable-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* تنقّل الصفحات: الشبكة أولًا (أحدث نسخة دائمًا)، ثم الكاش،
     وأخيرًا صفحة أوفلاين مضمونة — لا يُرجَع undefined أبدًا */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(VERSION);
        c.put('./index.html', net.clone());
        return net;
      } catch (_) {
        const hit = await caches.match('./index.html');
        return hit || new Response(
          '<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><title>نَسَق</title>' +
          '<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0E1613;color:#EDEDE6;font-family:system-ui">' +
          '<p style="text-align:center;line-height:2">لا اتصال بالإنترنت<br>' +
          '<small style="color:#8A9590">افتح نَسَق مرة واحدة متصلًا، وسيعمل بعدها دون اتصال دائمًا</small></p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  /* بقية الملفات: كاش أولًا ثم الشبكة، ورد 503 صريح بدل التعليق */
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    } catch (_) {
      return new Response('', { status: 503 });
    }
  })());
});
