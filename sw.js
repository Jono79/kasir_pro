// Service Worker untuk Kasir Warung Pro
// Taruh file ini di ROOT folder yang sama dengan index.html (bukan di dalam js/).
//
// Tugas: saat app dibuka pertama kali (online), semua file di bawah ini
// disimpan ke cache. Setelah itu, biar internet mati total, app tetap bisa
// dibuka dan dipakai normal karena diambil dari cache, bukan dari internet.

const CACHE_NAME = 'kasirpro-v11';

// Semua file yang perlu di-cache supaya app utuh saat offline.
// PENTING: kalau nanti menambah file js/ baru, tambahkan juga di sini.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/style.css',
  './js/01-core.js',
  './js/02-auth.js',
  './js/03-kasir.js',
  './js/04-produk.js',
  './js/05-validasi.js',
  './js/06-hutang-supplier.js',
  './js/07-void-laporan.js',
  './js/08-import-export.js',
  './js/09-backup-update.js',
  './js/10-fitur-v4.js',
  './js/11-override-transaksi.js',
  './js/12-fitur-v5.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Strategi: network-first dengan fallback ke cache.
// App kasir selalu coba ambil versi terbaru dulu (kalau online), tapi kalau
// internet putus, otomatis pakai versi yang sudah tersimpan di cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
