// ============= PWA MANIFEST — v6.2 (file fisik manifest.json, sudah tidak pakai blob) =============
// Sebelumnya manifest dibuat dinamis via Blob URL karena app cuma 1 file HTML.
// Sekarang setelah dipisah & di-hosting, manifest.json adalah file fisik biasa
// yang sudah otomatis ter-link lewat <link rel="manifest" href="manifest.json">
// di index.html — tidak perlu generate dari sini lagi.

// ============= SERVICE WORKER — v6.2 (file fisik sw.js, sudah di-hosting) =============
// Sekarang setelah file dipisah & sw.js ada sebagai file nyata di root folder,
// registrasi jadi jauh lebih simpel dan reliable dibanding versi blob URL
// sebelumnya yang memang tidak bisa berfungsi (batasan keamanan browser).
//
// Tetap ada pengecekan protokol: kalau dibuka via file:// (double-klik tanpa
// hosting), Service Worker memang tidak akan pernah bisa register — itu
// bukan bug, melainkan batasan dari browser itu sendiri.
(function(){
  const statusEl=()=>document.getElementById('pwaStatus');

  if(!('serviceWorker' in navigator)){
    if(statusEl())statusEl().textContent='ℹ Browser ini tidak mendukung mode offline (Service Worker).';
    return;
  }
  if(location.protocol==='file:'){
    if(statusEl())statusEl().textContent='ℹ️ Mode offline butuh hosting (GitHub Pages/Netlify/dll). App tetap jalan normal, hanya belum bisa cache otomatis.';
    return;
  }

  navigator.serviceWorker.register('./sw.js',{scope:'./'})
    .then(reg=>{
      console.log('[SW] Registered, scope:',reg.scope);
      if(statusEl())statusEl().textContent='✅ Mode offline aktif — app bisa dipakai tanpa internet!';
      reg.update();
    })
    .catch(err=>{
      console.warn('[SW] Register gagal:',err.message);
      if(statusEl())statusEl().textContent='⚠️ Service Worker gagal aktif: '+err.message;
    });
})();

let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPrompt=e;
  document.getElementById('pwaBanner').classList.add('show');
  document.getElementById('pwaStatus').textContent='✅ Siap diinstall! Klik tombol di atas.';
  document.getElementById('btnInstallPWA').disabled=false;
});
window.addEventListener('appinstalled',()=>{
  document.getElementById('pwaBanner').classList.remove('show');
  document.getElementById('pwaStatus').textContent='✅ Sudah terinstall sebagai aplikasi!';
  showNotif('✅ Aplikasi berhasil diinstall!');
  deferredPrompt=null;
});
function installPWA(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(r=>{
      if(r.outcome==='accepted'){
        showNotif('✅ Sedang menginstall...');
        document.getElementById('btnInstallPWA').textContent='⏳ Menginstall...';
      } else showNotif('Install dibatalkan',1);
      deferredPrompt=null;
    });
  } else {
    // Fallback: manual install instruction
    const ua=navigator.userAgent;
    if(/iPhone|iPad/.test(ua)) showNotif('Di Safari: tap tombol Share → "Add to Home Screen"',1);
    else showNotif('Di Chrome: tap ⋮ → "Add to Home Screen"',1);
  }
}

// ============= SUARA BEEP =============
// PENTING: AudioContext dibuat SEKALI saja dan dipakai ulang terus-menerus.
// Sebelumnya kode bikin `new AudioContext()` setiap klik tanpa pernah ditutup —
// browser (terutama Chrome Android) punya limit jumlah AudioContext aktif
// (umumnya sekitar 6), begitu limit itu tercapai context baru gagal diam-diam
// dan suara hilang total setelah beberapa klik cepat. Solusinya: 1 context global.
let _audioCtx=null;
function _getAudioCtx(){
  if(!_audioCtx){
    try{_audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
  }
  // Browser mobile sering nge-suspend context kalau idle / sebelum ada interaksi user.
  // Resume tiap kali mau dipakai supaya tidak pernah "diam-diam mati".
  if(_audioCtx.state==='suspended'){_audioCtx.resume().catch(()=>{});}
  return _audioCtx;
}
function _tone(ctx,freq,startT,dur,vol,type='sine'){
  const osc=ctx.createOscillator();const gain=ctx.createGain();
  osc.connect(gain);gain.connect(ctx.destination);
  osc.type=type;
  osc.frequency.setValueAtTime(freq,ctx.currentTime+startT);
  gain.gain.setValueAtTime(vol,ctx.currentTime+startT);
  gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+startT+dur);
  osc.start(ctx.currentTime+startT);osc.stop(ctx.currentTime+startT+dur);
}
function playBeep(ok=true){
  try{
    const ctx=_getAudioCtx();if(!ctx)return;
    if(ok===true){
      // Sound "ultimate": akord 3 nada naik cepat (C-E-G ala "ting!" memuaskan), volume tetap penuh
      // berapa kali pun diklik beruntun — tidak diredam/dibatasi.
      _tone(ctx,880,0,0.10,0.30);
      _tone(ctx,1100,0.05,0.12,0.30);
      _tone(ctx,1320,0.10,0.22,0.32);
    }else if(ok==='habis'){
      // Sound khusus stok kosong: nada turun tegas + getar — beda total dari sound sukses
      _tone(ctx,500,0,0.10,0.30,'square');
      _tone(ctx,350,0.10,0.10,0.28,'square');
      _tone(ctx,220,0.20,0.22,0.26,'square');
      if(navigator.vibrate)navigator.vibrate([80,50,80,50,120]);
    }else{
      // Sound gagal umum (misal PIN salah)
      _tone(ctx,300,0,0.25,0.25);
      if(navigator.vibrate)navigator.vibrate(100);
    }
  }catch(e){}
}

// ============= STORAGE ENGINE =============
let DB={};let _idbStore=null;const DB_KEY='kasirpro_v4';
function _lsGet(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'null');}catch(e){return null;}}
function _lsSet(d){try{localStorage.setItem(DB_KEY,JSON.stringify(d));return true;}catch(e){return false;}}
function _openIDB(){return new Promise((res,rej)=>{try{const r=indexedDB.open('KasirWarungProV4',1);r.onupgradeneeded=e=>{try{e.target.result.createObjectStore('kv',{keyPath:'k'});}catch(_){}};r.onsuccess=e=>res(e.target.result);r.onerror=()=>rej();}catch(e){rej(e);}});}
async function _idbGet(){try{if(!_idbStore)_idbStore=await _openIDB();return new Promise((res,rej)=>{const tx=_idbStore.transaction('kv','readonly');const r=tx.objectStore('kv').get(DB_KEY);r.onsuccess=()=>res(r.result?r.result.v:null);r.onerror=()=>rej();});}catch(e){return null;}}
async function _idbSet(d){try{if(!_idbStore)_idbStore=await _openIDB();return new Promise((res,rej)=>{const tx=_idbStore.transaction('kv','readwrite');tx.objectStore('kv').put({k:DB_KEY,v:d});tx.oncomplete=()=>res(true);tx.onerror=()=>rej();});}catch(e){return false;}}
function saveDB(){_lsSet(DB);_idbSet(DB);}

// ============= LOG AKTIVITAS — v6 FIX =============
// Pencatat audit trail terpusat: siapa melakukan apa, kapan.
// Dipanggil dari titik-titik penting (login, ubah/hapus produk, void
// transaksi, ubah stok manual, hapus user, dll) supaya owner bisa
// menelusuri histori perubahan, terutama saat ada kejanggalan data.
function catatLog(aksi, detail=''){
  if(!DB.activityLog) DB.activityLog=[];
  DB.activityLog.push({
    waktu: new Date().toISOString(),
    user: me?.nama || 'Sistem',
    role: me?.role || '-',
    aksi,
    detail
  });
  // Batasi maksimal 2000 entri terbaru supaya tidak membengkak tak terbatas
  if(DB.activityLog.length>2000) DB.activityLog=DB.activityLog.slice(-2000);
  saveDB();
}

// ===== HALAMAN LOG AKTIVITAS — v6 baru =====
const _AKSI_ICON={
  'Login':'🔓','Logout':'🔒','Tambah Produk':'➕','Edit Produk':'✏️','Hapus Produk':'🗑',
  'Ubah Stok Manual':'📦','Void Transaksi':'🚫','Tambah Pengguna':'👤','Hapus Pengguna':'🗑'
};
function renderActivityLog(){
  const log=DB.activityLog||[];
  // Isi filter user & aksi (cuma sekali render ulang opsi tiap buka halaman)
  const userSel=document.getElementById('logFilterUser');
  const aksiSel=document.getElementById('logFilterAksi');
  const curUser=userSel.value, curAksi=aksiSel.value;
  const userList=[...new Set(log.map(l=>l.user))];
  const aksiList=[...new Set(log.map(l=>l.aksi))];
  userSel.innerHTML='<option value="">Semua Pengguna</option>'+userList.map(u=>`<option value="${u}" ${u===curUser?'selected':''}>${u}</option>`).join('');
  aksiSel.innerHTML='<option value="">Semua Aksi</option>'+aksiList.map(a=>`<option value="${a}" ${a===curAksi?'selected':''}>${_AKSI_ICON[a]||''} ${a}</option>`).join('');

  let filtered=[...log].reverse(); // terbaru dulu
  if(curUser) filtered=filtered.filter(l=>l.user===curUser);
  if(curAksi) filtered=filtered.filter(l=>l.aksi===curAksi);

  const list=document.getElementById('activityLogList');
  if(!filtered.length){
    list.innerHTML='<div class="empty-s"><div class="ei">📜</div><p>Belum ada aktivitas tercatat</p></div>';
    return;
  }
  list.innerHTML=filtered.slice(0,300).map(l=>`
    <div style="display:flex;gap:10px;padding:9px 4px;border-bottom:1px solid var(--brd);align-items:flex-start;">
      <div style="font-size:18px;flex-shrink:0;width:26px;text-align:center;">${_AKSI_ICON[l.aksi]||'📝'}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.5px;font-weight:700;color:var(--txt);">${l.aksi}</div>
        ${l.detail?`<div style="font-size:11px;color:var(--txt2);margin-top:1px;word-break:break-word;">${l.detail}</div>`:''}
        <div style="font-size:10px;color:var(--gray);margin-top:3px;">${fTgl(l.waktu)} ${fJam(l.waktu)} · ${l.user}${l.role&&l.role!=='-'?' ('+(l.role==='owner'?'Pemilik':l.role==='stok'?'Manajer Stok':'Kasir')+')':''}</div>
      </div>
    </div>`).join('');
  if(filtered.length>300){
    list.innerHTML+=`<div style="text-align:center;font-size:11px;color:var(--gray);padding:10px;">Menampilkan 300 dari ${filtered.length} entri terbaru. Gunakan filter atau Export CSV untuk melihat semua.</div>`;
  }
}
function eksporLogCSV(){
  const log=DB.activityLog||[];
  if(!log.length){showNotif('Belum ada log untuk diexport',1);return;}
  const headers=['Waktu','Pengguna','Role','Aksi','Detail'];
  const rows=log.map(l=>[
    new Date(l.waktu).toLocaleString('id-ID'),
    l.user,
    l.role==='owner'?'Pemilik':l.role==='stok'?'Manajer Stok':l.role==='kasir'?'Kasir':l.role,
    l.aksi,
    (l.detail||'').replace(/"/g,'""')
  ]);
  const csv=[headers,...rows].map(r=>r.map(v=>'"'+String(v)+'"').join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='log_aktivitas_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  showNotif('✅ Log aktivitas diexport!');
}

// ============= DEFAULT DATA =============
function setDefaultDB(){
  if(!DB.users||!DB.users.length)DB.users=[{id:1,nama:'Bu Sari',role:'owner',pin:'1234',ico:'👩'},{id:2,nama:'Kasir 1',role:'kasir',pin:'0000',ico:'🧑'}];
  if(!DB.kategori||!DB.kategori.length)DB.kategori=['Mie & Pasta','Minuman','Snack','Rokok','Sembako','Kebersihan','Sayur & Buah','Daging & Ikan','Lainnya'];
  if(!DB.settings)DB.settings={};
  if(!DB.produk||!DB.produk.length)DB.produk=[
    {id:1,nama:'Indomie Goreng',barcode:'8992388195607',kat:'Mie & Pasta',harga:3500,modal:2800,stok:48,minStok:5,fav:true},
    {id:2,nama:'Indomie Kuah',barcode:'8992388195614',kat:'Mie & Pasta',harga:3500,modal:2800,stok:30,minStok:5},
    {id:3,nama:'Aqua 600ml',barcode:'8886011101009',kat:'Minuman',harga:3000,modal:2200,stok:60,minStok:10,fav:true},
    {id:4,nama:'Teh Botol Sosro',barcode:'8992734100101',kat:'Minuman',harga:5000,modal:3800,stok:24,minStok:6},
    {id:5,nama:'Pocari Sweat',barcode:'4987035321668',kat:'Minuman',harga:8000,modal:6000,stok:12,minStok:4},
    {id:6,nama:'Chitato 68g',barcode:'8999999011401',kat:'Snack',harga:9000,modal:7000,stok:15,minStok:5},
    {id:7,nama:'Oreo Original',barcode:'7622210449283',kat:'Snack',harga:3000,modal:2200,stok:3,minStok:5},
    {id:8,nama:'Sampoerna Mild',barcode:'8991234000012',kat:'Rokok',harga:27000,modal:24000,stok:10,minStok:3},
    {id:9,nama:'Beras 1kg',barcode:'',kat:'Sembako',harga:14000,modal:11000,stok:50,minStok:10},
    {id:10,nama:'Gula Pasir 1kg',barcode:'',kat:'Sembako',harga:15000,modal:12000,stok:30,minStok:8},
    {id:11,nama:'Rinso Sachet',barcode:'8999999500101',kat:'Kebersihan',harga:3000,modal:2200,stok:40,minStok:10},
    {id:12,nama:'Taro Net',barcode:'',kat:'Snack',harga:5000,modal:3500,stok:20,minStok:5,fav:true},
    {id:13,nama:'Kubis / Kol',barcode:'',kat:'Sayur & Buah',harga:7000,modal:5000,stok:999,minStok:1,timbang:true},
    {id:14,nama:'Tomat',barcode:'',kat:'Sayur & Buah',harga:12000,modal:9000,stok:999,minStok:1,timbang:true},
    {id:15,nama:'Cabai Merah',barcode:'',kat:'Sayur & Buah',harga:45000,modal:38000,stok:999,minStok:1,timbang:true},
    {id:16,nama:'Bawang Merah',barcode:'',kat:'Sayur & Buah',harga:35000,modal:28000,stok:999,minStok:1,timbang:true},
    {id:17,nama:'Bawang Putih',barcode:'',kat:'Sayur & Buah',harga:30000,modal:24000,stok:999,minStok:1,timbang:true},
    {id:18,nama:'Ayam Potong',barcode:'',kat:'Daging & Ikan',harga:38000,modal:32000,stok:999,minStok:1,timbang:true},
    {id:19,nama:'Ikan Lele',barcode:'',kat:'Daging & Ikan',harga:28000,modal:22000,stok:999,minStok:1,timbang:true},
    {id:20,nama:'Pisang',barcode:'',kat:'Sayur & Buah',harga:10000,modal:7000,stok:999,minStok:1,timbang:true},
  ];
  if(!DB.transaksi)DB.transaksi=[];
  if(!DB.hutang)DB.hutang=[];
  if(!DB.arsip)DB.arsip=[];
  if(!DB.supplier)DB.supplier=[];
  if(!DB.pembelian)DB.pembelian=[];
  if(!DB.pengeluaran)DB.pengeluaran=[];
  if(!DB.riwayatStok)DB.riwayatStok=[];
  if(!DB.nextId)DB.nextId=21;
  // v4 new
  if(!DB.pelanggan)DB.pelanggan=[];
  if(!DB.kasKecil)DB.kasKecil=[];
  if(!DB.kasKecilSaldo)DB.kasKecilSaldo=0;
  if(!DB.retur)DB.retur=[];
  if(!DB.cabang)DB.cabang=[];
  // v5 new
  if(!DB.bundling)DB.bundling=[];
  if(DB.shiftAktif===undefined)DB.shiftAktif=null;
  // v6 new
  if(!DB.activityLog)DB.activityLog=[];
}

async function loadDB(){
  const ls=_lsGet();
  if(ls){DB=ls;setDefaultDB();initApp();return;}
  const idb=await _idbGet();
  if(idb){DB=idb;setDefaultDB();initApp();return;}
  DB={};setDefaultDB();initApp();
}

// ============= TEMA & WARNA =============
const TEMAS=[
  {nama:'Hijau',g:'#1b4332',gm:'#2d6a4f',gl:'#52b788',gp:'#d8f3dc',gf:'#f0faf3'},
  {nama:'Biru',g:'#1e3a5f',gm:'#1d4ed8',gl:'#60a5fa',gp:'#dbeafe',gf:'#eff6ff'},
  {nama:'Ungu',g:'#3b0764',gm:'#7c3aed',gl:'#a78bfa',gp:'#ede9fe',gf:'#f5f3ff'},
  {nama:'Merah',g:'#7f1d1d',gm:'#dc2626',gl:'#f87171',gp:'#fee2e2',gf:'#fff1f2'},
  {nama:'Coklat',g:'#451a03',gm:'#92400e',gl:'#d97706',gp:'#fff3e0',gf:'#fffbeb'},
];
const IKOS=['🛒','🏪','🏬','🍜','🥘','🍕','☕','🥤','🍦','🧃','🧹','💊','🌾','🥩','🐟'];
function terapkanTema(t){
  const r=document.documentElement.style;
  r.setProperty('--g',t.g);r.setProperty('--gm',t.gm);r.setProperty('--gl',t.gl);r.setProperty('--gp',t.gp);r.setProperty('--gf',t.gf);
  const meta=document.getElementById('themeColorMeta');if(meta)meta.content=t.g;
}

// ============= FORMAT =============
function fRp(n){n=Math.round(n||0);if(n>=1e9)return 'Rp '+(n/1e9).toFixed(1)+'M';if(n>=1e6)return 'Rp '+(n/1e6).toFixed(1)+'jt';return 'Rp '+n.toLocaleString('id-ID');}
function fTgl(d){return new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}
function fJam(d){const x=new Date(d);return [x.getHours(),x.getMinutes()].map(n=>String(n).padStart(2,'0')).join(':');}
function fTglLengkap(d){return new Date(d).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}

// ============= NOTIF =============
function showNotif(msg,err=0){const n=document.getElementById('notif');n.textContent=msg;n.style.background=err?'#dc2626':'#2d6a4f';n.classList.add('show');setTimeout(()=>n.classList.remove('show'),2200);}

