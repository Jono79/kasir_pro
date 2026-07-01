// ============= RIWAYAT STOK =============
const MAKS_RIWAYAT_STOK = 5000;

function renderRiwayatStok(){
  const list=document.getElementById('riwayatStokList');
  const total=DB.riwayatStok.length;

  // Filter controls — inject sekali ke dalam page-body, sebelum list
  let ctrl=document.getElementById('riwayatStokCtrl');
  if(!ctrl){
    ctrl=document.createElement('div');
    ctrl.id='riwayatStokCtrl';
    ctrl.style.cssText='padding:8px 10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--brd);flex-shrink:0;';
    ctrl.innerHTML=`
      <select id="rsFilterJenis" onchange="renderRiwayatStok()" style="flex:1;min-width:100px;padding:6px;border:1.5px solid var(--brd);border-radius:7px;background:var(--inp);color:var(--txt);font-size:11px;">
        <option value="">Semua Jenis</option>
        <option value="masuk">📥 Masuk</option>
        <option value="keluar">📤 Keluar</option>
      </select>
      <input id="rsFilterNama" placeholder="Cari nama produk..." oninput="renderRiwayatStok()" style="flex:2;min-width:120px;padding:6px;border:1.5px solid var(--brd);border-radius:7px;background:var(--inp);color:var(--txt);font-size:11px;">
      <button onclick="eksporRiwayatStokCSV()" style="padding:6px 10px;border:1.5px solid var(--g);border-radius:7px;background:transparent;color:var(--g);font-size:11px;font-weight:700;white-space:nowrap;">⬇ CSV</button>`;
    list.parentNode.insertBefore(ctrl, list);
  }

  if(!total){
    list.innerHTML='<div class="empty-s"><div class="ei">📜</div><p>Belum ada riwayat stok</p></div>';
    return;
  }

  // Ambil nilai filter
  const filterJenis=document.getElementById('rsFilterJenis')?.value||'';
  const filterNama=(document.getElementById('rsFilterNama')?.value||'').toLowerCase();

  let data=[...DB.riwayatStok].reverse();
  if(filterJenis)data=data.filter(r=>r.jenis===filterJenis);
  if(filterNama)data=data.filter(r=>(r.nama||'').toLowerCase().includes(filterNama));

  const tampil=data.slice(0,300);
  const sisanya=data.length-tampil.length;
  const infoText=`${total.toLocaleString('id')} entri tersimpan (maks 5.000)${data.length<total?' · '+data.length.toLocaleString('id')+' sesuai filter':''}`;

  list.innerHTML=`<div style="padding:6px 12px;font-size:10px;color:var(--gray);border-bottom:1px solid var(--brd);">${infoText}</div>`+
  tampil.map(r=>`
    <div class="riwayat-stok-item">
      <div class="rsi-ico ${r.jenis==='masuk'?'rsi-masuk':'rsi-keluar'}">${r.jenis==='masuk'?'📥':'📤'}</div>
      <div class="rsi-body">
        <div style="font-weight:700;color:var(--txt)">${r.nama}</div>
        <div style="font-size:10px;color:var(--gray)">${fTgl(r.waktu)} ${fJam(r.waktu)} · ${r.ref||'-'}</div>
      </div>
      <div style="text-align:right">
        <div class="rsi-qty ${r.jenis==='masuk'?'rsi-masuk-txt':'rsi-keluar-txt'}">${r.jenis==='masuk'?'+':'-'}${r.qty}</div>
        <div style="font-size:10px;color:var(--gray)">${r.stokAwal}→${r.stokAkhir}</div>
      </div>
    </div>`).join('')+
  (sisanya>0?`<div style="text-align:center;padding:10px;font-size:11px;color:var(--gray)">+${sisanya.toLocaleString('id')} entri lagi — gunakan filter atau Export CSV untuk lihat semua</div>`:'');
}

function eksporRiwayatStokCSV(){
  if(!DB.riwayatStok.length){showNotif('Belum ada riwayat stok',1);return;}
  const headers=['Waktu','Produk','Jenis','Qty','Stok Awal','Stok Akhir','Referensi'];
  const rows=DB.riwayatStok.map(r=>[
    new Date(r.waktu).toLocaleString('id-ID'),
    r.nama||'',
    r.jenis==='masuk'?'Masuk':'Keluar',
    r.qty,
    r.stokAwal,
    r.stokAkhir,
    (r.ref||'').replace(/"/g,'""')
  ]);
  const csv=[headers,...rows].map(r=>r.map(v=>'"'+String(v)+'"').join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='riwayat_stok_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  showNotif('✅ Riwayat stok ('+DB.riwayatStok.length+' entri) diexport!');
}


// ============= STOK OPNAME =============
let _opnameData={};
function renderOpname(){
  _opnameData={};
  const list=document.getElementById('opnameList');
  list.innerHTML=DB.produk.filter(p=>!p.timbang).map(p=>`
    <div class="opname-item">
      <div class="oi-nama">${p.nama}</div>
      <div class="oi-stok">Sistem: ${p.stok}</div>
      <input type="number" placeholder="${p.stok}" min="0" id="opn_${p.id}" oninput="cekOpname(${p.id},this)">
    </div>`).join('');
}
function cekOpname(id,inp){
  const val=parseInt(inp.value);const p=DB.produk.find(x=>x.id===id);
  if(isNaN(val)||!p){inp.classList.remove('selisih-plus','selisih-minus');return;}
  _opnameData[id]=val;
  if(val>p.stok)inp.classList.add('selisih-plus');
  else if(val<p.stok)inp.classList.add('selisih-minus');
  else{inp.classList.remove('selisih-plus','selisih-minus');}
}
function simpanOpname(){
  let changed=0;
  Object.entries(_opnameData).forEach(([id,val])=>{
    const p=DB.produk.find(x=>x.id===parseInt(id));if(!p)return;
    const selisih=val-p.stok;if(selisih===0)return;
    DB.riwayatStok.push({waktu:new Date().toISOString(),produkId:p.id,nama:p.nama,jenis:selisih>=0?'masuk':'keluar',qty:Math.abs(selisih),stokAwal:p.stok,stokAkhir:val,ref:'Stok Opname'});
    p.stok=val;changed++;
  });
  saveDB();showNotif(`✅ Opname selesai, ${changed} produk diupdate`);goPage('stok',document.getElementById('mnuStok'));
}

// ============= HUTANG =============
function renderHutang(){
  const total=DB.hutang.filter(h=>!h.lunas).reduce((s,h)=>s+h.nominal,0);
  document.getElementById('hutTotalDisp').textContent=fRp(total);
  const list=document.getElementById('hutangList');
  if(!DB.hutang.length){list.innerHTML='<div class="empty-s"><div class="ei">💳</div><p>Belum ada hutang</p></div>';return;}
  list.innerHTML=[...DB.hutang].reverse().map((h,i)=>`
    <div class="hutang-card ${h.lunas?'lunas':''}">
      <div class="hut-ico ${h.lunas?'lunas':''}">${h.lunas?'✅':'💳'}</div>
      <div class="hut-body"><div class="hut-nama">${h.nama}</div><div class="hut-detail">${h.ket||'-'}</div><div class="hut-tgl">${fTgl(h.waktu)}</div></div>
      <div class="hut-right">
        <div class="hut-nominal ${h.lunas?'lunas':''}">${fRp(h.nominal)}</div>
        <div class="hut-acts">
          ${!h.lunas?`<button class="ab2 be" onclick="lunasHutang(${DB.hutang.length-1-i})">Lunas</button>`:''}
          ${h.wa&&!h.lunas?`<button class="ab2 be" onclick="kirimNotaHutangWA(${DB.hutang.length-1-i})" style="background:#25D366;color:#fff;border-color:#25D366">📱</button>`:''}
          <button class="ab2 bh" onclick="hapusHutang(${DB.hutang.length-1-i})">🗑</button>
        </div>
      </div>
    </div>`).join('');
}
function simpanHutang(){
  const nm=document.getElementById('hNama').value.trim();const nom=parseInt(document.getElementById('hNominal').value)||0;
  if(!nm||!nom){showNotif('Isi nama & nominal',1);return;}
  DB.hutang.push({nama:nm,wa:document.getElementById('hWa').value.trim(),ket:document.getElementById('hKet').value.trim(),nominal:nom,waktu:new Date().toISOString(),lunas:false});
  saveDB();tutupM('mHutang');renderHutang();showNotif('✅ Hutang dicatat');
  ['hNama','hWa','hNominal','hKet'].forEach(id=>document.getElementById(id).value='');
}
function kirimNotaHutangWA(i){
  const h=DB.hutang[i];if(!h.wa)return;
  const s=DB.settings||{};
  const teks=`💳 *NOTA HUTANG*\n${s.namaWarung||'Warung'}\n\nYth. ${h.nama},\n\nAnda memiliki hutang sebesar:\n*${fRp(h.nominal)}*\n\nKeterangan: ${h.ket||'-'}\nTanggal: ${fTgl(h.waktu)}\n\nMohon segera dilunasi. Terima kasih 🙏`;
  window.open('https://wa.me/'+h.wa+'?text='+encodeURIComponent(teks));
}
function lunasHutang(i){DB.hutang[i].lunas=true;DB.hutang[i].tglLunas=new Date().toISOString();saveDB();renderHutang();showNotif('✅ Hutang lunas');}
function hapusHutang(i){konfirmasi('Hapus data hutang?',()=>{DB.hutang.splice(i,1);saveDB();renderHutang();});}

// ============= SUPPLIER =============
function renderSupplier(){
  const list=document.getElementById('supplierList');
  if(!DB.supplier.length){list.innerHTML='<div class="empty-s"><div class="ei">🏭</div><p>Belum ada supplier</p></div>';return;}
  list.innerHTML=DB.supplier.map((s,i)=>{
    const hutangSup=DB.hutangSupplier.filter(h=>h.supplier===s.nama&&!h.lunas).reduce((sum,h)=>sum+h.nominal,0);
    return `
    <div class="sup-card">
      <div class="sup-ico">🏭</div>
      <div class="sup-body"><div class="sup-nama">${s.nama}</div><div class="sup-detail">📞 ${s.kontak||'-'} · ${s.produk||'-'}</div>
        ${hutangSup>0?`<div style="font-size:11px;font-weight:700;color:var(--r);margin-top:3px;cursor:pointer" onclick="tampilkanHutangSupplier('${s.nama.replace(/'/g,"\\'")}')">💳 Hutang: ${fRp(hutangSup)} (tap untuk detail)</div>`:''}
      </div>
      <div style="display:flex;gap:5px">
        ${s.kontak?`<button class="ab2 be" onclick="window.open('https://wa.me/${s.kontak}')">📱</button>`:''}
        <button class="ab2 bh" onclick="hapusSupplier(${i})">🗑</button>
      </div>
    </div>`;
  }).join('');
}
// ===== Hutang ke Supplier — v6 baru =====
function tampilkanHutangSupplier(namaSupplier){
  const list=DB.hutangSupplier.map((h,i)=>({...h,_idx:i})).filter(h=>h.supplier===namaSupplier);
  let html=`<div style="padding:14px;"><h3 style="margin-bottom:10px;">💳 Hutang ke ${namaSupplier}</h3>`;
  if(!list.length){
    html+='<div class="empty-s"><div class="ei">✅</div><p>Tidak ada hutang</p></div>';
  } else {
    html+='<div style="display:flex;flex-direction:column;gap:6px;">';
    [...list].reverse().forEach(h=>{
      html+=`<div style="background:var(--card);border:1.5px solid var(--brd);border-radius:8px;padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:13px;font-weight:700;${h.lunas?'text-decoration:line-through;color:var(--gray)':'color:var(--r)'}">${fRp(h.nominal)}</div>
            <div style="font-size:10px;color:var(--gray)">${fTgl(h.waktu)}${h.catatan?' · '+h.catatan:''}</div>
          </div>
          ${!h.lunas?`<button class="ab2 be" onclick="lunasHutangSupplier(${h._idx});this.closest('.mov').remove();tampilkanHutangSupplier('${namaSupplier.replace(/'/g,"\\'")}')" style="font-size:10px;">Lunas</button>`:'<span style="font-size:10px;color:var(--g);font-weight:700;">✅ Lunas</span>'}
        </div>
      </div>`;
    });
    html+='</div>';
  }
  const totalBelumLunas=list.filter(h=>!h.lunas).reduce((s,h)=>s+h.nominal,0);
  html+=`<div style="font-size:12px;font-weight:800;color:var(--r);margin-top:10px;">Total belum lunas: ${fRp(totalBelumLunas)}</div></div>`;
  const modalBox=document.createElement('div');
  modalBox.className='mov show';
  modalBox.innerHTML=`<div class="modal" style="max-height:80vh;overflow-y:auto;">${html}<button class="bcan" style="margin-top:10px;width:100%" onclick="this.closest('.mov').remove()">Tutup</button></div>`;
  document.body.appendChild(modalBox);
}
function lunasHutangSupplier(idx){
  const h=DB.hutangSupplier[idx];if(!h)return;
  h.lunas=true;h.tglLunas=new Date().toISOString();
  catatLog('Lunas Hutang Supplier',h.supplier+': '+fRp(h.nominal)+' dibayar lunas');
  saveDB();renderSupplier();
  showNotif('✅ Hutang ke '+h.supplier+' lunas');
}
function simpanSupplier(){
  const nm=document.getElementById('supNama').value.trim();
  if(!nm){showNotif('Isi nama supplier',1);return;}
  DB.supplier.push({nama:nm,kontak:document.getElementById('supKontak').value.trim(),produk:document.getElementById('supProduk').value.trim()});
  saveDB();tutupM('mSupplier');renderSupplier();showNotif('✅ Supplier ditambah');
}
function hapusSupplier(i){konfirmasi('Hapus supplier?',()=>{DB.supplier.splice(i,1);saveDB();renderSupplier();});}

// ============= PEMBELIAN =============
let _beliItems=[];
function bukaPembelian(){
  _beliItems=[];
  document.getElementById('beliSup').innerHTML='<option value="">-- Tanpa Supplier --</option>'+DB.supplier.map((s,i)=>`<option value="${i}">${s.nama}</option>`).join('');
  document.getElementById('beliCatatan').value='';
  renderBeliItems();bukaM('mPembelian');
}
function tambahBeliItem(){
  _beliItems.push({produkId:'',qty:1,hargaBeli:0});renderBeliItems();
}
function renderBeliItems(){
  const prodOpts=DB.produk.map(p=>`<option value="${p.id}">${p.nama}</option>`).join('');
  document.getElementById('beliItems').innerHTML=_beliItems.length?_beliItems.map((it,i)=>`
    <div style="background:var(--gl2);border-radius:8px;padding:8px;margin-bottom:6px">
      <select style="width:100%;padding:6px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;margin-bottom:5px;background:var(--inp);color:var(--txt)" onchange="_beliItems[${i}].produkId=this.value;hitungBeliTotal()"><option>-- Pilih Produk --</option>${prodOpts}</select>
      <div style="display:flex;gap:5px">
        <input type="number" placeholder="Qty" value="${it.qty}" min="1" style="flex:1;padding:6px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;background:var(--inp);color:var(--txt)" onchange="_beliItems[${i}].qty=parseInt(this.value)||1;hitungBeliTotal()">
        <input type="number" placeholder="Harga beli" value="${it.hargaBeli||''}" min="0" style="flex:2;padding:6px;border:1.5px solid var(--brd);border-radius:6px;font-size:12px;background:var(--inp);color:var(--txt)" onchange="_beliItems[${i}].hargaBeli=parseInt(this.value)||0;hitungBeliTotal()">
        <button onclick="_beliItems.splice(${i},1);renderBeliItems()" style="padding:6px 8px;background:var(--rl);border:none;border-radius:6px;cursor:pointer">🗑</button>
      </div>
    </div>`).join(''):'<div class="empty-s" style="padding:12px"><p>Klik + Tambah Item</p></div>';
}
function hitungBeliTotal(){const tot=_beliItems.reduce((s,it)=>s+it.qty*it.hargaBeli,0);document.getElementById('beliTotal').value=tot;}
function simpanPembelian(){
  if(!_beliItems.length){showNotif('Tambah item dulu',1);return;}
  const tot=_beliItems.reduce((s,it)=>s+it.qty*it.hargaBeli,0);
  const now=new Date().toISOString();
  const perubahanModal=[];
  // Update stok + harga modal otomatis (FITUR BARU)
  _beliItems.forEach(it=>{
    const p=DB.produk.find(x=>x.id===parseInt(it.produkId));
    if(p&&it.qty>0){
      const stokAwal=p.stok;p.stok+=it.qty;
      DB.riwayatStok.push({waktu:now,produkId:p.id,nama:p.nama,jenis:'masuk',qty:it.qty,stokAwal,stokAkhir:p.stok,ref:'Pembelian'});
      // Update harga modal otomatis kalau beda dari sebelumnya
      if(it.hargaBeli>0&&p.modal!==it.hargaBeli){
        perubahanModal.push(p.nama+': '+fRp(p.modal||0)+'→'+fRp(it.hargaBeli));
        p.modal=it.hargaBeli;
      }
    }
  });
  const supIdx=document.getElementById('beliSup').value;
  const supplierNama=supIdx!==''?DB.supplier[parseInt(supIdx)]?.nama||'':'-';
  const belumLunas=document.getElementById('beliBelumLunas').checked;
  DB.pembelian.push({waktu:now,items:[..._beliItems],total:tot,supplier:supplierNama,catatan:document.getElementById('beliCatatan').value,lunas:!belumLunas});
  if(belumLunas&&supplierNama!=='-'){
    DB.hutangSupplier.push({supplier:supplierNama,nominal:tot,waktu:now,lunas:false,catatan:document.getElementById('beliCatatan').value});
    catatLog('Hutang ke Supplier','Hutang baru ke '+supplierNama+': '+fRp(tot));
  }
  if(perubahanModal.length)catatLog('Update Harga Modal','Dari pembelian: '+perubahanModal.join(', '));
  catatLog('Pembelian Stok',(supplierNama!=='-'?'Dari '+supplierNama+': ':'')+_beliItems.length+' item · total '+fRp(tot));
  saveDB();tutupM('mPembelian');renderPembelian();renderStok();showNotif(belumLunas?'✅ Stok diupdate, hutang supplier dicatat!':'✅ Stok & harga modal diupdate!');
}
function renderPembelian(){
  const list=document.getElementById('pembelianList');
  if(!DB.pembelian.length){list.innerHTML='<div class="empty-s"><div class="ei">🛍</div><p>Belum ada pembelian</p></div>';return;}
  list.innerHTML=[...DB.pembelian].reverse().map(b=>`
    <div class="beli-card">
      <div class="beli-head"><span class="beli-tgl">${fTgl(b.waktu)} · ${b.supplier||'-'}</span><span class="beli-tot">${fRp(b.total)}</span></div>
      <div class="beli-items">${b.items.map(it=>{const p=DB.produk.find(x=>x.id===parseInt(it.produkId));return (p?p.nama:'?')+' ×'+it.qty+' @'+fRp(it.hargaBeli||0);}).join(', ')}</div>
      ${b.catatan?`<div style="font-size:10px;color:var(--gray);margin-top:4px">📝 ${b.catatan}</div>`:''}
    </div>`).join('');
}
// ===== Riwayat harga modal per produk — v6 baru =====
function riwayatHargaModal(produkId){
  const pid=parseInt(produkId);
  const riwayat=[];
  DB.pembelian.forEach(b=>{
    b.items.forEach(it=>{
      if(parseInt(it.produkId)===pid&&it.hargaBeli>0){
        riwayat.push({waktu:b.waktu,harga:it.hargaBeli,supplier:b.supplier,qty:it.qty});
      }
    });
  });
  return riwayat.sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
}
function tampilkanRiwayatModal(produkId){
  const p=DB.produk.find(x=>x.id===parseInt(produkId));if(!p)return;
  const riwayat=riwayatHargaModal(produkId);
  let html=`<div style="padding:14px;"><h3 style="margin-bottom:10px;">📈 Riwayat Harga Modal: ${p.nama}</h3>`;
  if(!riwayat.length){
    html+='<div class="empty-s"><div class="ei">📊</div><p>Belum ada riwayat pembelian untuk produk ini</p></div>';
  } else {
    html+='<div style="display:flex;flex-direction:column;gap:6px;">';
    riwayat.forEach(r=>{
      html+=`<div style="background:var(--card);border:1.5px solid var(--brd);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;">
        <div><div style="font-size:12px;font-weight:700">${fRp(r.harga)}/pcs</div><div style="font-size:10px;color:var(--gray)">${fTgl(r.waktu)} · ${r.supplier||'-'} · qty ${r.qty}</div></div>
      </div>`;
    });
    html+='</div>';
  }
  html+=`<div style="font-size:11px;color:var(--gray);margin-top:10px;">Harga modal saat ini: <b>${fRp(p.modal||0)}</b></div></div>`;
  const modalBox=document.createElement('div');
  modalBox.className='mov show';
  modalBox.innerHTML=`<div class="modal" style="max-height:80vh;overflow-y:auto;">${html}<button class="bcan" style="margin-top:10px;width:100%" onclick="this.closest('.mov').remove()">Tutup</button></div>`;
  document.body.appendChild(modalBox);
}

// ============= PENGELUARAN =============
function renderPengeluaran(){
  const hari=DB.pengeluaran.filter(k=>{const d=new Date(k.waktu);const now=new Date();return d.toDateString()===now.toDateString();});
  const totHari=hari.reduce((s,k)=>s+k.nominal,0);
  const totBulan=DB.pengeluaran.filter(k=>{const d=new Date(k.waktu);const now=new Date();return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,k)=>s+k.nominal,0);
  const omzetHari=DB.transaksi.filter(t=>{const d=new Date(t.waktu);const now=new Date();return d.toDateString()===now.toDateString()&&!t.void;}).reduce((s,t)=>s+t.total,0);
  document.getElementById('kasSummary').innerHTML=`
    <div class="kas-sum-card"><div class="ksl">Pengeluaran Hari Ini</div><div class="ksv merah">${fRp(totHari)}</div></div>
    <div class="kas-sum-card"><div class="ksl">Kas Bersih Hari Ini</div><div class="ksv ${omzetHari-totHari>=0?'hijau':'merah'}">${fRp(omzetHari-totHari)}</div></div>
    <div class="kas-sum-card"><div class="ksl">Pengeluaran Bulan</div><div class="ksv merah">${fRp(totBulan)}</div></div>`;
  const list=document.getElementById('pengeluaranList');
  if(!DB.pengeluaran.length){list.innerHTML='<div class="empty-s"><div class="ei">💸</div><p>Belum ada pengeluaran</p></div>';return;}
  const katIco={Operasional:'🔧',Belanja:'🛍',Gaji:'💰',Lainnya:'📝'};
  list.innerHTML=[...DB.pengeluaran].reverse().map((k,i)=>`
    <div class="kas-card">
      <div class="kas-ico" style="background:var(--rl)">${katIco[k.kat]||'📝'}</div>
      <div class="kas-body"><div class="kas-nama">${k.nama}</div><div class="kas-det">${k.kat} · ${fTgl(k.waktu)}</div></div>
      <div><div class="kas-nom">${fRp(k.nominal)}</div><button class="ab2 bh" onclick="hapusKas(${DB.pengeluaran.length-1-i})">🗑</button></div>
    </div>`).join('');
}
function simpanKas(){
  const nm=document.getElementById('kasNama').value.trim();const nom=parseInt(document.getElementById('kasNominal').value)||0;
  if(!nm||!nom){showNotif('Isi keterangan & nominal',1);return;}
  DB.pengeluaran.push({nama:nm,kat:document.getElementById('kasKat').value,nominal:nom,waktu:new Date().toISOString()});
  saveDB();tutupM('mKas');renderPengeluaran();showNotif('✅ Pengeluaran dicatat');
}
function hapusKas(i){konfirmasi('Hapus pengeluaran?',()=>{DB.pengeluaran.splice(i,1);saveDB();renderPengeluaran();});}

