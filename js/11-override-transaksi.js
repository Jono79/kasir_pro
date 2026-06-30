// ============================================================
// ⚠️ CATATAN ARSITEKTUR — v6 FIX: dokumentasi pola override
// ============================================================
// File ini memakai pola "function override" di banyak tempat:
// fungsi versi awal didefinisikan duluan, lalu di bagian bawah
// file fungsi yang SAMA didefinisikan ULANG untuk menambah fitur
// (mis. poin pelanggan, notif WA otomatis).
//
// ATURAN PENTING bagi siapa pun yang mengedit file ini:
// 1) Urutan <script> di HTML menentukan hasil akhir — definisi
//    PALING BAWAH yang akan benar-benar dipakai aplikasi.
// 2) Sebagian override memanggil "_xxxOrig()" di dalamnya (aman,
//    perilaku lama tetap jalan + tambahan baru). Sebagian LAIN
//    (seperti prosesTransaksi di bawah) MENULIS ULANG TOTAL fungsi
//    tanpa memanggil versi aslinya — jika versi asli diubah,
//    perubahan itu TIDAK akan pernah terpakai karena tertimpa di sini.
// 3) Jika menambah logic baru ke alur transaksi/checkout, edit
//    fungsi prosesTransaksi di BAWAH ini (yang aktif), BUKAN yang
//    di atas dekat baris ~2270 (sudah tidak terpakai, hanya basis awal).
// ============================================================

// OVERRIDE prosesTransaksi untuk poin (INI YANG AKTIF — full rewrite, bukan rantai _Orig)
const _prosesTransaksiOrig=prosesTransaksi; // disimpan untuk referensi, TIDAK dipanggil di bawah
prosesTransaksi=function(){
  // BUG FIX v6: validasi stok ini ada di versi awal fungsi tapi HILANG saat
  // di-override di sini sebelumnya — akibatnya kasir bisa checkout qty melebihi
  // stok yang tersedia. Dikembalikan lagi di sini.
  for(const it of keranjang){
    if(it.timbang)continue;
    const p=DB.produk.find(x=>x.id===it.id);
    if(p&&p.stok!==999&&it.qty>p.stok){
      showNotif('⚠ Stok "'+p.nama+'" tersisa '+p.stok+', tidak cukup untuk qty '+it.qty,1);
      playBeep('habis');
      return;
    }
  }
  const{total,disc,sub}=hitungTotal();
  const bayar=metode==='tunai'?(parseInt(document.getElementById('uangBayar').value)||0):total;
  // BUG FIX v6: cegah checkout tunai dengan uang bayar kurang dari total
  if(metode==='tunai'&&bayar<total){
    showNotif('⚠ Uang bayar ('+fRp(bayar)+') kurang dari total ('+fRp(total)+')',1);
    return;
  }
  const kem=bayar-total;const now=new Date();
  const trx={id:Date.now(),waktu:now.toISOString(),items:[...keranjang.map(it=>({...it}))],subtotal:sub,diskon:disc,total,bayar,kembalian:kem,kasir:me?.nama||'-',metode,void:false,
    pelanggan:_pelangganTerpilih?.nama||null,pelangganId:_pelangganTerpilih?.id||null};
  trx.items.forEach(it=>{
    const p=DB.produk.find(x=>x.id===it.id);
    if(p&&p.stok!==999&&!it.timbang){const qAwal=p.stok;p.stok=Math.max(0,p.stok-it.qty);
      DB.riwayatStok.push({waktu:now.toISOString(),produkId:p.id,nama:p.nama,jenis:'keluar',qty:it.qty,stokAwal:qAwal,stokAkhir:p.stok,ref:'Transaksi #'+trx.id});}
    if(it.timbang){const p2=DB.produk.find(x=>x.id===it.id);
      if(p2){const kg=it.unit==='gram'?it.berat/1000:it.unit==='ons'?it.berat/10:it.berat;DB.riwayatStok.push({waktu:now.toISOString(),produkId:p2.id,nama:p2.nama,jenis:'keluar',qty:kg+'kg',stokAwal:'-',stokAkhir:'-',ref:'Timbang #'+trx.id});}}
  });
  if(_pelangganTerpilih)tambahPoinPelanggan(_pelangganTerpilih.id,total);
  DB.transaksi.push(trx);saveDB();tutupM('mBayar');
  const strSukses=buatStruk(true,trx);
  document.getElementById('suksesTotal').textContent=fRp(total);
  document.getElementById('suksesKem').textContent=metode==='tunai'?'Kembalian: '+fRp(kem):'Pembayaran: '+({'transfer':'Transfer','qris':'QRIS','kredit':'Kredit'}[metode]||metode);
  document.getElementById('strukSukses').innerHTML=strSukses;
  bukaM('mSukses');
  keranjang=[];diskonVal=0;metode='tunai';_poinRedeemed=0;
  document.getElementById('diskonVal').value='';document.getElementById('uangBayar').value='';
  document.querySelectorAll('.metode-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  updateFabCount();renderProduk();updateTopOmzet();updatePelangganBar();updatePoinRedeemRow();playBeep(true);cekStokAlert();
  // AUTO NOTIF WA
  const sWA=DB.settings||{};
  // Kirim ke pelanggan jika ada nomor WA & toggle aktif
  if(sWA.autoNotifWaPelanggan&&_pelangganTerpilih&&_pelangganTerpilih.wa){
    setTimeout(()=>{
      kirimStrukWaPelanggan();
      showNotif('📲 Struk dikirim otomatis ke WA pelanggan!');
    },800);
  }
  // Kirim notif ke owner jika toggle aktif
  if(sWA.autoNotifWaOwner&&sWA.waOwner){
    setTimeout(()=>{
      const lastTrx=DB.transaksi[DB.transaksi.length-1];
      const teksOwner=`✅ *TRANSAKSI MASUK*\n${new Date(lastTrx.waktu).toLocaleString('id-ID')}\nKasir: ${lastTrx.kasir}\n`+
        lastTrx.items.map(it=>`• ${it.nama} x${it.qty}`).join('\n')+
        `\n\n💰 *Total: ${fRp(lastTrx.total)}*\nMetode: ${({'tunai':'Tunai','transfer':'Transfer','qris':'QRIS','kredit':'Kredit'}[lastTrx.metode]||'Tunai')}`;
      window.open('https://wa.me/'+sWA.waOwner+'?text='+encodeURIComponent(teksOwner));
    },sWA.autoNotifWaPelanggan&&_pelangganTerpilih?.wa?2000:800);
  }
};

// OVERRIDE renderSett untuk setting baru
const _renderSettOrig=renderSett;
renderSett=function(){
  _renderSettOrig();
  const s=DB.settings||{};
  const autoEl=document.getElementById('autoRekapToggle');const jamEl=document.getElementById('autoRekapJam');
  if(autoEl)autoEl.checked=!!s.autoRekap;if(jamEl)jamEl.value=s.autoRekapJam||'21:00';
  const poinRpEl=document.getElementById('poinRpPerPoin');const poinNilEl=document.getElementById('poinNilai');
  if(poinRpEl)poinRpEl.value=s.poinRpPerPoin||10000;if(poinNilEl)poinNilEl.value=s.poinNilai||50;
  const notifPelEl=document.getElementById('autoNotifWaToggle');const notifOwEl=document.getElementById('autoNotifOwnerToggle');
  if(notifPelEl)notifPelEl.checked=!!s.autoNotifWaPelanggan;if(notifOwEl)notifOwEl.checked=!!s.autoNotifWaOwner;
  const ghEl=document.getElementById('sGithubURL');
  if(ghEl)ghEl.value=s.githubURL||'';
  const info=document.getElementById('backupInfo');
  if(info)info.innerHTML=`📊 ${DB.produk?.length||0} produk · ${DB.transaksi?.length||0} transaksi · ${DB.pelanggan?.length||0} pelanggan`;
  const lastCheck=document.getElementById('lastUpdateCheck');
  if(lastCheck&&!lastCheck.textContent)lastCheck.textContent='Belum pernah dicek sejak login';
  renderCabangList();
};

// OVERRIDE initApp untuk init fitur baru
const _initAppOrig=initApp;
initApp=function(){
  _initAppOrig();
};

// Jadwal auto rekap setelah login
const _doLoginOrig=doLogin;
doLogin=function(){
  const sebelumLogin=me; // null kalau belum login
  _doLoginOrig();
  // Catat log HANYA kalau login benar2 berhasil (me berubah jadi user baru)
  if(me && me!==sebelumLogin){
    catatLog('Login', me.nama+' ('+(me.role==='owner'?'Pemilik':me.role==='stok'?'Manajer Stok':'Kasir')+') masuk ke aplikasi');
  }
  setTimeout(()=>{jadwalAutoRekap();cekStokAlert();mulaiCekUpdate();},500);
};

