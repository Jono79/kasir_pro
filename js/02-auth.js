// ============= AUTH =============
let me=null;
function initApp(){renderLoginUsers();_initOfflineMonitor();}
function renderLoginUsers(){
  const s=DB.settings||{};
  if(s.logoUrl){
    document.getElementById('loginLogo').innerHTML=`<img src="${s.logoUrl}" style="width:56px;height:56px;border-radius:12px;object-fit:cover;">`;
  }else{
    document.getElementById('loginLogo').textContent=s.logo||'🛒';
  }
  const ul=document.getElementById('upills');
  ul.innerHTML=DB.users.map((u,i)=>`<div class="upill" onclick="pilihUser(${i})" id="upill${i}">
    ${u.fotoUrl?`<img class="ui" src="${u.fotoUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`:`<div class="ui">${u.ico||'👤'}</div>`}
    <div class="un">${u.nama}</div><div class="ur">${u.role==='owner'?'Pemilik':u.role==='stok'?'Manajer Stok':'Kasir'}</div>
  </div>`).join('');
  document.getElementById('pinInput').value='';
  document.getElementById('lerr').textContent='';
}
let selUser=0;
function pilihUser(i){selUser=i;document.querySelectorAll('.upill').forEach((p,j)=>p.classList.toggle('sel',j===i));document.getElementById('pinInput').focus();}
function errClear(){document.getElementById('lerr').textContent='';}
// Anti brute-force PIN: hitung percobaan gagal per akun. Setelah 5x salah berturut-turut,
// kunci login akun itu selama 30 detik. Counter direset begitu login berhasil.
let _loginFailMap={}; // {userId: {count, lockUntil}}
function _sisaLockSec(u){
  const st=_loginFailMap[u.id];
  if(!st||!st.lockUntil)return 0;
  return Math.max(0,Math.ceil((st.lockUntil-Date.now())/1000));
}
function doLogin(){
  const u=DB.users[selUser];if(!u){document.getElementById('lerr').textContent='Pilih akun dulu';return;}
  const sisa=_sisaLockSec(u);
  if(sisa>0){
    document.getElementById('lerr').textContent='🔒 Terlalu banyak PIN salah. Coba lagi dalam '+sisa+' detik';
    return;
  }
  const pin=document.getElementById('pinInput').value;
  if(pin!==u.pin){
    const st=_loginFailMap[u.id]||{count:0,lockUntil:0};
    st.count++;
    if(st.count>=5){
      st.lockUntil=Date.now()+30000;st.count=0;
      document.getElementById('lerr').textContent='🔒 Terlalu banyak PIN salah. Coba lagi dalam 30 detik';
      // Notif WA kalau sampai dikunci (5x salah)
      notifWaOwnerAksi(
        'LOGIN MENCURIGAKAN — DIKUNCI',
        `Akun: ${u.nama}\n5x PIN salah → akun dikunci 30 detik\nWaspada akses tidak sah!`,
        '🔐'
      );
    }else{
      document.getElementById('lerr').textContent='PIN salah ('+st.count+'/5)';
      // Notif WA mulai dari percobaan ke-3
      if(st.count===3){
        notifWaOwnerAksi(
          'PIN SALAH BERULANG',
          `Akun: ${u.nama}\nSudah 3x PIN salah berturut-turut`,
          '🔑'
        );
      }
    }
    _loginFailMap[u.id]=st;
    document.getElementById('pinInput').value='';
    playBeep(false);
    return;
  }
  _loginFailMap[u.id]={count:0,lockUntil:0};
  me=u;
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').classList.add('show');
  // Sidebar icon
  if(u.fotoUrl){document.getElementById('sbIco').innerHTML=`<img src="${u.fotoUrl}" class="sb-ico" style="width:44px;height:44px;border-radius:50%;object-fit:cover">`;}
  else{document.getElementById('sbIco').textContent=u.ico||'👤';}
  document.getElementById('sbNama').textContent=u.nama;
  document.getElementById('sbRole').textContent=u.role==='owner'?'👑 Pemilik':u.role==='stok'?'📦 Manajer Stok':'🧑 Kasir';
  const isOwner=u.role==='owner';
  const isStokOrOwner=u.role==='owner'||u.role==='stok';
  document.getElementById('app').classList.toggle('is-owner',isOwner);
  document.querySelectorAll('.owner-only').forEach(el=>{el.style.display=isOwner?'':'none';});
  document.querySelectorAll('.stok-only').forEach(el=>{el.style.display=isStokOrOwner?'':'none';});
  applySettings();renderKasir();renderFavBar();startJam();updateTopOmzet();
  playBeep(true);
}
function doLogout(){catatLog('Logout',(me?.nama||'-')+' keluar dari aplikasi');me=null;document.getElementById('app').classList.remove('show','is-owner');document.getElementById('loginScreen').style.display='flex';document.getElementById('pinInput').value='';renderLoginUsers();}

// ============= JAM =============
let _jamInterval=null;
function startJam(){
  if(_jamInterval)clearInterval(_jamInterval);
  function tick(){const n=new Date();document.getElementById('jamDisp').textContent=[n.getHours(),n.getMinutes()].map(x=>String(x).padStart(2,'0')).join(':');}
  tick();_jamInterval=setInterval(tick,30000);
}

// ============= SETTINGS =============
function applySettings(){
  const s=DB.settings||{};
  const nama=s.namaWarung||'Pro';
  document.getElementById('topNama').textContent=nama;
  if(s.logoUrl){
    document.getElementById('topLogo').innerHTML=`<img src="${s.logoUrl}" style="width:22px;height:22px;border-radius:4px;object-fit:cover;vertical-align:middle;">`;
  }else{
    document.getElementById('topLogo').textContent=s.logo||'🛒';
  }
  if(s.tema==='custom'&&s.temaCustom){terapkanWarnaCustom(s.temaCustom);}
  else if(s.tema!=null&&TEMAS[s.tema])terapkanTema(TEMAS[s.tema]);
  if(s.dark)document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  if(s.logoUrl){
    document.getElementById('prevLogo').innerHTML=`<img src="${s.logoUrl}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;">`;
  }else{
    document.getElementById('prevLogo').textContent=s.logo||'🛒';
  }
  document.getElementById('prevNama').textContent=s.namaWarung||'Warung Pro';
  document.getElementById('prevAlamat').textContent=s.alamat||'Alamat warung';
}
function renderSett(){
  const s=DB.settings||{};
  document.getElementById('sNama').value=s.namaWarung||'';
  document.getElementById('sAlamat').value=s.alamat||'';
  document.getElementById('sWA').value=s.waOwner||'';
  document.getElementById('sGS').value=s.gsUrl||'';
  document.getElementById('darkToggle').checked=!!s.dark;
  // Ukuran kertas struk
  const kertas=s.kertasStruk||'58';
  const btn58=document.getElementById('kertasBtn58');
  const btn80=document.getElementById('kertasBtn80');
  if(btn58&&btn80){
    btn58.classList.toggle('active',kertas==='58');
    btn80.classList.toggle('active',kertas==='80');
  }
  document.getElementById('ikoCustom').value=s.logo||'';
  // Logo foto preview
  if(s.logoUrl){
    const prev=document.getElementById('logoFotoPreview');
    prev.src=s.logoUrl;prev.style.display='block';
    document.getElementById('logoFotoPlaceholder').style.display='none';
  }else{
    document.getElementById('logoFotoPreview').style.display='none';
    document.getElementById('logoFotoPlaceholder').style.display='block';
  }
  // Iko grid
  document.getElementById('ikoGrid').innerHTML=IKOS.map(i=>`<button onclick="pilihIko('${i}')" style="font-size:22px;background:${s.logo===i?'var(--gp)':'var(--gl2)'};border:2px solid ${s.logo===i?'var(--gl)':'var(--brd)'};border-radius:8px;padding:5px 8px;cursor:pointer;">${i}</button>`).join('');
  // Warna grid
  const colorGrid=document.getElementById("colorGrid");
  if(colorGrid){
    const curTema=s.tema;
    const curCustom=s.temaCustom||"#2d6a4f";
  const colorGrid=document.getElementById('colorGrid');
  if(colorGrid){
    const curTema=s.tema;
    const curCustom=s.temaCustom||'#2d6a4f';
    colorGrid.style.cssText='display:flex;flex-wrap:wrap;gap:6px;padding:6px 0;';
    colorGrid.innerHTML=TEMAS.map((t,i)=>`<div style="text-align:center;cursor:pointer" onclick="pilihTema(${i})"><div style="width:32px;height:32px;border-radius:50%;background:${t.gm};border:3px solid ${curTema===i?'#fff':'transparent'};outline:2px solid ${curTema===i?t.gm:'transparent'};margin:0 auto;"></div><div style="font-size:9px;color:var(--gray);margin-top:2px">${t.nama}</div></div>`).join('')+
    `<div style="text-align:center"><label style="cursor:pointer" title="Pilih warna sendiri"><div style="width:32px;height:32px;border-radius:50%;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);border:3px solid ${curTema==='custom'?'#fff':'transparent'};outline:2px solid ${curTema==='custom'?curCustom:'transparent'};margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:16px;">🎨</div><div style="font-size:9px;color:var(--gray);margin-top:2px">Custom</div><input type="color" id="customColorPicker" value="${curCustom}" onchange="terapkanWarnaCustom(this.value)" style="opacity:0;width:0;height:0;position:absolute;"></label></div>`;
  }
  }
  // Kategori chips
  document.getElementById('katChips').innerHTML=(DB.kategori||[]).map(k=>`<div class="kchip">${k}<button onclick="hapusKat('${k}')">×</button></div>`).join('');
  // User list
  document.getElementById('ulist').innerHTML=DB.users.map((u,i)=>`<div class="uitem"><div>${u.ico||'👤'} <span class="un">${u.nama}</span><br><span class="ur">${u.role==='owner'?'Pemilik':u.role==='stok'?'Manajer Stok':'Kasir'} · PIN: ${'•'.repeat(u.pin.length)}</span></div><button class="ab2 bh" onclick="hapusUser(${i})">Hapus</button></div>`).join('');
  // Iko user modal
  document.getElementById('uIkoGrid').innerHTML=['👩','👨','🧑','👧','🧒','🧓','👴','👵'].map(i=>`<button onclick="document.querySelectorAll('.uiko-sel').forEach(b=>b.classList.remove('uiko-sel'));this.classList.add('uiko-sel');" style="font-size:22px;background:var(--gl2);border:2px solid var(--brd);border-radius:8px;padding:4px 8px;cursor:pointer;">${i}</button>`).join('');
}
function pilihIko(i){DB.settings.logo=i;DB.settings.logoUrl=null;document.getElementById('prevLogo').textContent=i;document.getElementById('ikoCustom').value=i;renderSett();applySettings();}
function pilihTema(i){DB.settings.tema=i;terapkanTema(TEMAS[i]);renderSett();}
function previewLogo(v){if(v){DB.settings.logo=v;DB.settings.logoUrl=null;}document.getElementById('prevLogo').textContent=v||'🛒';}
function handleLogoFoto(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    DB.settings.logoUrl=ev.target.result;
    DB.settings.logo=null;
    const prev=document.getElementById('logoFotoPreview');
    prev.src=ev.target.result;prev.style.display='block';
    document.getElementById('logoFotoPlaceholder').style.display='none';
    document.getElementById('prevLogo').innerHTML=`<img src="${ev.target.result}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;">`;
    saveDB();showNotif('✅ Foto logo diupload!');
  };
  r.readAsDataURL(f);
}
function hapusLogoFoto(){
  DB.settings.logoUrl=null;
  document.getElementById('logoFotoPreview').style.display='none';
  document.getElementById('logoFotoPlaceholder').style.display='block';
  document.getElementById('logoFotoInput').value='';
  document.getElementById('prevLogo').textContent=DB.settings.logo||'🛒';
  saveDB();showNotif('Foto logo dihapus');
}
function toggleDark(on){DB.settings.dark=on;document.body.classList.toggle('dark',on);saveDB();}
function simpanSett(){
  const s=DB.settings;
  s.namaWarung=document.getElementById('sNama').value||'Warung Pro';
  s.alamat=document.getElementById('sAlamat').value||'';
  s.waOwner=document.getElementById('sWA').value||'';
  s.gsUrl=document.getElementById('sGS').value||'';
  applySettings();saveDB();showNotif('✅ Pengaturan disimpan!');
}
function tambahKat(){const v=document.getElementById('katBaru').value.trim();if(!v)return;if(!DB.kategori.includes(v))DB.kategori.push(v);document.getElementById('katBaru').value='';saveDB();renderSett();renderKatFilter();}
function hapusKat(k){DB.kategori=DB.kategori.filter(x=>x!==k);saveDB();renderSett();renderKatFilter();}
function simpanUser(){
  const nm=document.getElementById('uNama').value.trim();
  const pin=document.getElementById('uPin').value;
  const role=document.getElementById('uRole').value;
  const sel=document.querySelector('.uiko-sel');
  const ico=sel?sel.textContent:'🧑';
  if(!nm||!pin){showNotif('Isi nama & PIN',1);return;}
  if(!/^\d{4,6}$/.test(pin)){showNotif('⚠ PIN harus 4-6 digit angka',1);return;}
  if(DB.users.some(u=>u.pin===pin)){showNotif('⚠ PIN sudah dipakai pengguna lain, pilih PIN lain',1);return;}
  DB.users.push({id:Date.now(),nama:nm,role,pin,ico});
  catatLog('Tambah Pengguna', nm+' sebagai '+(role==='owner'?'Pemilik':role==='stok'?'Manajer Stok':'Kasir'));
  saveDB();tutupM('mUser');renderSett();showNotif('✅ Pengguna ditambah!');
}
function hapusUser(i){
  if(DB.users.length<=1){showNotif('Min. 1 pengguna',1);return;}
  const u=DB.users[i];
  catatLog('Hapus Pengguna', u?.nama||'(tidak diketahui)');
  notifWaOwnerAksi(
    'PENGGUNA DIHAPUS',
    `Nama: ${u?.nama||'-'}\nRole: ${u?.role==='owner'?'Pemilik':u?.role==='stok'?'Manajer Stok':'Kasir'}`,
    '👤'
  );
  DB.users.splice(i,1);saveDB();renderSett();
}

// ============= SIDEBAR =============
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sbOverlay').classList.toggle('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sbOverlay').classList.remove('open');}
function goPage(id,btn){
  const ownerOnly=['tutup','laporan','pengaturan','activitylog'];
  const stokAccess=['stok','opname','riwayatStok','pembelian','supplier','bundling'];
  if(ownerOnly.includes(id)&&me&&me.role!=='owner'){showNotif('⚠ Hanya untuk Pemilik',1);return;}
  if(stokAccess.includes(id)&&me&&me.role==='kasir'){showNotif('⚠ Hanya Pemilik atau Manajer Stok',1);return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b=>b.classList.remove('active'));
  const pg=document.getElementById('page-'+id);if(pg)pg.classList.add('active');
  if(btn)btn.classList.add('active');
  closeSidebar();
  if(id==='stok')renderStok();
  else if(id==='hutang')renderHutang();
  else if(id==='laporan')renderLaporan();
  else if(id==='tutup')renderTutup();
  else if(id==='pengaturan')renderSett();
  else if(id==='activitylog')renderActivityLog();
  else if(id==='supplier')renderSupplier();
  else if(id==='pembelian')renderPembelian();
  else if(id==='pengeluaran')renderPengeluaran();
  else if(id==='riwayatStok')renderRiwayatStok();
  else if(id==='opname')renderOpname();
  else if(id==='pelanggan')renderPelanggan();
  else if(id==='kaskecil')renderKasKecil();
  else if(id==='retur')renderRetur();
}

// ============= MODAL HELPERS =============
function bukaM(id){document.getElementById(id).classList.add('open');}
function tutupM(id){document.getElementById(id).classList.remove('open');}
// Pengganti confirm() bawaan browser — confirm()/prompt() native sering tidak tampil
// di Chrome Android sehingga tombol terasa "tidak bisa dipencet". Modal kustom ini
// dijamin selalu tampil karena dibangun dari HTML/CSS biasa, bukan dialog browser.
function konfirmasi(pesan,onYa,opt={}){
  document.getElementById('konfPesan').textContent=pesan;
  document.getElementById('konfIcon').textContent=opt.icon||'⚠️';
  const btn=document.getElementById('konfBtnYa');
  btn.textContent=opt.labelYa||'✔ Ya, Lanjutkan';
  btn.style.background=opt.warna||'var(--r)';
  // Ganti onclick tiap panggilan supaya tidak menumpuk listener lama
  btn.onclick=()=>{tutupM('mKonfirmasi');onYa();};
  bukaM('mKonfirmasi');
}

// ============= UPDATE OMZET TOPBAR =============
function updateTopOmzet(){
  const tot=DB.transaksi.filter(t=>!t.void).reduce((s,t)=>s+t.total,0);
  document.getElementById('omzetDisp').textContent=fRp(tot);
}

