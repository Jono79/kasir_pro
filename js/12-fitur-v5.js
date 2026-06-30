// ============= V5: DASHBOARD HOME =============
function renderHome(){
  const now=new Date();
  const jam=now.getHours();
  const greet=jam<11?'Selamat pagi ☀️':jam<15?'Selamat siang 🌤':jam<18?'Selamat sore 🌇':'Selamat malam 🌙';
  const el=id=>document.getElementById(id);
  if(el('homeGreet'))el('homeGreet').textContent=greet;
  if(el('homeNama'))el('homeNama').textContent=(DB.settings?.namaWarung)||'Kasir Warung Pro';
  if(el('homeTanggal'))el('homeTanggal').textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // Stats hari ini
  const trxHari=DB.transaksi.filter(t=>!t.void&&new Date(t.waktu).toDateString()===now.toDateString());
  const omzet=trxHari.reduce((s,t)=>s+t.total,0);
  const jmlTrx=trxHari.length;
  const penHari=DB.pengeluaran.filter(k=>new Date(k.waktu).toDateString()===now.toDateString()).reduce((s,k)=>s+k.nominal,0);
  const stokHabis=DB.produk.filter(p=>!p.timbang&&p.stok<=0).length;
  if(el('homeStatsRow'))el('homeStatsRow').innerHTML=`
    <div class="hs-card"><div class="hsc-icon">💰</div><div class="hsc-val">${fRp(omzet)}</div><div class="hsc-label">Omzet Hari Ini</div></div>
    <div class="hs-card"><div class="hsc-icon">🧾</div><div class="hsc-val">${jmlTrx}</div><div class="hsc-label">Transaksi</div></div>
    <div class="hs-card"><div class="hsc-icon">💸</div><div class="hsc-val" style="color:var(--r)">${fRp(penHari)}</div><div class="hsc-label">Pengeluaran</div></div>
    <div class="hs-card" onclick="goPage('stok',document.getElementById('mnuStok'))" style="cursor:pointer"><div class="hsc-icon">📦</div><div class="hsc-val" style="color:${stokHabis>0?'var(--r)':'var(--gm)'}">${stokHabis}</div><div class="hsc-label">Stok Habis</div></div>`;

  // Target omzet
  renderTargetCard(omzet);

  // Recent transaksi
  const recent=[...DB.transaksi].reverse().slice(0,3);
  if(el('homeRecentList')){
    if(!recent.length){el('homeRecentList').innerHTML='<div class="empty-s" style="padding:12px"><p>Belum ada transaksi hari ini</p></div>';}
    else el('homeRecentList').innerHTML=recent.map((t,i)=>`
      <div class="recent-card" onclick="repeatOrder(${DB.transaksi.length-1-i})">
        <div class="recent-ico">${{'tunai':'💵','transfer':'🏦','qris':'📲','kredit':'💳'}[t.metode]||'🧾'}</div>
        <div class="recent-body">
          <div class="recent-nama">${t.items.map(x=>x.nama).join(', ')}</div>
          <div class="recent-info">${fJam(t.waktu)} · ${t.items.length} item · 👤 ${t.kasir}</div>
        </div>
        <div style="text-align:right">
          <div class="recent-tot">${fRp(t.total)}</div>
          <div style="font-size:9px;color:var(--gray);margin-top:2px">🔁 Ulangi</div>
        </div>
      </div>`).join('');
  }

  // Stok alert
  const lowStok=DB.produk.filter(p=>!p.timbang&&p.stok<=(p.minStok||5)&&p.stok>0);
  const habis=DB.produk.filter(p=>!p.timbang&&p.stok<=0);
  const alertSec=el('homeStokAlertSec');
  if(alertSec){
    if(lowStok.length||habis.length){
      alertSec.style.display='block';
      el('homeStokAlertList').innerHTML=[
        ...habis.map(p=>`<div style="background:var(--rl);border:1.5px solid var(--r);border-radius:9px;padding:8px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;font-weight:700;color:var(--r)">🚫 ${p.nama}</span><span style="font-size:11px;color:var(--r);font-weight:700">HABIS</span></div>`),
        ...lowStok.map(p=>`<div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:9px;padding:8px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:12px;font-weight:700;color:#92400e">⚠ ${p.nama}</span><span style="font-size:11px;color:#92400e;font-weight:700">Sisa ${p.stok}</span></div>`)
      ].join('');
    } else alertSec.style.display='none';
  }

  // Shift button
  const shiftIco=el('homeShiftIco');const shiftLbl=el('homeShiftLbl');
  if(shiftIco&&shiftLbl){
    if(DB.shiftAktif){shiftIco.textContent='🔴';shiftLbl.textContent='Akhiri Shift';}
    else{shiftIco.textContent='⏱';shiftLbl.textContent='Mulai Shift';}
  }
}
function renderTargetCard(omzetHariIni){
  const el=document.getElementById('targetCard');if(!el)return;
  const target=DB.settings?.targetOmzet||0;
  if(!target){
    el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:12px;color:var(--gray)">Belum set target</div><div style="font-size:11px;color:var(--gray);margin-top:2px">Tap untuk set target harian</div></div><button class="btn-sec" onclick="bukaM('mTarget')" style="font-size:11px">Set Target</button></div>`;
    return;
  }
  const pct=Math.min(100,Math.round((omzetHariIni/target)*100));
  const sisa=Math.max(0,target-omzetHariIni);
  el.innerHTML=`
    <div class="target-row">
      <span class="target-label">🎯 ${fRp(omzetHariIni)} / ${fRp(target)}</span>
      <span class="target-pct" style="color:${pct>=100?'var(--gm)':'#d97706'}">${pct}%</span>
    </div>
    <div class="target-bar-bg"><div class="target-bar-fill" style="width:${pct}%;background:${pct>=100?'var(--gm)':'linear-gradient(90deg,#f59e0b,#d97706)'}"></div></div>
    <div class="target-sub">
      <span>${pct>=100?'🎉 Target tercapai!':'Kurang '+fRp(sisa)+' lagi'}</span>
      <button onclick="bukaM('mTarget')" style="background:none;border:none;font-size:10px;color:var(--gm);cursor:pointer;font-weight:700">Ubah</button>
    </div>`;
}

// ============= V5: TARGET OMZET =============
function simpanTarget(){
  const nom=parseInt(document.getElementById('targetNominal').value)||0;
  if(!nom){showNotif('Isi nominal target',1);return;}
  if(!DB.settings)DB.settings={};
  DB.settings.targetOmzet=nom;saveDB();tutupM('mTarget');
  showNotif('🎯 Target '+fRp(nom)+' disimpan!');
  if(document.getElementById('page-home').classList.contains('active'))renderHome();
}

// ============= V5: SHIFT =============
let _shiftTimer=null;
function toggleShift(){
  if(DB.shiftAktif)akhiriShift();
  else mulaiShift();
}
function mulaiShift(){
  DB.shiftAktif={mulai:new Date().toISOString(),kasir:me?.nama||'-',trxAwal:DB.transaksi.length};
  saveDB();updateShiftBar();showNotif('⏱ Shift dimulai!');
  renderHome();
}
function akhiriShift(){
  if(!DB.shiftAktif){showNotif('Tidak ada shift aktif',1);return;}
  const shift=DB.shiftAktif;
  const trxShift=DB.transaksi.slice(shift.trxAwal).filter(t=>!t.void);
  const omzet=trxShift.reduce((s,t)=>s+t.total,0);
  const dur=Math.round((new Date()-new Date(shift.mulai))/60000);
  const content=`
    <div style="background:var(--gp);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="font-size:12px;color:var(--gray)">Kasir: <b>${shift.kasir}</b></div>
      <div style="font-size:12px;color:var(--gray)">Mulai: <b>${new Date(shift.mulai).toLocaleString('id-ID')}</b></div>
      <div style="font-size:12px;color:var(--gray)">Selesai: <b>${new Date().toLocaleString('id-ID')}</b></div>
      <div style="font-size:12px;color:var(--gray)">Durasi: <b>${Math.floor(dur/60)}j ${dur%60}m</b></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="hs-card"><div class="hsc-icon">💰</div><div class="hsc-val">${fRp(omzet)}</div><div class="hsc-label">Omzet</div></div>
      <div class="hs-card"><div class="hsc-icon">🧾</div><div class="hsc-val">${trxShift.length}</div><div class="hsc-label">Transaksi</div></div>
    </div>
    ${trxShift.length?'<div style="font-size:12px;font-weight:700;margin-bottom:6px">Detail Transaksi:</div>'+
    trxShift.slice(-5).map(t=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--brd)"><span>${fJam(t.waktu)} · ${t.items.length} item</span><span style="font-weight:700">${fRp(t.total)}</span></div>`).join(''):''}`;
  document.getElementById('shiftReportContent').innerHTML=content;
  DB._lastShiftReport={shift,omzet,trxCount:trxShift.length,dur};
  DB.shiftAktif=null;saveDB();
  if(_shiftTimer)clearInterval(_shiftTimer);
  updateShiftBar();bukaM('mShiftReport');renderHome();
}
function updateShiftBar(){
  const bar=document.getElementById('shiftBar');if(!bar)return;
  if(DB.shiftAktif){
    bar.style.display='flex';
    document.getElementById('shiftMulaiLabel').textContent='Mulai '+new Date(DB.shiftAktif.mulai).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    if(_shiftTimer)clearInterval(_shiftTimer);
    _shiftTimer=setInterval(()=>{
      const dur=Math.round((new Date()-new Date(DB.shiftAktif.mulai))/1000);
      const h=Math.floor(dur/3600);const m=Math.floor((dur%3600)/60);const s=dur%60;
      const timerEl=document.getElementById('shiftTimer');
      if(timerEl)timerEl.textContent=(h?h+'h ':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    },1000);
  } else {
    bar.style.display='none';
    if(_shiftTimer)clearInterval(_shiftTimer);
  }
}
function shareShiftReport(){
  const r=DB._lastShiftReport;if(!r)return;
  const s=DB.settings||{};
  const dur=r.dur;
  const teks=`📋 *LAPORAN SHIFT*\n${s.namaWarung||'Warung Pro'}\n\nKasir: ${r.shift.kasir}\nMulai: ${new Date(r.shift.mulai).toLocaleString('id-ID')}\nDurasi: ${Math.floor(dur/60)}j ${dur%60}m\n\n💰 Omzet: *${fRp(r.omzet)}*\n🧾 Transaksi: *${r.trxCount}x*`;
  if(navigator.share){navigator.share({text:teks});}else{window.open('https://wa.me/?text='+encodeURIComponent(teks));}
}

// ============= V5: BUNDLING =============
function renderBundling(){
  if(!DB.bundling)DB.bundling=[];
  const list=document.getElementById('bundlingList');
  if(!DB.bundling.length){list.innerHTML='<div class="empty-s"><div class="ei">🎁</div><p>Belum ada produk paket</p><p style="font-size:11px;margin-top:4px">Paket akan muncul di kasir</p></div>';return;}
  list.innerHTML=DB.bundling.map((b,i)=>`
    <div class="bundling-card">
      <div class="bundling-head">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:24px">${b.emoji||'🎁'}</span>
          <div><div style="font-size:14px;font-weight:800;color:var(--txt)">${b.nama}</div>
            <span class="bundling-badge">PAKET</span> <span style="font-size:11px;color:var(--gray)">${b.kategori||'-'}</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Space Mono',monospace;font-weight:800;color:var(--gm)">${fRp(b.harga)}</div>
          <button class="ab2 bh" onclick="hapusBundling(${i})" style="margin-top:4px">🗑</button>
        </div>
      </div>
      <div class="bundling-items">📦 ${b.items}</div>
    </div>`).join('');
}
function simpanBundling(){
  const nm=document.getElementById('bndNama').value.trim();
  const harga=parseInt(document.getElementById('bndHarga').value)||0;
  const items=document.getElementById('bndItems').value.trim();
  if(!nm||!harga){showNotif('Isi nama & harga paket',1);return;}
  if(!DB.bundling)DB.bundling=[];
  DB.bundling.push({id:Date.now(),nama:nm,emoji:document.getElementById('bndEmoji').value||'🎁',harga,items,kategori:document.getElementById('bndKategori').value.trim()||'Paket'});
  saveDB();tutupM('mBundling');renderBundling();renderProduk();
  showNotif('✅ Paket '+nm+' ditambahkan!');
  ['bndNama','bndHarga','bndItems','bndKategori'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('bndEmoji').value='🎁';
}
function hapusBundling(i){konfirmasi('Hapus paket ini?',()=>{DB.bundling.splice(i,1);saveDB();renderBundling();renderProduk();});}

// ============= V5: DISKON CEPAT =============
function setDiskonCepat(pct){
  setDiskonType('pct');
  document.getElementById('diskonVal').value=pct;
  hitungDiskon();
  showNotif('✂️ Diskon '+pct+'% diterapkan');
}

// ============= V5: ANIMASI KEMBALIAN =============
function showKemAnim(kem){
  const box=document.getElementById('kemAnimBox');
  const kembox=document.getElementById('kembox');
  if(!box)return;
  if(kem<=0){box.style.display='none';if(kembox)kembox.style.display='none';return;}
  const uang=kem>=100000?'💵💵':kem>=50000?'💵':'🪙';
  document.getElementById('kemAnimUang').textContent=uang;
  document.getElementById('kemAnimVal').textContent=fRp(kem);
  box.style.display='block';
  if(kembox)kembox.style.display='none';
  // Reset animation
  const ico=document.getElementById('kemAnimUang');
  ico.style.animation='none';ico.offsetHeight;ico.style.animation='bounceIn .4s ease';
}

// ============= V5: REPEAT ORDER =============
function repeatLastOrder(){
  const last=DB.transaksi[DB.transaksi.length-1];
  if(!last){showNotif('Belum ada transaksi',1);return;}
  repeatOrder(DB.transaksi.length-1);
}
function repeatOrder(idx){
  const t=DB.transaksi[idx];if(!t)return;
  keranjang=[];
  t.items.forEach(it=>{
    const p=DB.produk.find(x=>x.id===it.id);
    if(p){for(let i=0;i<it.qty;i++)tambahKeranjang(p.id);}
  });
  goPage('kasir',document.getElementById('mnuKasir'));
  setTimeout(()=>bukaKeranjang(),300);
  showNotif('🔁 Order diulangi! ('+t.items.length+' item)');
}

// ============= V5: KEYBOARD SHORTCUTS =============
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    // Tutup modal yang terbuka
    document.querySelectorAll('.mov.show').forEach(m=>m.classList.remove('show'));
  }
  if(e.key==='Enter'&&e.ctrlKey){
    // Ctrl+Enter = buka bayar
    const btn=document.getElementById('btnBayar');
    if(btn&&!btn.disabled)bukaBayar();
  }
  if(e.key==='f'&&e.ctrlKey){
    // Ctrl+F = fokus search
    e.preventDefault();
    const s=document.getElementById('searchP');if(s){s.focus();s.select();}
  }
});

// ============= V5: UPDATE goPage for new pages =============
const _goPageV4=goPage;
goPage=function(id,btn){
  const pages=['home','kasir','stok','hutang','laporan','tutup','pengaturan','supplier','pembelian','pengeluaran','riwayatStok','opname','pelanggan','kaskecil','retur','bundling'];
  const ownerOnly=['tutup','laporan','pengaturan'];
  const stokAccess=['stok','opname','riwayatStok','pembelian','supplier','bundling'];
  if(ownerOnly.includes(id)&&me&&me.role!=='owner'){showNotif('⚠ Hanya untuk Pemilik',1);return;}
  if(stokAccess.includes(id)&&me&&me.role==='kasir'){showNotif('⚠ Hanya Pemilik atau Manajer Stok',1);return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b=>b.classList.remove('active'));
  const pg=document.getElementById('page-'+id);if(pg)pg.classList.add('active');
  if(btn)btn.classList.add('active');
  closeSidebar();
  if(id==='home')renderHome();
  else if(id==='stok')renderStok();
  else if(id==='hutang')renderHutang();
  else if(id==='laporan')renderLaporan();
  else if(id==='tutup')renderTutup();
  else if(id==='pengaturan')renderSett();
  else if(id==='supplier')renderSupplier();
  else if(id==='pembelian')renderPembelian();
  else if(id==='pengeluaran')renderPengeluaran();
  else if(id==='riwayatStok')renderRiwayatStok();
  else if(id==='opname')renderOpname();
  else if(id==='pelanggan')renderPelanggan();
  else if(id==='kaskecil')renderKasKecil();
  else if(id==='retur')renderRetur();
  else if(id==='bundling')renderBundling();
};

// ============= V5: UPDATE hitungKem for animation =============
const _hitungKemOrig=hitungKem;
hitungKem=function(){
  _hitungKemOrig();
  const bayar=parseInt(document.getElementById('uangBayar').value)||0;
  const{total}=hitungTotal();
  const kem=bayar-total;
  if(kem>0)showKemAnim(kem);
  else document.getElementById('kemAnimBox').style.display='none';
};

// ============= V5: UPDATE renderProduk to include bundling =============
const _renderProdukOrig=renderProduk;
renderProduk=function(){
  _renderProdukOrig();
  // Inject bundling produk into grid
  if(!DB.bundling||!DB.bundling.length)return;
  const q=(document.getElementById('searchP')?.value||'').toLowerCase();
  const grid=document.getElementById('pgrid');if(!grid)return;
  const filtered=DB.bundling.filter(b=>!q||b.nama.toLowerCase().includes(q)||(b.kategori||'').toLowerCase().includes(q));
  if(!filtered.length)return;
  filtered.forEach(b=>{
    const div=document.createElement('div');
    div.className='prod-card';
    div.innerHTML=`<div class="pc-top"><span class="pc-img" style="font-size:28px">${b.emoji||'🎁'}</span><span class="bundling-badge" style="position:absolute;top:4px;right:4px;font-size:8px">PAKET</span></div><div class="pc-nama">${b.nama}</div><div class="pc-harga">${fRp(b.harga)}</div>`;
    div.style.position='relative';
    div.onclick=()=>{
      keranjang.push({id:'bnd_'+b.id,nama:b.nama,harga:b.harga,hargaCustom:null,qty:1,emoji:b.emoji,isBundling:true});
      updateFabCount();showNotif('🎁 '+b.nama+' ditambah!');
      div.classList.add('add-pop');setTimeout(()=>div.classList.remove('add-pop'),200);
    };
    grid.appendChild(div);
  });
};

// ============= V5: INIT SHIFT on login =============
const _doLoginV4=doLogin;
doLogin=function(){
  _doLoginV4();
  setTimeout(()=>{
    updateShiftBar();
    if(!DB.shiftAktif){
      // Auto go to home on login
      goPage('home',document.getElementById('mnuHome'));
    }
  },600);
};

// Unlock AudioContext pada sentuhan/klik pertama (wajib di browser mobile karena
// autoplay policy memblokir audio sebelum ada interaksi user).
document.addEventListener('touchstart',()=>{_getAudioCtx();},{once:true,passive:true});
document.addEventListener('click',()=>{_getAudioCtx();},{once:true});

loadDB();
