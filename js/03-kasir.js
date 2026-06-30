// ============= KERANJANG =============
let keranjang=[];
let keranjangSlots=[null,null,null];
let activeSlot=0;
let diskonType='pct',diskonVal=0,metode='tunai';

function updateFabCount(){
  const tot=keranjang.reduce((s,i)=>s+i.qty,0);
  const fc=document.getElementById('fabCount');
  fc.textContent=tot;fc.classList.toggle('show',tot>0);
}
function bukaKeranjang(){document.getElementById('keranjangSheet').classList.add('open');document.getElementById('kOverlay').classList.add('open');renderKeranjang();}
function tutupKeranjang(){document.getElementById('keranjangSheet').classList.remove('open');document.getElementById('kOverlay').classList.remove('open');}
function addProduk(id){
  const p=DB.produk.find(x=>x.id===id);if(!p||p.habis)return;
  if(p.timbang){bukaTimbang(p);return;}
  if(p.stok<=0&&p.stok!==999){showNotif('⚠ Stok habis!',1);playBeep('habis');return;}
  const ex=keranjang.find(x=>x.id===id&&x.hargaCustom===null);
  if(ex){
    // Cek stok SEBELUM menambah qty — sebelumnya tidak ada pengecekan di sini sama sekali,
    // jadi kasir bisa klik kartu produk berkali-kali sampai qty melebihi stok yang tersedia.
    const newQty=ex.qty+1;
    if(p.stok!==999&&newQty>p.stok){
      showNotif('⚠ Stok "'+p.nama+'" tersisa '+p.stok+', tidak bisa nambah lagi',1);
      playBeep('habis');
      return;
    }
    // cek grosir
    if(p.grosir&&p.grosirMin&&newQty>=p.grosirMin){ex.harga=p.grosir;showNotif('🎉 Harga grosir diterapkan!');}
    ex.qty=newQty;
  }else{
    keranjang.push({id,nama:p.nama,harga:p.harga,hargaCustom:null,qty:1,modal:p.modal||0,foto:p.fotoUrl||null});
  }
  updateFabCount();renderProduk();hitungDiskon();
  // animasi
  playBeep(true);
  showNotif('✔ '+p.nama+' ditambah');
}
function addTimbang(){
  const berat=parseFloat(document.getElementById('beratInput').value)||0;
  if(berat<=0){showNotif('Masukkan berat',1);return;}
  const p=_timProduk;if(!p)return;
  const unit=_timUnit;
  let beratKg=berat;if(unit==='gram')beratKg=berat/1000;else if(unit==='ons')beratKg=berat/10;
  const harga=Math.round(p.harga*beratKg);
  const label=`${p.nama} (${berat}${unit})`;
  keranjang.push({id:p.id,nama:label,harga,hargaCustom:null,qty:1,modal:Math.round((p.modal||0)*beratKg),foto:p.fotoUrl||null,timbang:true,berat,unit});
  updateFabCount();tutupM('mTimbang');hitungDiskon();playBeep(true);showNotif('✔ '+label+' ditambah');
}
function ubahQty(idx,delta){
  const it=keranjang[idx];if(!it)return;
  const p=DB.produk.find(x=>x.id===it.id);
  // Cek stok kalau qty mau ditambah (bukan dikurangi) & bukan barang timbang & bukan stok unlimited (999)
  if(delta>0&&!it.timbang&&p&&p.stok!==999){
    if(it.qty+delta>p.stok){
      showNotif('⚠ Stok tersisa '+p.stok+', tidak bisa nambah lagi',1);
      playBeep('habis');
      return;
    }
  }
  it.qty+=delta;
  if(it.qty<=0){keranjang.splice(idx,1);}
  else{
    // cek grosir
    if(p&&p.grosir&&p.grosirMin){
      if(it.qty>=p.grosirMin){it.harga=p.grosir;}
      else{it.harga=p.harga;}
    }
  }
  updateFabCount();renderKeranjang();hitungDiskon();renderProduk();
}
function clearK(){keranjang=[];diskonVal=0;document.getElementById('diskonVal').value='';document.getElementById('diskonInfo').style.display='none';updateFabCount();renderKeranjang();hitungDiskon();}
function hitungTotal(){
  const sub=keranjang.reduce((s,i)=>s+(i.hargaCustom!==null?i.hargaCustom:i.harga)*i.qty,0);
  let disc=0;
  if(diskonType==='pct')disc=Math.round(sub*Math.min(diskonVal,100)/100);
  else disc=Math.min(diskonVal,sub);
  return{sub,disc,total:sub-disc};
}
function hitungDiskon(){
  const{sub,disc,total}=hitungTotal();
  document.getElementById('totalDisp').textContent=fRp(total);
  const di=document.getElementById('diskonInfo');
  if(disc>0){di.style.display='flex';document.getElementById('diskonJml').textContent=fRp(disc);}
  else di.style.display='none';
  document.getElementById('btnBayar').disabled=keranjang.length===0;
  hitungKem();
}
function hitungKem(){
  const{total}=hitungTotal();
  const bayar=parseInt(document.getElementById('uangBayar').value)||0;
  const kb=document.getElementById('kembox');
  if(metode!=='tunai'){kb.style.display='none';document.getElementById('btnBayar').disabled=keranjang.length===0;return;}
  if(bayar>=total&&total>0){
    kb.style.display='flex';
    document.getElementById('kemDisp').textContent=fRp(bayar-total);
    document.getElementById('btnBayar').disabled=false;
  }else{
    kb.style.display='none';
    document.getElementById('btnBayar').disabled=true;
  }
  // nomcepat
  const nc=document.getElementById('nomcepat');
  const rnd=[total,Math.ceil(total/1000)*1000,Math.ceil(total/5000)*5000,Math.ceil(total/10000)*10000,50000,100000].filter((v,i,a)=>v>=total&&a.indexOf(v)===i).slice(0,5);
  nc.innerHTML=rnd.map(v=>`<button onclick="document.getElementById('uangBayar').value=${v};hitungKem()">${fRp(v)}</button>`).join('');
}
function setDiskonType(t){
  diskonType=t;
  document.getElementById('btnDiskonPct').classList.toggle('active',t==='pct');
  document.getElementById('btnDiskonRp').classList.toggle('active',t==='rp');
  const v=parseFloat(document.getElementById('diskonVal').value)||0;
  diskonVal=v;hitungDiskon();
}
document.getElementById('diskonVal').addEventListener('input',function(){diskonVal=parseFloat(this.value)||0;hitungDiskon();});
function setMetode(m,btn){
  metode=m;
  document.querySelectorAll('.metode-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  if(m!=='tunai'){document.getElementById('uangBayar').value='';document.getElementById('kembox').style.display='none';document.getElementById('btnBayar').disabled=keranjang.length===0;}
  hitungKem();
}
function renderKeranjang(){
  const ki=document.getElementById('kitems');
  document.getElementById('kbadge').textContent=keranjang.length;
  if(!keranjang.length){ki.innerHTML='<div class="kempty"><div class="ei">🛒</div><p>Belum ada produk</p></div>';return;}
  ki.innerHTML=keranjang.map((it,idx)=>{
    const h=it.hargaCustom!==null?it.hargaCustom:it.harga;
    const isGrosir=DB.produk.find(x=>x.id===it.id)?.grosir===it.harga;
    return `<div class="kitem">
      ${it.foto?`<img src="${it.foto}" style="width:32px;height:32px;border-radius:7px;object-fit:cover;flex-shrink:0">`:`<div style="width:32px;height:32px;border-radius:7px;background:var(--gp);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🛍</div>`}
      <div class="kitem-info">
        <div class="kitem-name">${it.nama}</div>
        <div class="kitem-harga" onclick="bukaHargaCustom(${idx})">${it.hargaCustom!==null?'<span style="color:var(--r)">✏ '+fRp(h)+'</span>':isGrosir?'<span style="color:var(--o)">🎁 '+fRp(h)+'</span>':fRp(h)} ✏</div>
      </div>
      <div class="qctrl">
        <button onclick="ubahQty(${idx},-1)">−</button>
        <span class="qnum">${it.qty}</span>
        <button onclick="ubahQty(${idx},1)">+</button>
      </div>
      <div class="ksub">${fRp(h*it.qty)}</div>
    </div>`;
  }).join('');
  hitungDiskon();
}

// Hold/antrian
function holdKeranjang(){
  if(!keranjang.length){showNotif('Keranjang kosong',1);return;}
  const idx=keranjangSlots.findIndex(s=>!s);
  if(idx===-1){showNotif('Maks 3 antrian',1);return;}
  keranjangSlots[idx]=[...keranjang];
  keranjang=[];updateFabCount();tutupKeranjang();renderHoldSlots();showNotif('⏸ Antrian '+(idx+1)+' disimpan');
}
function ambilHold(idx){
  if(!keranjangSlots[idx])return;
  if(keranjang.length>0){holdKeranjang();}
  keranjang=keranjangSlots[idx];keranjangSlots[idx]=null;activeSlot=idx;
  updateFabCount();renderHoldSlots();bukaKeranjang();
}
function renderHoldSlots(){
  document.getElementById('holdSlots').innerHTML=keranjangSlots.map((s,i)=>`<button class="hslot ${s?'ada':''} ${activeSlot===i?'aktif':''}" onclick="ambilHold(${i})">${s?'#'+(i+1)+' ('+s.length+')':'#'+(i+1)}</button>`).join('');
}

// ============= BAYAR =============
function bukaBayar(){
  const{total,disc}=hitungTotal();
  document.getElementById('mTotalBayar').textContent=fRp(total);
  const metLbl={'tunai':'💵 Tunai','transfer':'🏦 Transfer','qris':'📲 QRIS','kredit':'💳 Kredit'};
  document.getElementById('mMetodeBayar').textContent=metLbl[metode]||metode;
  document.getElementById('strukPreview').innerHTML=buatStruk(false);
  bukaM('mBayar');
}
function prosesTransaksi(){
  // Validasi stok terakhir sebelum checkout (jaga-jaga ada qty yang lolos dari cek sebelumnya)
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
  const kem=bayar-total;
  const now=new Date();
  const trx={id:Date.now(),waktu:now.toISOString(),items:[...keranjang.map(it=>({...it}))],subtotal:sub,diskon:disc,total,bayar,kembalian:kem,kasir:me?.nama||'-',metode,void:false};
  // Kurangi stok
  trx.items.forEach(it=>{
    const p=DB.produk.find(x=>x.id===it.id);
    if(p&&p.stok!==999&&!it.timbang){
      const qAwal=p.stok;p.stok=Math.max(0,p.stok-it.qty);
      DB.riwayatStok.push({waktu:now.toISOString(),produkId:p.id,nama:p.nama,jenis:'keluar',qty:it.qty,stokAwal:qAwal,stokAkhir:p.stok,ref:'Transaksi #'+trx.id});
    }
    if(it.timbang){
      const p2=DB.produk.find(x=>x.id===it.id);
      if(p2){const kg=it.unit==='gram'?it.berat/1000:it.unit==='ons'?it.berat/10:it.berat;DB.riwayatStok.push({waktu:now.toISOString(),produkId:p2.id,nama:p2.nama,jenis:'keluar',qty:kg+'kg',stokAwal:'-',stokAkhir:'-',ref:'Timbang #'+trx.id});}
    }
  });
  DB.transaksi.push(trx);
  saveDB();tutupM('mBayar');
  // Sukses
  const strSukses=buatStruk(true,trx);
  document.getElementById('suksesTotal').textContent=fRp(total);
  document.getElementById('suksesKem').textContent=metode==='tunai'?'Kembalian: '+fRp(kem):'Pembayaran: '+({'transfer':'Transfer','qris':'QRIS','kredit':'Kredit'}[metode]||metode);
  document.getElementById('strukSukses').innerHTML=strSukses;
  bukaM('mSukses');
  keranjang=[];diskonVal=0;metode='tunai';
  document.getElementById('diskonVal').value='';
  document.getElementById('uangBayar').value='';
  document.querySelectorAll('.metode-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  updateFabCount();renderProduk();updateTopOmzet();
  playBeep(true);
}
function _lastTrx(){return DB.transaksi[DB.transaksi.length-1]||null;}

// ============= STRUK =============
function buatStruk(sukses=false,trx=null){
  const t=trx||{items:keranjang,subtotal:0,diskon:0,total:hitungTotal().total,bayar:parseInt(document.getElementById('uangBayar').value)||0,kembalian:0,metode,kasir:me?.nama||'-',waktu:new Date().toISOString()};
  const{sub,disc,total}=trx?{sub:trx.subtotal,disc:trx.diskon,total:trx.total}:hitungTotal();
  const s=DB.settings||{};
  const nama=s.namaWarung||'Warung Pro';
  const alamat=s.alamat||'';
  const logo=s.logo||'🛒';
  const now=new Date(t.waktu);
  const tgl=now.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  const items=t.items||[];
  const logoHtml=s.logoUrl?`<img class="slogo-img" src="${s.logoUrl}">`:`<span class="slogo">${logo}</span>`;
  let h=`<div class="sh">${logoHtml}<span class="snama">${nama}</span>${alamat?`<span class="salamat">${alamat}</span>`:''}</div>`;
  h+=`<div style="font-size:9px;color:#666;text-align:center;margin-bottom:4px">${tgl} · ${t.kasir||'-'}</div>`;
  h+='<hr>';
  h+=items.map(it=>{const hh=it.hargaCustom!==null?it.hargaCustom:it.harga;return `<div class="sl2"><span>${it.nama.substring(0,22).toUpperCase()}</span><span>${fRp(hh*it.qty)}</span></div><div style="font-size:9px;color:#888;padding-left:4px">${it.qty}x${fRp(hh)}</div>`;}).join('');
  h+='<hr>';
  if(disc>0){h+=`<div class="sl2"><span>Subtotal</span><span>${fRp(sub)}</span></div><div class="sl2" style="color:var(--r)"><span>Diskon</span><span>-${fRp(disc)}</span></div>`;}
  h+=`<div class="sl2 stot"><span>TOTAL</span><span>${fRp(total)}</span></div>`;
  const ml={'tunai':'Tunai','transfer':'Transfer','qris':'QRIS','kredit':'Kredit'};
  h+=`<div class="sl2"><span>Bayar (${ml[t.metode||'tunai']})</span><span>${fRp(t.bayar)}</span></div>`;
  if((t.metode||'tunai')==='tunai')h+=`<div class="sl2"><span>Kembali</span><span>${fRp(t.kembalian)}</span></div>`;
  h+='<hr><div class="sqr" style="font-size:10px;color:#888">Terima kasih sudah belanja! 🙏</div>';
  // QR code sederhana (ID transaksi)
  if(sukses&&t.id)h+=`<div class="sqr" style="margin-top:5px;font-size:8px;color:#aaa">ID: ${t.id}</div>`;
  return h;
}
// ============= CETAK STRUK THERMAL — v6 FIX =============
function setKertasStruk(ukuran){
  const s=DB.settings||{};
  s.kertasStruk=ukuran;
  DB.settings=s;saveDB();
  document.getElementById('kertasBtn58').classList.toggle('active',ukuran==='58');
  document.getElementById('kertasBtn80').classList.toggle('active',ukuran==='80');
  showNotif('✅ Ukuran kertas: '+ukuran+'mm');
}
function _buatStrukPrintHTML(trx){
  const t=trx||_lastTrx();
  if(!t){showNotif('Tidak ada struk untuk dicetak',1);return '';}
  const s=DB.settings||{};
  const nama=s.namaWarung||'Warung Pro';
  const alamat=s.alamat||'';
  const now=new Date(t.waktu);
  const tgl=now.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  const items=t.items||[];
  const ml={'tunai':'Tunai','transfer':'Transfer','qris':'QRIS','kredit':'Kredit'};

  let h=`<div class="pr-title">${nama}</div>`;
  if(alamat)h+=`<div class="pr-sub">${alamat}</div>`;
  h+=`<div class="pr-sub">${tgl} · Kasir: ${t.kasir||'-'}</div>`;
  h+='<div class="pr-hr"></div>';
  items.forEach(it=>{
    const hh=it.hargaCustom!==null&&it.hargaCustom!==undefined?it.hargaCustom:it.harga;
    h+=`<div class="pr-row"><span>${(it.nama||'').substring(0,24)}</span><span>${fRp(hh*it.qty)}</span></div>`;
    h+=`<div class="pr-item-sub">${it.qty} x ${fRp(hh)}</div>`;
  });
  h+='<div class="pr-hr"></div>';
  if(t.diskon>0){
    h+=`<div class="pr-row"><span>Subtotal</span><span>${fRp(t.subtotal)}</span></div>`;
    h+=`<div class="pr-row"><span>Diskon</span><span>-${fRp(t.diskon)}</span></div>`;
  }
  h+=`<div class="pr-row pr-bold" style="font-size:1.1em"><span>TOTAL</span><span>${fRp(t.total)}</span></div>`;
  h+=`<div class="pr-row"><span>Bayar (${ml[t.metode||'tunai']||t.metode})</span><span>${fRp(t.bayar)}</span></div>`;
  if((t.metode||'tunai')==='tunai')h+=`<div class="pr-row"><span>Kembali</span><span>${fRp(t.kembalian)}</span></div>`;
  h+='<div class="pr-hr"></div>';
  h+='<div class="pr-center">Terima kasih sudah belanja! 🙏</div>';
  if(t.id)h+=`<div class="pr-center" style="font-size:0.8em;color:#555">ID: ${t.id}</div>`;
  return h;
}
function cetakStruk(trxOverride){
  const s=DB.settings||{};
  const ukuran=s.kertasStruk||'58';
  const html=_buatStrukPrintHTML(trxOverride);
  if(!html)return;
  const area=document.getElementById('printArea');
  area.className='print-area w'+ukuran;
  area.innerHTML=html;
  // Kasih jeda kecil supaya browser selesai render sebelum dialog print dibuka
  setTimeout(()=>{
    window.print();
  },50);
}
function cetakStrukVoid(trx){ cetakStruk(trx); } // alias dipakai dari mSukses
function shareStruk(){
  const t=_lastTrx()||{};const{sub,disc,total}=hitungTotal();
  const s=DB.settings||{};
  let teks=`🧾 *STRUK ${s.namaWarung||'Warung Pro'}*\n${new Date(t.waktu||Date.now()).toLocaleString('id-ID')}\n\n`;
  (t.items||[]).forEach(it=>{const h=it.hargaCustom!==null?it.hargaCustom:it.harga;teks+=`• ${it.nama} x${it.qty} = ${fRp(h*it.qty)}\n`;});
  teks+=`\n*TOTAL: ${fRp(t.total||total)}*\n`;
  if(s.waOwner){window.open('https://wa.me/?text='+encodeURIComponent(teks));}
  else if(navigator.share){navigator.share({title:'Struk '+s.namaWarung,text:teks}).catch(()=>{});}
  else{showNotif('Tidak bisa share',1);}
}

let btDevice=null;
async function hubungPrinter(print=false){
  if(!navigator.bluetooth){showNotif('Bluetooth tidak tersedia',1);return;}
  try{
    btDevice=await navigator.bluetooth.requestDevice({filters:[{services:['000018f0-0000-1000-8000-00805f9b34fb']}],optionalServices:['000018f0-0000-1000-8000-00805f9b34fb']});
    document.getElementById('pstatus').textContent='✅ '+btDevice.name;
    if(print)showNotif('🖨 Cetak...');
  }catch(e){showNotif('Printer tidak terhubung',1);}
}

