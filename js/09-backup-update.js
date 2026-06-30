// ============= BACKUP & RESTORE DATA JSON =============
function eksporDataJSON(){
  const payload={
    _versiApp:document.querySelector('meta[name="app-version"]')?.content||'unknown',
    _waktuBackup:new Date().toISOString(),
    _info:'Kasir Warung Pro — Backup Data',
    ...DB
  };
  const json=JSON.stringify(payload,null,2);
  const blob=new Blob([json],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const tgl=new Date().toISOString().slice(0,10);
  a.download=`backup_kasir_${tgl}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  showNotif('✅ Data berhasil dibackup!');
  const info=document.getElementById('backupInfo');
  if(info)info.innerHTML=`📦 Terakhir backup: <b>${new Date().toLocaleString('id-ID')}</b><br>📊 ${DB.produk?.length||0} produk · ${DB.transaksi?.length||0} transaksi`;
}

function imporDataJSON(e){
  const f=e.target.files[0];if(!f)return;
  konfirmasi('Restore akan MENGGANTI semua data saat ini dengan data dari file backup.\n\nPastikan kamu sudah backup data terbaru!\n\nLanjutkan?',()=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.produk&&!data.transaksi){showNotif('File bukan backup yang valid',1);return;}
        // Hapus meta fields
        delete data._versiApp;delete data._waktuBackup;delete data._info;
        DB=data;
        saveDB();
        showNotif('✅ Data berhasil direstore! Halaman akan reload...');
        setTimeout(()=>location.reload(),1500);
      }catch(err){showNotif('Gagal baca file: '+err.message,1);}
    };
    reader.readAsText(f,'UTF-8');
  },{labelYa:'⚠️ Ya, Restore Sekarang'});
  e.target.value='';
}

// ============= UPDATE CHECKER =============
const APP_VERSION=document.querySelector('meta[name="app-version"]')?.content||'0.0.0';
let _updateTimer=null;
let _updateDismissed=false;

function simpanGithubURL(){
  const url=document.getElementById('sGithubURL')?.value.trim()||'';
  const s=DB.settings||{};s.githubURL=url;DB.settings=s;saveDB();
  if(url)mulaiCekUpdate();
}

function mulaiCekUpdate(){
  if(_updateTimer)clearInterval(_updateTimer);
  const s=DB.settings||{};
  if(!s.githubURL)return;
  // Cek pertama setelah 30 detik login, lalu tiap 10 menit
  setTimeout(()=>cekUpdateDiam(),30000);
  _updateTimer=setInterval(()=>cekUpdateDiam(),10*60*1000);
}

async function cekUpdateDiam(){
  const s=DB.settings||{};
  if(!s.githubURL||_updateDismissed)return;
  try{
    const url=s.githubURL+'?_t='+Date.now(); // cache buster
    const res=await fetch(url,{cache:'no-store'});
    const text=await res.text();
    const match=text.match(/<meta name="app-version" content="([^"]+)"/);
    if(!match)return;
    const versiServer=match[1];
    const el=document.getElementById('lastUpdateCheck');
    if(el)el.textContent='Terakhir dicek: '+new Date().toLocaleTimeString('id-ID');
    if(versiServer!==APP_VERSION){
      tampilkanBannerUpdate(versiServer);
    } else {
      const dot=document.getElementById('updateStatusDot');
      if(dot)dot.innerHTML='<span style="color:var(--gm)">✅ Versi terbaru</span>';
    }
  }catch(e){/* Tidak ada koneksi, skip */}
}

async function cekUpdateManual(){
  const s=DB.settings||{};
  if(!s.githubURL){showNotif('Isi URL GitHub Pages dulu',1);return;}
  const dot=document.getElementById('updateStatusDot');
  if(dot)dot.textContent='⏳ Mengecek...';
  _updateDismissed=false;
  await cekUpdateDiam();
  if(dot&&dot.textContent==='⏳ Mengecek...')dot.innerHTML='<span style="color:var(--gm)">✅ Versi terbaru</span>';
}

function tampilkanBannerUpdate(versiServer){
  const banner=document.getElementById('updateBanner');
  const sub=document.getElementById('updateBannerSub');
  if(sub)sub.textContent=`Versi ${versiServer} tersedia (kamu: ${APP_VERSION}) — data kamu tetap aman`;
  if(banner)banner.classList.add('show');
  const dot=document.getElementById('updateStatusDot');
  if(dot)dot.innerHTML='<span style="color:#d97706">🆕 Ada update!</span>';
}

function lakukanUpdate(){
  // Backup otomatis dulu sebelum reload
  eksporDataJSON();
  showNotif('💾 Backup otomatis... Halaman akan reload.');
  setTimeout(()=>{
    // Hard reload — paksa ambil versi terbaru dari server
    location.href=location.href.split('?')[0]+'?v='+Date.now();
  },1500);
}

// ============= GOOGLE SHEETS BACKUP =============
async function backupGS(){
  const url=document.getElementById('sGS').value.trim();
  if(!url){showNotif('Isi URL Google Apps Script dulu',1);return;}
  try{
    showNotif('⏳ Mengupload...');
    await fetch(url,{method:'POST',body:JSON.stringify({produk:DB.produk,transaksi:DB.transaksi,arsip:DB.arsip}),mode:'no-cors'});
    showNotif('✅ Backup berhasil!');
  }catch(e){showNotif('❌ Gagal backup: '+e.message,1);}
}

// ============= INIT =============
const _ownerCSS=document.createElement('style');
_ownerCSS.textContent='.owner-only{display:none !important;}.is-owner .owner-only{display:block !important;}.is-owner .sb-divider.owner-only{display:block !important;}';
document.head.appendChild(_ownerCSS);

