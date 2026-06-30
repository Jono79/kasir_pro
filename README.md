# Kasir Warung Pro — Cara Upload ke GitHub Pages

## Struktur Folder
```
warungpro/
├── index.html        ← halaman utama
├── manifest.json      ← info PWA (nama app, icon, dll)
├── sw.js              ← service worker (WAJIB di root, jangan dipindah ke js/)
├── icon.svg           ← ikon aplikasi
├── css/
│   └── style.css
└── js/
    ├── 01-core.js          ← PWA, storage, log aktivitas
    ├── 02-auth.js          ← login, sidebar, settings
    ├── 03-kasir.js         ← keranjang, bayar, struk
    ├── 04-produk.js        ← CRUD produk, scanner, stok
    ├── 05-validasi.js      ← validasi form
    ├── 06-hutang-supplier.js
    ├── 07-void-laporan.js
    ├── 08-import-export.js
    ├── 09-backup-update.js
    ├── 10-fitur-v4.js      ← pelanggan, poin, kas kecil, retur
    ├── 11-override-transaksi.js
    └── 12-fitur-v5.js      ← dashboard, shift, bundling
```

⚠️ **Penting:** urutan file `<script src="...">` di `index.html` SUDAH BENAR dan TIDAK BOLEH diubah urutannya, karena beberapa fungsi sengaja menimpa fungsi lain (lihat komentar di `11-override-transaksi.js`).

## Cara Upload ke GitHub Pages

1. Buat repository baru di GitHub (misal `warungpro`)
2. Upload SEMUA file & folder di atas dengan struktur folder yang sama persis (jangan digabung jadi 1 folder atau diacak)
3. Buka **Settings → Pages** di repo tersebut
4. Pilih branch `main` dan folder `/ (root)`, klik **Save**
5. Tunggu 1-2 menit, GitHub akan kasih link seperti:
   `https://namakamu.github.io/warungpro/`
6. Buka link itu di HP — pertama kali harus online supaya semua file ke-cache
7. Setelah itu, app bisa dipakai offline (matikan WiFi/data, coba buka lagi — harus tetap jalan)

## Cara Install sebagai Aplikasi di HP

1. Buka link GitHub Pages di Chrome (Android) atau Safari (iPhone)
2. Tap menu (⋮ di Chrome, atau tombol Share di Safari)
3. Pilih "Add to Home Screen" / "Tambah ke Layar Utama"
4. Aplikasi akan muncul seperti app biasa, tanpa address bar

## Update Aplikasi di Kemudian Hari

Kalau ada perubahan kode, edit file yang relevan di folder `js/`, lalu upload ulang (replace) file itu saja ke GitHub. Service worker akan otomatis mendeteksi versi baru dan update cache — user mungkin perlu refresh app sekali untuk dapat versi terbaru.

Kalau menambah file JS baru, jangan lupa:
1. Tambahkan `<script src="js/nama-file-baru.js"></script>` di `index.html`
2. Tambahkan path filenya juga di daftar `PRECACHE_URLS` dalam `sw.js`

## Troubleshooting

**App tidak bisa offline:** Pastikan dibuka via `https://` (GitHub Pages otomatis https), bukan `file://`. Service Worker tidak akan jalan di `file://`.

**Perubahan kode tidak muncul:** Browser/Service Worker kadang nge-cache lama. Coba hard refresh (Ctrl+Shift+R) atau uninstall lalu install ulang PWA-nya.
