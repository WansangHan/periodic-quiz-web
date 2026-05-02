// 5개 퀴즈 앱 공통 service worker.
// 빌드 시 postprocess-web-export.sh가 e9774b16e92b15b2be80cf48ebb15a2e043dcbf2를 git SHA로 치환해 dist/sw.js로 복사.
// 전략:
//   - index.html / 네비게이션: network-first → 새 빌드 즉시 반영, 오프라인 시 캐시 fallback
//   - 해시된 정적 자산(JS/WASM/PNG/폰트): cache-first → 빠른 반복 로드, 빌드마다 파일명이 바뀌므로 stale 안 됨
const CACHE = 'app-e9774b16e92b15b2be80cf48ebb15a2e043dcbf2';

self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  e.respondWith(cacheFirst(e.request));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
}
