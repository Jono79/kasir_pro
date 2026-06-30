// ============= VOID =============
function bukaVoid(idx){document.getElementById('voidIdx').value=idx;document.getElementById('voidAlasan').value='';bukaM('mVoid');}
// ===== VOID CEPAT — v6 FIX: bisa langsung void dari layar sukses, batas waktu 5 menit =====
function bukaVoidCepat(){
  const t=_lastTrx();
  if(!t){showNotif('Tidak ada transaksi untuk dibatalkan',1);return;}
  if(t.void){showNotif('Transaksi ini sudah di-void sebelumnya',1);return;}
  const menitLalu=(Date.now()-new Date(t.waktu).getTime())/60000;
  if(menitLalu>5){
    showNotif('⚠ Sudah lebih dari 5 menit. Gunakan menu Laporan untuk void.',1);
    return;
  }
  const idx=DB.transaksi.findIndex(x=>x.id===t.id);
  if(idx===-1)return;
  tutupM('mSukses');
  bukaVoid(idx);
}
function prosesVoid(){
  const idx=parseInt(document.getElementById('voidIdx').value);
  const alasan=document.getElementById('voidAlasan').value.trim();
  if(!alasan){showNotif('Isi alasan void',1);return;}
  const t=DB.transaksi[idx];if(!t)return;
  t.void=true;t.voidAlasan=alasan;t.voidWaktu=new Date().toISOString();t.voidBy=me?.nama||'-';
  // Kembalikan stok
  t.items.forEach(it=>{const p=DB.produk.find(x=>x.id===it.id);if(p&&!it.timbang&&p.stok!==999){p.stok+=it.qty;DB.riwayatStok.push({waktu:new Date().toISOString(),produkId:p.id,nama:p.nama,jenis:'masuk',qty:it.qty,stokAwal:p.stok-it.qty,stokAkhir:p.stok,ref:'Void'});}});
  catatLog('Void Transaksi', 'Transaksi #'+t.id+' (total '+fRp(t.total)+') dibatalkan. Alasan: '+alasan);
  saveDB();tutupM('mVoid');
  try{ renderLaporan(); }catch(e){ /* halaman laporan mungkin tidak terlihat untuk kasir, abaikan */ }
  try{ renderProduk(); }catch(e){}
  updateTopOmzet();
  showNotif('🚫 Transaksi di-void, stok dikembalikan');
}

// ============= LAPORAN =============
let _lapTab='hari';
let _lapPeriod='hari';
function switchLapTab(tab,btn){
  _lapTab=tab;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  document.getElementById('lapHari').style.display=tab==='hari'?'flex':'none';
  document.getElementById('lapArsip').style.display=tab==='arsip'?'block':'none';
  document.getElementById('lapLabaRugi').style.display=tab==='labarugi'?'block':'none';
  document.getElementById('lapGrafik').style.display=tab==='grafik'?'block':'none';
  if(tab==='arsip')renderArsip();
  else if(tab==='labarugi')renderLabaRugi();
  else if(tab==='grafik'){renderGrafikPeriod('mingguan');renderTop10Produk();}
  else renderLaporan();
}
function setLapPeriod(p,btn){
  _lapPeriod=p;
  document.querySelectorAll('.lap-period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderLaporan();
}
function getTrxByPeriod(){
  const now=new Date();
  return DB.transaksi.filter(t=>{
    if(t.void)return false;
    const d=new Date(t.waktu);
    if(_lapPeriod==='hari')return d.toDateString()===now.toDateString();
    if(_lapPeriod==='minggu'){const diff=(now-d)/(1000*3600*24);return diff<7;}
    if(_lapPeriod==='bulan')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  });
}
function renderLaporan(){
  const trx=getTrxByPeriod();
  const tot=trx.reduce((s,t)=>s+t.total,0);
  const jml=trx.length;
  const items=trx.reduce((s,t)=>s+t.items.reduce((ss,i)=>ss+i.qty,0),0);
  const laba=trx.reduce((s,t)=>s+t.items.reduce((ss,i)=>{const p=DB.produk.find(x=>x.id===i.id);const h=i.hargaCustom!==null?i.hargaCustom:i.harga;return ss+(h-(p?p.modal||0:0))*(i.qty||1);},0),0);
  const now=new Date();
  const penHari=DB.pengeluaran.filter(k=>{const d=new Date(k.waktu);
    if(_lapPeriod==='hari')return d.toDateString()===now.toDateString();
    if(_lapPeriod==='minggu')return (now-d)<7*24*3600*1000;
    if(_lapPeriod==='bulan')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  }).reduce((s,k)=>s+k.nominal,0);
  const cm={};trx.forEach(t=>t.items.forEach(i=>{cm[i.nama]=(cm[i.nama]||0)+i.qty;}));
  const tl=Object.entries(cm).sort((a,b)=>b[1]-a[1])[0];
  const periodLabel={hari:'hari ini',minggu:'7 hari',bulan:'bulan ini'}[_lapPeriod];
  document.getElementById('statRow').innerHTML=`
    <div class="sc"><div class="sl">💰 Omzet</div><div class="sv">${fRp(tot)}</div><div class="ss">${periodLabel}</div></div>
    <div class="sc"><div class="sl">📈 Est. Laba</div><div class="sv">${fRp(laba)}</div><div class="ss">dari modal</div></div>
    <div class="sc"><div class="sl">💸 Pengeluaran</div><div class="sv" style="color:var(--r)">${fRp(penHari)}</div><div class="ss">${periodLabel}</div></div>
    <div class="sc"><div class="sl">📊 Kas Bersih</div><div class="sv" style="color:${laba-penHari>=0?'var(--gm)':'var(--r)'}">${fRp(laba-penHari)}</div><div class="ss">laba-pengeluaran</div></div>
    <div class="sc"><div class="sl">🧾 Transaksi</div><div class="sv">${jml}</div><div class="ss">kali</div></div>
    <div class="sc"><div class="sl">📦 Item</div><div class="sv">${items}</div><div class="ss">terjual</div></div>
    ${tl?`<div class="sc"><div class="sl">🏆 Terlaris</div><div class="sv" style="font-size:11px">${tl[0].split(' ')[0]}</div><div class="ss">${tl[1]}x</div></div>`:''}`;
  const rl=document.getElementById('rwList');
  // Hanya tampilkan transaksi hari ini di list (bukan filter period)
  const trxHariIni=DB.transaksi;
  if(!trxHariIni.length){rl.innerHTML='<div class="empty-s"><div class="ei">📊</div><p>Belum ada transaksi</p></div>';document.getElementById('grafikWrap').style.display='none';document.getElementById('topProdukWrap').style.display='none';return;}
  // Grafik per jam (hari ini saja)
  const trxToday=DB.transaksi.filter(t=>{const d=new Date(t.waktu);return d.toDateString()===new Date().toDateString()&&!t.void;});
  const jamData=new Array(24).fill(0);
  trxToday.forEach(t=>{const h=new Date(t.waktu).getHours();jamData[h]+=t.total;});
  const grafikWrap=document.getElementById('grafikWrap');
  if(jamData.some(v=>v>0)){
    grafikWrap.style.display='block';
    setTimeout(()=>{
      const canvas=document.getElementById('grafikJam');
      canvas.width=canvas.offsetWidth||300;canvas.height=80;
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
      const maxV=Math.max(...jamData)||1;const barW=Math.floor(canvas.width/24)-1;
      const gmC=getComputedStyle(document.documentElement).getPropertyValue('--gm').trim()||'#2d6a4f';
      jamData.forEach((v,i)=>{const x=i*(barW+1);const barH=Math.round((v/maxV)*(canvas.height-14));if(barH>0){ctx.fillStyle=gmC+'cc';ctx.beginPath();ctx.roundRect?ctx.roundRect(x,canvas.height-14-barH,barW,barH,2):ctx.rect(x,canvas.height-14-barH,barW,barH);ctx.fill();}ctx.fillStyle=v>0?'#374151':'#9ca3af';ctx.font='8px sans-serif';ctx.textAlign='center';if(v>0||i%3===0)ctx.fillText(i+'h',x+barW/2,canvas.height-2);});
    },50);
  } else grafikWrap.style.display='none';
  // Top produk (dari periode terpilih)
  const topList=Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(topList.length){
    document.getElementById('topProdukWrap').style.display='block';
    const maxQ=topList[0][1];
    const gmC=getComputedStyle(document.documentElement).getPropertyValue('--gm').trim()||'#2d6a4f';
    document.getElementById('topProdukList').innerHTML=topList.map(([nm,qty],idx)=>`
      <div class="tpl-item"><div class="tpl-item-row"><span class="tpl-nama">${idx+1}. ${nm}</span><span class="tpl-qty">${qty}x</span></div>
      <div class="tpl-bar"><div class="tpl-bar-fill" style="width:${Math.round(qty/maxQ*100)}%;background:${gmC}"></div></div></div>`).join('');
  } else document.getElementById('topProdukWrap').style.display='none';
  // Riwayat
  rl.innerHTML=[...DB.transaksi].reverse().map((t,rawIdx)=>{
    const idx=DB.transaksi.length-1-rawIdx;
    return `<div class="rw-card ${t.void?'void':''}">
      <div class="rw-time">${fJam(t.waktu)}</div>
      <div class="rw-det">
        <div class="rd1">${t.items.length} item · ${{'tunai':'💵','transfer':'🏦','qris':'📲','kredit':'💳'}[t.metode]||'💵'}${t.void?'<span class="void-badge">VOID</span>':''}${t.pelanggan?'<span style="background:#fde68a;color:#92400e;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;margin-left:3px">🎁</span>':''}</div>
        <div class="rd2">${t.items.map(i=>i.nama+' ×'+i.qty).join(', ')}</div>
        <span class="rdk">👤 ${t.kasir||'-'}${t.pelanggan?' · 🎁 '+t.pelanggan:''}</span>
      </div>
      <div style="text-align:right">
        <div class="rw-tot">${fRp(t.total)}</div>
        ${!t.void&&me?.role==='owner'?`<button class="ab2 bh" style="font-size:10px;padding:2px 5px;margin-top:3px" onclick="bukaVoid(${idx})">Void</button>`:''}
      </div>
    </div>`;
  }).join('');
}
function renderArsip(){
  const al=document.getElementById('lapArsip');
  if(!DB.arsip.length){al.innerHTML='<div class="empty-s"><div class="ei">📁</div><p>Belum ada arsip</p></div>';return;}
  al.innerHTML=[...DB.arsip].reverse().map(a=>`
    <div style="background:var(--card);border:1.5px solid var(--brd);border-radius:11px;padding:12px 14px;margin:8px 10px;">
      <div style="font-size:12px;font-weight:800;color:var(--txt);margin-bottom:6px">📅 ${fTglLengkap(a.waktu)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="sc"><div class="sl">Omzet</div><div class="sv">${fRp(a.omzet)}</div></div>
        <div class="sc"><div class="sl">Laba</div><div class="sv">${fRp(a.laba)}</div></div>
        <div class="sc"><div class="sl">Trx</div><div class="sv">${a.jml}</div></div>
      </div>
    </div>`).join('');
}
function renderLabaRugi(){
  const lr=document.getElementById('lapLabaRugi');
  const trx=DB.transaksi.filter(t=>!t.void);
  const omzet=trx.reduce((s,t)=>s+t.total,0);
  const hpp=trx.reduce((s,t)=>s+t.items.reduce((ss,i)=>{const p=DB.produk.find(x=>x.id===i.id);return ss+(p?p.modal||0:0)*(i.qty||1);},0),0);
  const labaKotor=omzet-hpp;
  const pengeluaran=DB.pengeluaran.filter(k=>{const d=new Date(k.waktu);const now=new Date();return d.toDateString()===now.toDateString();}).reduce((s,k)=>s+k.nominal,0);
  const labaBersih=labaKotor-pengeluaran;
  lr.innerHTML=`
    <div style="background:var(--card);border:1.5px solid var(--brd);border-radius:11px;overflow:hidden;margin-bottom:10px;">
      <div style="background:var(--g);color:#fff;padding:10px 14px;font-size:13px;font-weight:800;">📊 Laporan Laba Rugi Harian</div>
      <div class="tutup-row"><span class="trl">💰 Total Omzet (Penjualan)</span><span class="trv">${fRp(omzet)}</span></div>
      <div class="tutup-row merah"><span class="trl">📦 HPP (Modal)</span><span class="trv">-${fRp(hpp)}</span></div>
      <div class="tutup-row big"><span class="trl" style="font-weight:700">📈 Laba Kotor</span><span class="trv">${fRp(labaKotor)}</span></div>
      <div style="height:1.5px;background:var(--brd);margin:0 14px"></div>
      <div class="tutup-row merah"><span class="trl">💸 Total Pengeluaran</span><span class="trv">-${fRp(pengeluaran)}</span></div>
      <div class="tutup-row big" style="border-top:2px solid var(--brd)"><span class="trl" style="font-weight:800">✅ LABA BERSIH</span><span class="trv" style="color:${labaBersih>=0?'var(--gm)':'var(--r)'}">${fRp(labaBersih)}</span></div>
    </div>
    <div style="background:var(--card);border:1.5px solid var(--brd);border-radius:11px;padding:12px 14px;">
      <div style="font-size:12px;font-weight:800;color:var(--txt);margin-bottom:8px">💡 Analisis</div>
      <div style="font-size:12px;color:var(--txt2);line-height:1.8">
        • Margin laba kotor: <b>${omzet?Math.round(labaKotor/omzet*100):0}%</b><br>
        • Margin laba bersih: <b style="color:${labaBersih>=0?'var(--gm)':'var(--r)'}">${omzet?Math.round(labaBersih/omzet*100):0}%</b><br>
        • Rata-rata per transaksi: <b>${fRp(trx.length?Math.round(omzet/trx.length):0)}</b><br>
        • Total transaksi hari ini: <b>${trx.length}</b>
      </div>
    </div>`;
}
function resetLaporan(){konfirmasi('Reset semua transaksi hari ini?',()=>{DB.transaksi=[];saveDB();renderLaporan();updateTopOmzet();showNotif('Laporan direset');});}
function eksporRekapWA(){
  const trx=DB.transaksi.filter(t=>!t.void);
  if(!trx.length){showNotif('Belum ada transaksi',1);return;}
  const tot=trx.reduce((s,t)=>s+t.total,0);
  const laba=trx.reduce((s,t)=>s+t.items.reduce((ss,i)=>{const p=DB.produk.find(x=>x.id===i.id);const h=i.hargaCustom!==null?i.hargaCustom:i.harga;return ss+(h-(p?p.modal||0:0))*(i.qty||1);},0),0);
  const cm={};trx.forEach(t=>t.items.forEach(i=>{cm[i.nama]=(cm[i.nama]||0)+i.qty;}));
  const s=DB.settings||{};
  let p=`📊 *LAPORAN ${s.namaWarung||'Warung Pro'}*\n${fTglLengkap(new Date())}\n\n💰 Omzet: *${fRp(tot)}*\n📈 Est. Laba: *${fRp(laba)}*\n🧾 Transaksi: ${trx.length}x\n\n🏆 *Terlaris:*\n`;
  Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([n,q])=>p+=`  • ${n}: ${q}x\n`);
  const low=DB.produk.filter(x=>!x.timbang&&x.stok<=(x.minStok||5));
  if(low.length){p+=`\n⚠️ *Stok Mau Habis:*\n`;low.forEach(x=>p+=`  • ${x.nama}: ${x.stok}\n`);}
  p+=`\n_Kasir Warung Pro_ 🤖`;
  const wa=s.waOwner||'';
  if(!wa){alert('Isi No. WA Pemilik di Pengaturan!');return;}
  window.open('https://wa.me/'+wa+'?text='+encodeURIComponent(p));
}

// ============= TUTUP KASIR =============
function renderTutup(){
  const trx=DB.transaksi.filter(t=>!t.void);
  const omzet=trx.reduce((s,t)=>s+t.total,0);
  const disc=trx.reduce((s,t)=>s+(t.diskon||0),0);
  const laba=trx.reduce((s,t)=>s+t.items.reduce((ss,i)=>{const p=DB.produk.find(x=>x.id===i.id);const h=i.hargaCustom!==null?i.hargaCustom:i.harga;return ss+(h-(p?p.modal||0:0))*(i.qty||1);},0),0);
  const pen=DB.pengeluaran.filter(k=>{const d=new Date(k.waktu);const now=new Date();return d.toDateString()===now.toDateString();}).reduce((s,k)=>s+k.nominal,0);
  const cm={};trx.forEach(t=>t.items.forEach(i=>{cm[i.id]=(cm[i.id]||0)+(i.qty||1);}));
  document.getElementById('tutupRekap').innerHTML=`
    <div class="tr-head">📅 Rekap ${fTglLengkap(new Date())}</div>
    <div class="tutup-row"><span class="trl">💰 Total Omzet</span><span class="trv">${fRp(omzet)}</span></div>
    <div class="tutup-row merah"><span class="trl">🏷 Total Diskon</span><span class="trv">-${fRp(disc)}</span></div>
    <div class="tutup-row"><span class="trl">🧾 Jumlah Transaksi</span><span class="trv">${trx.length} kali</span></div>
    <div class="tutup-row"><span class="trl">📦 Item Terjual</span><span class="trv">${trx.reduce((s,t)=>s+t.items.reduce((ss,i)=>ss+i.qty,0),0)} pcs</span></div>
    <div class="tutup-row merah"><span class="trl">💸 Pengeluaran</span><span class="trv">-${fRp(pen)}</span></div>
    <div class="tutup-row big"><span class="trl">📈 Est. Laba Bersih</span><span class="trv">${fRp(laba-pen)}</span></div>`;
  const low=DB.produk.filter(p=>!p.timbang&&p.stok<=(p.minStok||5));
  document.getElementById('stokBerubah').innerHTML=`<div class="sb-head2">⚠ Stok Perlu Restok (${low.length})</div>${low.length?low.map(p=>`<div class="stok-row"><span class="srl">${p.nama}</span><span class="srv">Sisa ${p.stok}</span></div>`).join(''):'<div style="padding:10px 14px;font-size:12px;color:var(--gray)">Semua stok aman ✅</div>'}`;
}
function prosesTutupKasir(){
  const trx=DB.transaksi.filter(t=>!t.void);
  if(!trx.length){showNotif('Belum ada transaksi',1);return;}
  const omzet=trx.reduce((s,t)=>s+t.total,0);
  const laba=trx.reduce((s,t)=>s+t.items.reduce((ss,i)=>{const p=DB.produk.find(x=>x.id===i.id);const h=i.hargaCustom!==null?i.hargaCustom:i.harga;return ss+(h-(p?p.modal||0:0))*(i.qty||1);},0),0);
  DB.arsip.push({waktu:new Date().toISOString(),omzet,laba,jml:trx.length,kasir:me?.nama||'-',transaksi:[...DB.transaksi]});
  DB.transaksi=[];
  saveDB();updateTopOmzet();renderTutup();showNotif('✅ Kasir ditutup & disimpan!');
}
function kirimRekapWA(){eksporRekapWA();}
function kirimWA(){
  const low=DB.produk.filter(p=>!p.timbang&&p.stok<=(p.minStok||5));
  if(!low.length){showNotif('Semua stok aman!');return;}
  const s=DB.settings||{};
  let p=`⚠️ *ALERT STOK ${s.namaWarung||'Warung Pro'}*\n${fTglLengkap(new Date())}\n\nStok mau habis:\n`;
  low.forEach(x=>p+=`• ${x.nama}: sisa *${x.stok}* (min ${x.minStok})\n`);
  p+=`\n_Kasir Warung Pro_ 🤖`;
  const wa=s.waOwner||'';
  if(!wa){alert('Isi No. WA Pemilik di Pengaturan!');return;}
  window.open('https://wa.me/'+wa+'?text='+encodeURIComponent(p));
}

