/**
 * Service Worker for メモっとく？ (Personal Last-Done Tracker)
 * 完全オフライン動作 & PWA キャッシュ制御
 */

const CACHE_NAME = 'memottoku-cache-v1';

// オフラインキャッシュするアセット一覧
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 1. インストール時: アセットをキャッシュに保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. アクティベート時: 古いキャッシュをクリア
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. フェッチ時: キャッシュ優先で返し、ネット接続時はキャッシュを最新化 (Cache First with Background Update)
self.addEventListener('fetch', (event) => {
  // GET リクエストのみキャッシュ処理
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Chrome 拡張機能や別ドメインなどのスキップ
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ネットワークへの問い合わせ（オンラインなら最新に更新）
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // オフライン時のナビゲーションは index.html を返す
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });

      // キャッシュがあれば即座に応答（高速表示）、なければネットワークからの取得を待つ
      return cachedResponse || fetchPromise;
    })
  );
});
