// ============= V4 NEW FEATURES =============

// GRAFIK PERIODE
let _grafikMode='mingguan';
function switchGrafikMode(mode,btn){
  _grafikMode=mode;
  document.querySelectorAll('.grafik-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderGrafikPeriod(mode);
}
function renderGrafikPeriod(mode){
  const canvas=document.getElementById('grafikPeriod');if(!canvas)return;
  const title=document.getElementById('grafikPeriodTitle');
  const now=new Date();let labels=[],data=[];
  if(mode==='mingguan'){
    title.textContent='📅 Omzet 7 Hari Terakhir';
    for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);
      labels.push(d.toLocaleDateString('id-ID',{weekday:'short',day:'numeric'}));
      data.push(DB.transaksi.filter(t=>!t.void&&new Date(t.waktu).toDateString()===d.toDateString()).reduce((s,t)=>s+t.total,0));}
  } else {
    title.textContent='📅 Omzet 30 Hari Terakhir';
    for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);
      labels.push(i%5===0?d.toLocaleDateString('id-ID',{day:'numeric',month:'short'}):'');
      data.push(DB.transaksi.filter(t=>!t.void&&new Date(t.waktu).toDateString()===d.toDateString()).reduce((s,t)=>s+t.total,0));}
  }
  setTimeout(()=>{
    canvas.width=canvas.offsetWidth||320;canvas.height=120;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
    const maxV=Math.max(...data)||1;
    const gmC=getComputedStyle(document.documentElement).getPropertyValue('--gm').trim()||'#2d6a4f';
    const barW=Math.floor((canvas.width-20)/data.length)-2;const padL=10;
    data.forEach((v,i)=>{
      const x=padL+i*(barW+2);const barH=Math.round((v/maxV)*(canvas.height-24));
      if(barH>0){const grad=ctx.createLinearGradient(0,canvas.height-24-barH,0,canvas.height-24);
        grad.addColorStop(0,gmC);grad.addColorStop(1,gmC+'44');ctx.fillStyle=grad;
        ctx.beginPath();ctx.roundRect?ctx.roundRect(x,canvas.height-24-barH,barW,barH,2):ctx.rect(x,canvas.height-24-barH,barW,barH);ctx.fill();}
      if(labels[i]){ctx.fillStyle='#6b7280';ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillText(labels[i],x+barW/2,canvas.height-6);}
      if(v>0&&barH>10){ctx.fillStyle='#fff';ctx.font='7px sans-serif';ctx.textAlign='center';
        const vL=v>=1e6?(v/1e6).toFixed(1)+'jt':v>=1e3?(v/1e3).toFixed(0)+'k':''+v;ctx.fillText(vL,x+barW/2,canvas.height-24-barH+9);}
    });
  },80);
}
function renderTop10Produk(){
  const cm={};DB.transaksi.filter(t=>!t.void).forEach(t=>t.items.forEach(i=>{cm[i.nama]=(cm[i.nama]||0)+i.qty;}));
  const top10=Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const el=document.getElementById('top10ProdukList');if(!el)return;
  if(!top10.length){el.innerHTML='<div class="empty-s" style="padding:12px"><p>Belum ada data</p></div>';return;}
  const maxQ=top10[0][1];
  const gmC=getComputedStyle(document.documentElement).getPropertyValue('--gm').trim()||'#2d6a4f';
  el.innerHTML=top10.map(([nm,qty],i)=>`<div class="tpl-item"><div class="tpl-item-row"><span class="tpl-nama">${i+1}. ${nm}</span><span class="tpl-qty">${qty}x</span></div><div class="tpl-bar"><div class="tpl-bar-fill" style="width:${Math.round(qty/maxQ*100)}%;background:${gmC}"></div></div></div>`).join('');
}

// PELANGGAN & POIN
let _pelangganTerpilih=null,_poinRedeemed=0;
function renderPelanggan(){
  const list=document.getElementById('pelangganList');
  if(!DB.pelanggan.length){list.innerHTML='<div class="empty-s"><div class="ei">🎁</div><p>Belum ada pelanggan terdaftar</p></div>';return;}
  list.innerHTML=DB.pelanggan.map((p,i)=>{
    const nilaiPoin=(DB.settings?.poinNilai||50)*(p.poin||0);
    const totalBelanja=DB.transaksi.filter(t=>!t.void&&t.pelangganId===p.id).reduce((s,t)=>s+t.total,0);
    return `<div class="pelanggan-card">
      <div class="pel-ico">🧑</div>
      <div class="pel-body"><div class="pel-nama">${p.nama}</div><div class="pel-info">${p.wa?'📱 '+p.wa:'-'} ${p.catatan?'· '+p.catatan:''}</div>
        <div class="pel-info" style="color:var(--gm);font-weight:700">${fRp(totalBelanja)} total belanja</div></div>
      <div style="text-align:right">
        <div class="pel-poin">⭐ ${p.poin||0}</div>
        <div style="font-size:10px;color:var(--gray)">≈ ${fRp(nilaiPoin)}</div>
        <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
          ${p.wa?`<button class="ab2 be" onclick="window.open('https://wa.me/${p.wa}')">📱</button>`:''}
          <button class="ab2 bh" onclick="hapusPelanggan(${i})">🗑</button>
        </div>
      </div></div>`;
  }).join('');
}
function simpanPelanggan(){
  const nm=document.getElementById('pelNama').value.trim();
  if(!nm){showNotif('Isi nama pelanggan',1);return;}
  DB.pelanggan.push({id:Date.now(),nama:nm,wa:document.getElementById('pelWa').value.trim(),catatan:document.getElementById('pelCatatan').value.trim(),poin:0,tglDaftar:new Date().toISOString()});
  saveDB();tutupM('mPelanggan');renderPelanggan();showNotif('✅ Pelanggan didaftarkan!');
  ['pelNama','pelWa','pelCatatan'].forEach(id=>document.getElementById(id).value='');
}
function hapusPelanggan(i){konfirmasi('Hapus pelanggan?',()=>{DB.pelanggan.splice(i,1);saveDB();renderPelanggan();});}
function renderPilihPelanggan(){
  const q=(document.getElementById('cariPelanggan').value||'').toLowerCase();
  const list=document.getElementById('daftarPilihPelanggan');
  const filtered=DB.pelanggan.filter(p=>!q||p.nama.toLowerCase().includes(q)||(p.wa||'').includes(q));
  if(!filtered.length){list.innerHTML='<div class="empty-s" style="padding:12px"><p>Tidak ditemukan. <a href="#" onclick="goPage(\'pelanggan\',document.getElementById(\'mnuPelanggan\'));tutupM(\'mPilihPelanggan\')" style="color:var(--gm)">Daftarkan?</a></p></div>';return;}
  list.innerHTML=filtered.map(p=>`
    <div onclick="pilihPelanggan(${p.id})" style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--brd);cursor:pointer;background:${_pelangganTerpilih?.id===p.id?'var(--gp)':'var(--w)'}">
      <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#fef3c7,#fde68a);display:flex;align-items:center;justify-content:center;font-size:18px">🧑</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--txt)">${p.nama}</div><div style="font-size:11px;color:var(--gray)">${p.wa||'-'}</div></div>
      <div class="pel-poin">⭐ ${p.poin||0}</div>
    </div>`).join('');
}
function pilihPelanggan(id){
  _pelangganTerpilih=DB.pelanggan.find(p=>p.id===id)||null;_poinRedeemed=0;
  tutupM('mPilihPelanggan');updatePelangganBar();updatePoinRedeemRow();
}
function clearPelangganTerpilih(){_pelangganTerpilih=null;_poinRedeemed=0;tutupM('mPilihPelanggan');updatePelangganBar();updatePoinRedeemRow();}
function updatePelangganBar(){
  const bar=document.getElementById('pelangganTerpilihBar');if(!bar)return;
  if(_pelangganTerpilih){
    bar.style.display='flex';
    document.getElementById('pelangganTerpilihNama').textContent=_pelangganTerpilih.nama;
    document.getElementById('pelangganTerpilihPoin').textContent=((_pelangganTerpilih.poin||0)-_poinRedeemed)+' poin';
  } else bar.style.display='none';
}
function updatePoinRedeemRow(){
  const row=document.getElementById('poinRedeemRow');if(!row)return;
  if(_pelangganTerpilih&&(_pelangganTerpilih.poin||0)>0&&_poinRedeemed===0){
    row.style.display='flex';
    document.getElementById('poinAvailDisp').textContent=(_pelangganTerpilih.poin||0)+' poin = '+fRp((_pelangganTerpilih.poin||0)*(DB.settings?.poinNilai||50));
  } else row.style.display='none';
}
function redeemPoin(){
  if(!_pelangganTerpilih)return;
  const poin=_pelangganTerpilih.poin||0;if(poin<=0){showNotif('Poin tidak cukup',1);return;}
  const nilaiRp=poin*(DB.settings?.poinNilai||50);
  const{total}=hitungTotal();const redeem=Math.min(nilaiRp,total);
  _poinRedeemed=poin;
  diskonType='rp';diskonVal=redeem;
  document.getElementById('diskonVal').value=redeem;
  document.getElementById('btnDiskonRp').classList.add('active');document.getElementById('btnDiskonPct').classList.remove('active');
  hitungDiskon();updatePoinRedeemRow();
  showNotif('🎁 '+poin+' poin = '+fRp(redeem)+' diskon!');
}
function tambahPoinPelanggan(pelId,total){
  const p=DB.pelanggan.find(x=>x.id===pelId);if(!p)return;
  const rpPerPoin=DB.settings?.poinRpPerPoin||10000;
  const poinBaru=Math.floor(total/rpPerPoin);
  if(_poinRedeemed>0)p.poin=Math.max(0,(p.poin||0)-_poinRedeemed);
  p.poin=(p.poin||0)+poinBaru;
  if(poinBaru>0)showNotif('🎁 +'+poinBaru+' poin untuk '+p.nama+'!');
}

// STRUK WA PELANGGAN
function kirimStrukWaPelanggan(){
  const t=_lastTrx();if(!t)return;
  if(_pelangganTerpilih&&_pelangganTerpilih.wa){
    const s=DB.settings||{};
    let teks=`🧾 *STRUK ${s.namaWarung||'Warung Pro'}*\n${new Date(t.waktu).toLocaleString('id-ID')}\n\n`;
    t.items.forEach(it=>{const h=it.hargaCustom!==null?it.hargaCustom:it.harga;teks+=`• ${it.nama} x${it.qty} = ${fRp(h*it.qty)}\n`;});
    teks+=`\n*TOTAL: ${fRp(t.total)}*\n`;
    if(t.metode==='tunai')teks+=`Kembalian: ${fRp(t.kembalian)}\n`;
    if(_pelangganTerpilih)teks+=`\n🎁 Poin kamu: *${_pelangganTerpilih.poin||0} poin*\n`;
    teks+=`\nTerima kasih sudah belanja! 🙏`;
    window.open('https://wa.me/'+_pelangganTerpilih.wa+'?text='+encodeURIComponent(teks));
  } else shareStruk();
}

// KAS KECIL
let _kkJenis='masuk';
function setKKJenis(j,btn){_kkJenis=j;document.querySelectorAll('#mKasKecil .metode-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function renderKasKecil(){
  document.getElementById('kasKecilSaldo').textContent=fRp(DB.kasKecilSaldo||0);
  document.getElementById('kasKecilModal').textContent=fRp(DB.kasKecilSaldo||0);
  const list=document.getElementById('kasKecilList');
  if(!DB.kasKecil.length){list.innerHTML='<div class="empty-s"><div class="ei">💰</div><p>Belum ada transaksi kas kecil</p></div>';return;}
  list.innerHTML=[...DB.kasKecil].reverse().map((k,i)=>`
    <div class="kas-kecil-txn">
      <div class="kkt-type ${k.jenis==='masuk'?'kkt-masuk':'kkt-keluar'}">${k.jenis==='masuk'?'📥':'📤'}</div>
      <div style="flex:1"><div style="font-weight:700;color:var(--txt)">${k.ket}</div><div style="font-size:10px;color:var(--gray)">${fTgl(k.waktu)} · ${k.jenis==='masuk'?'Masuk':'Keluar'}</div></div>
      <div style="text-align:right">
        <div style="font-family:'Space Mono',monospace;font-weight:800;font-size:13px;color:${k.jenis==='masuk'?'var(--gm)':'var(--r)'}">${k.jenis==='masuk'?'+':'-'}${fRp(k.nominal)}</div>
        <button class="ab2 bh" style="font-size:10px;padding:2px 5px;margin-top:3px" onclick="hapusKasKecil(${DB.kasKecil.length-1-i})">🗑</button>
      </div>
    </div>`).join('');
}
function simpanKasKecil(){
  const nom=parseInt(document.getElementById('kkNominal').value)||0;
  const ket=document.getElementById('kkKet').value.trim();
  if(!nom||!ket){showNotif('Isi nominal & keterangan',1);return;}
  DB.kasKecil.push({jenis:_kkJenis,nominal:nom,ket,waktu:new Date().toISOString()});
  DB.kasKecilSaldo=(_kkJenis==='masuk')?(DB.kasKecilSaldo||0)+nom:Math.max(0,(DB.kasKecilSaldo||0)-nom);
  saveDB();tutupM('mKasKecil');renderKasKecil();
  showNotif(`✅ ${_kkJenis==='masuk'?'Setor':'Tarik'} kas ${fRp(nom)}`);
  document.getElementById('kkNominal').value='';document.getElementById('kkKet').value='';
}
function hapusKasKecil(i){
  konfirmasi('Hapus catatan kas kecil ini?',()=>{
    const k=DB.kasKecil[i];
    DB.kasKecilSaldo=(k.jenis==='masuk')?(DB.kasKecilSaldo||0)-k.nominal:(DB.kasKecilSaldo||0)+k.nominal;
    DB.kasKecil.splice(i,1);saveDB();renderKasKecil();
  });
}

// RETUR
let _returTindakan='kembalikan';
function setReturTindakan(t,btn){_returTindakan=t;document.querySelectorAll('#mRetur .metode-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function renderRetur(){
  document.getElementById('returProduk').innerHTML=DB.produk.map(p=>`<option value="${p.id}">${p.nama}</option>`).join('');
  const list=document.getElementById('returList');
  if(!DB.retur||!DB.retur.length){list.innerHTML='<div class="empty-s"><div class="ei">🔄</div><p>Belum ada retur</p></div>';return;}
  list.innerHTML=[...DB.retur].reverse().map(r=>`
    <div class="retur-card">
      <div class="retur-head"><div><div style="font-size:13px;font-weight:800;color:var(--txt)">${r.produkNama}</div><div style="font-size:11px;color:var(--gray)">${fTgl(r.waktu)} · Ref: ${r.ref||'-'}</div></div>
        <span class="retur-badge">🔄 Retur</span></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--txt2)">
        <span>Qty: <b>${r.qty}</b></span><span>Alasan: <b>${r.alasan}</b></span>
        <span>Tindakan: <b>${r.tindakan==='kembalikan'?'↩ Stok dikembalikan':'🔁 Ganti produk'}</b></span></div>
    </div>`).join('');
}
function simpanRetur(){
  const prodId=parseInt(document.getElementById('returProduk').value);
  const qty=parseInt(document.getElementById('returQty').value)||0;
  const alasan=document.getElementById('returAlasan').value;
  const ref=document.getElementById('returRef').value.trim();
  if(!prodId||qty<=0){showNotif('Pilih produk & qty',1);return;}
  const p=DB.produk.find(x=>x.id===prodId);if(!p)return;
  if(_returTindakan==='kembalikan'&&!p.timbang){
    const stokAwal=p.stok;p.stok+=qty;
    DB.riwayatStok.push({waktu:new Date().toISOString(),produkId:p.id,nama:p.nama,jenis:'masuk',qty,stokAwal,stokAkhir:p.stok,ref:'Retur'});
    showNotif('✅ Stok +'+qty+' dikembalikan');
  }
  if(!DB.retur)DB.retur=[];
  DB.retur.push({waktu:new Date().toISOString(),produkId:p.id,produkNama:p.nama,qty,alasan,tindakan:_returTindakan,ref});
  saveDB();tutupM('mRetur');renderRetur();renderStok();
  ['returRef','returQty'].forEach(id=>document.getElementById(id).value='');
}

// CABANG
function simpanCabang(){
  const nm=document.getElementById('cabNama').value.trim();
  if(!nm){showNotif('Isi nama cabang',1);return;}
  if(!DB.cabang)DB.cabang=[];
  DB.cabang.push({nama:nm,alamat:document.getElementById('cabAlamat').value.trim(),kasir:document.getElementById('cabKasir').value.trim()});
  saveDB();tutupM('mCabang');renderCabangList();showNotif('✅ Cabang ditambah!');
  ['cabNama','cabAlamat','cabKasir'].forEach(id=>document.getElementById(id).value='');
}
function renderCabangList(){
  const el=document.getElementById('cabangList');if(!el)return;
  if(!DB.cabang||!DB.cabang.length){el.innerHTML='<div style="font-size:12px;color:var(--gray);padding:4px 0">Belum ada cabang.</div>';return;}
  el.innerHTML=DB.cabang.map((c,i)=>`
    <div class="cabang-card">
      <div class="cabang-ico">🏪</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:800;color:var(--txt)">${c.nama}</div><div style="font-size:11px;color:var(--gray)">${c.alamat||'-'} · ${c.kasir||'-'}</div></div>
      <button class="ab2 bh" onclick="hapusCabang(${i})">🗑</button>
    </div>`).join('');
}
function hapusCabang(i){konfirmasi('Hapus cabang?',()=>{DB.cabang.splice(i,1);saveDB();renderCabangList();});}

// NOTIF STOK IN-APP
function cekStokAlert(){
  const low=DB.produk.filter(p=>!p.timbang&&p.stok<=(p.minStok||5)&&p.stok>0);
  const habis=DB.produk.filter(p=>!p.timbang&&p.stok<=0);
  const badge=document.getElementById('stokAlertBadge');
  const total=low.length+habis.length;
  if(badge){badge.style.display=total>0?'inline-flex':'none';badge.textContent=total;}
  if(habis.length>0){
    const popup=document.getElementById('stokAlertPopup');
    if(popup){
      document.getElementById('stokAlertMsg').textContent=`⚠ ${habis.length} produk HABIS: ${habis.slice(0,2).map(p=>p.nama).join(', ')}${habis.length>2?'...':''}`;
      popup.classList.add('show');setTimeout(()=>popup.classList.remove('show'),5000);
    }
  }
}

// PENGATURAN POIN
function simpanSettPoin(){
  const s=DB.settings||{};
  s.poinRpPerPoin=parseInt(document.getElementById('poinRpPerPoin').value)||10000;
  s.poinNilai=parseInt(document.getElementById('poinNilai').value)||50;
  DB.settings=s;saveDB();showNotif('✅ Pengaturan poin disimpan!');
}

// AUTO REKAP WA
let _autoRekapTimer=null;
let _rekapTerkirimHari='';
function simpanAutoRekap(){
  const aktif=document.getElementById('autoRekapToggle').checked;
  const jam=document.getElementById('autoRekapJam').value||'21:00';
  const s=DB.settings||{};s.autoRekap=aktif;s.autoRekapJam=jam;DB.settings=s;saveDB();
  jadwalAutoRekap();showNotif(aktif?'✅ Laporan otomatis aktif jam '+jam:'Laporan otomatis nonaktif');
}
function jadwalAutoRekap(){
  if(_autoRekapTimer)clearInterval(_autoRekapTimer);
  const s=DB.settings||{};if(!s.autoRekap)return;
  _autoRekapTimer=setInterval(()=>{
    const now=new Date();
    const [h,m]=(s.autoRekapJam||'21:00').split(':').map(Number);
    const hariIni=now.toDateString();
    if(now.getHours()===h&&now.getMinutes()===m&&_rekapTerkirimHari!==hariIni){
      _rekapTerkirimHari=hariIni;
      eksporRekapWA();
      showNotif('📊 Laporan harian otomatis dikirim ke WA!');
    }
  },30000); // cek tiap 30 detik supaya tidak miss
}

// ===== AUTO NOTIF WA SETELAH TRANSAKSI =====
function simpanAutoNotifWA(){
  const s=DB.settings||{};
  s.autoNotifWaPelanggan=document.getElementById('autoNotifWaToggle')?.checked||false;
  s.autoNotifWaOwner=document.getElementById('autoNotifOwnerToggle')?.checked||false;
  DB.settings=s;saveDB();
  showNotif('✅ Setting notif WA disimpan');
}

// ===== STRUK SEBAGAI GAMBAR (Canvas) =====
async function buatStrukGambar(trx){
  return new Promise(resolve=>{
    const s=DB.settings||{};
    const nama=s.namaWarung||'Warung Pro';
    const alamat=s.alamat||'';
    const logo=s.logo||'🛒';
    const now=new Date(trx.waktu);
    const tgl=now.toLocaleString('id-ID',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
    const items=trx.items||[];
    const{sub,disc,total}={sub:trx.subtotal,disc:trx.diskon,total:trx.total};

    const W=400;
    const lineH=22;
    const pad=20;
    let lines=[];

    lines.push({type:'logo',val:s.logoUrl||logo});
    lines.push({type:'title',val:nama});
    if(alamat)lines.push({type:'sub',val:alamat});
    lines.push({type:'sub',val:tgl+' · '+trx.kasir});
    lines.push({type:'hr'});
    items.forEach(it=>{
      const hh=it.hargaCustom!==null?it.hargaCustom:it.harga;
      lines.push({type:'item2',left:it.nama.substring(0,22).toUpperCase(),right:fRp(hh*it.qty)});
      lines.push({type:'item-sub',val:it.qty+'x '+fRp(hh)});
    });
    lines.push({type:'hr'});
    if(disc>0){
      lines.push({type:'item2',left:'Subtotal',right:fRp(sub)});
      lines.push({type:'item2red',left:'Diskon',right:'-'+fRp(disc)});
    }
    lines.push({type:'total',left:'TOTAL',right:fRp(total)});
    const ml={'tunai':'Tunai','transfer':'Transfer','qris':'QRIS','kredit':'Kredit'};
    lines.push({type:'item2',left:'Bayar ('+( ml[trx.metode||'tunai']||'Tunai')+')',right:fRp(trx.bayar)});
    if((trx.metode||'tunai')==='tunai')lines.push({type:'item2',left:'Kembali',right:fRp(trx.kembalian)});
    lines.push({type:'hr'});
    lines.push({type:'center',val:'Terima kasih sudah belanja! 🙏'});
    lines.push({type:'center',val:'ID: '+trx.id});

    // Hitung tinggi canvas
    let estH=pad;
    lines.forEach(l=>{
      if(l.type==='logo')estH+=52;
      else if(l.type==='title')estH+=28;
      else if(l.type==='hr')estH+=14;
      else if(l.type==='total')estH+=26;
      else estH+=lineH;
    });
    estH+=pad;

    const canvas=document.createElement('canvas');
    canvas.width=W*2;canvas.height=estH*2;
    const ctx=canvas.getContext('2d');
    ctx.scale(2,2);

    // Background putih
    ctx.fillStyle='#fffef7';
    ctx.fillRect(0,0,W,estH);

    // Border dashed
    ctx.strokeStyle='#d4a017';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);
    ctx.strokeRect(6,6,W-12,estH-12);
    ctx.setLineDash([]);

    let y=pad;
    const monoFont='12px "Courier New",monospace';
    const boldFont='bold 13px "Courier New",monospace';
    const titleFont='bold 15px "Plus Jakarta Sans",sans-serif';

    lines.forEach(l=>{
      ctx.textAlign='left';
      if(l.type==='logo'){
        ctx.font='32px serif';ctx.textAlign='center';
        ctx.fillText(typeof l.val==='string'&&l.val.startsWith('data:')?'🛒':l.val,W/2,y+32);
        y+=52;
      } else if(l.type==='title'){
        ctx.font=titleFont;ctx.fillStyle='#1b4332';ctx.textAlign='center';
        ctx.fillText(l.val,W/2,y+20);y+=28;
      } else if(l.type==='sub'){
        ctx.font='11px "Plus Jakarta Sans",sans-serif';ctx.fillStyle='#888';ctx.textAlign='center';
        ctx.fillText(l.val,W/2,y+14);y+=lineH;
      } else if(l.type==='hr'){
        ctx.strokeStyle='#ccc';ctx.lineWidth=1;ctx.setLineDash([4,3]);
        ctx.beginPath();ctx.moveTo(pad,y+7);ctx.lineTo(W-pad,y+7);ctx.stroke();
        ctx.setLineDash([]);y+=14;
      } else if(l.type==='item2'||l.type==='item2red'){
        ctx.font=monoFont;ctx.fillStyle=l.type==='item2red'?'#e63946':'#222';
        ctx.textAlign='left';ctx.fillText(l.left,pad,y+14);
        ctx.textAlign='right';ctx.fillText(l.right,W-pad,y+14);
        y+=lineH;
      } else if(l.type==='item-sub'){
        ctx.font='10px "Courier New",monospace';ctx.fillStyle='#888';ctx.textAlign='left';
        ctx.fillText('  '+l.val,pad,y+12);y+=lineH-4;
      } else if(l.type==='total'){
        ctx.fillStyle='#1b4332';
        ctx.fillRect(pad,y,W-pad*2,24);
        ctx.font=boldFont;ctx.fillStyle='#fff';
        ctx.textAlign='left';ctx.fillText(l.left,pad+6,y+16);
        ctx.textAlign='right';ctx.fillText(l.right,W-pad-6,y+16);
        y+=26;
      } else if(l.type==='center'){
        ctx.font='10px "Plus Jakarta Sans",sans-serif';ctx.fillStyle='#aaa';ctx.textAlign='center';
        ctx.fillText(l.val,W/2,y+13);y+=lineH;
      }
    });

    canvas.toBlob(blob=>resolve(blob),'image/png',0.95);
  });
}

async function kirimStrukSebagaiGambar(){
  const t=_lastTrx();if(!t){showNotif('Belum ada transaksi',1);return;}
  showNotif('📸 Membuat gambar struk...');
  try{
    const blob=await buatStrukGambar(t);
    const file=new File([blob],'struk.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({files:[file],title:'Struk Belanja'});
    } else {
      // Fallback: download gambar
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='struk_'+t.id+'.png';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
      showNotif('📥 Gambar struk diunduh! Share manual ke WA.');
    }
  }catch(e){showNotif('Gagal buat gambar',1);console.error(e);}
}

