// ============= EXPORT CSV =============
function eksporCSV(){
  const headers=['ID','Nama','Barcode','Kategori','Harga Jual','Modal','Stok','Min Stok','Favorit'];
  const rows=DB.produk.map(p=>[p.id,p.nama,p.barcode||'',p.kat,p.harga,p.modal,p.timbang?'Timbang':p.stok,p.minStok||5,p.fav?'Ya':'Tidak']);
  const csv=[headers,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='stok_warung_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

// ============= IMPORT CSV =============
let _importData=[];let _importMode='tambah';

function downloadTemplateCSV(){
  const headers=['Nama','Barcode','Kategori','Harga Jual','Modal','Stok','Min Stok'];
  const contoh=[
    ['Indomie Goreng','8992388195607','Mie & Pasta','3500','2800','48','5'],
    ['Aqua 600ml','8886011101009','Minuman','3000','2200','60','10'],
    ['Chitato 68g','8999999011401','Snack','9000','7000','15','5'],
    ['Beras 5kg','','Sembako','70000','58000','20','3'],
  ];
  const csv=[headers,...contoh].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='template_import_produk.csv';
  a.click();
  showNotif('📄 Template didownload!');
}

function setModeImport(mode){
  _importMode=mode;
  document.getElementById('modeImportTambah').classList.toggle('active',mode==='tambah');
  document.getElementById('modeImportUpdate').classList.toggle('active',mode==='update');
  const info=document.getElementById('modeImportInfo');
  if(mode==='tambah'){
    info.textContent='Hanya tambah produk baru. Produk yang sudah ada (nama sama) tidak diubah.';
  } else {
    info.textContent='Update harga & stok produk yang sudah ada, dan tambah produk baru. Cocok untuk restok massal.';
  }
  renderImportPreview();
}

function resetImport(){
  _importData=[];_importMode='tambah';
  document.getElementById('csvFileInput').value='';
  // Kembali ke step 1
  goImportStep(1);
  document.getElementById('modeImportTambah').classList.add('active');
  document.getElementById('modeImportUpdate').classList.remove('active');
  document.getElementById('modeImportInfo').textContent='Hanya tambah produk baru. Produk yang sudah ada tidak diubah.';
}

function goImportStep(n){
  [1,2,3].forEach(i=>{
    document.getElementById('importStep'+i).style.display=i===n?'':'none';
    const ind=document.getElementById('importStep'+i+'Ind');
    ind.style.background=i===n?'var(--gm)':i<n?'var(--gl)':'var(--gl2)';
    ind.style.color=i<=n?'#fff':'var(--gray)';
  });
}

function parseCSVLine(line){
  const result=[];let cur='';let inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){
      if(inQ&&line[i+1]==='"'){cur+='"';i++;}
      else inQ=!inQ;
    } else if(c===','&&!inQ){
      result.push(cur.trim());cur='';
    } else cur+=c;
  }
  result.push(cur.trim());
  return result;
}

function prosesUploadCSV(e){
  const f=e.target.files[0];if(!f)return;
  if(!f.name.endsWith('.csv')&&f.type!=='text/csv'){showNotif('Pilih file .csv',1);return;}
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const text=ev.target.result.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
      const lines=text.split('\n').filter(l=>l.trim());
      if(lines.length<2){showNotif('File CSV kosong atau hanya header',1);return;}

      // Deteksi header
      const header=parseCSVLine(lines[0]).map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,''));
      // Cari index kolom secara fleksibel
      const findCol=(...keys)=>{
        for(const k of keys){const i=header.findIndex(h=>h.includes(k));if(i>=0)return i;}
        return -1;
      };
      const iNama=findCol('nama','name','produk');
      const iBarcode=findCol('barcode','kode','ean');
      const iKat=findCol('kat','kategori','category');
      const iHarga=findCol('hargajual','harga','price','jual');
      const iModal=findCol('modal','hargabeli','beli','cost');
      const iStok=findCol('stok','stock','qty','jumlah');
      const iMinStok=findCol('minstok','minimum','minqty','alert');

      if(iNama<0||iHarga<0){
        showNotif('Kolom "Nama" dan "Harga Jual" wajib ada di CSV',1);return;
      }

      _importData=[];
      const errors=[];
      for(let i=1;i<lines.length;i++){
        const cols=parseCSVLine(lines[i]);
        if(cols.every(c=>!c.trim()))continue; // skip baris kosong
        const nama=(cols[iNama]||'').trim();
        if(!nama){errors.push(`Baris ${i+1}: Nama kosong`);continue;}
        const harga=parseInt((cols[iHarga]||'0').replace(/[^0-9]/g,''))||0;
        if(harga<=0){errors.push(`Baris ${i+1}: Harga tidak valid (${cols[iHarga]||'-'})`);continue;}
        _importData.push({
          nama,
          barcode:iBarcode>=0?(cols[iBarcode]||'').trim():'',
          kat:iKat>=0?(cols[iKat]||'Lainnya').trim():'Lainnya',
          harga,
          modal:iModal>=0?parseInt((cols[iModal]||'0').replace(/[^0-9]/g,''))||0:0,
          stok:iStok>=0?parseInt((cols[iStok]||'0').replace(/[^0-9]/g,''))||0:0,
          minStok:iMinStok>=0?parseInt((cols[iMinStok]||'5').replace(/[^0-9]/g,''))||5:5,
        });
      }

      if(!_importData.length){showNotif('Tidak ada data valid di CSV',1);return;}

      // Tampilkan preview
      goImportStep(2);
      renderImportPreview();

      // Tampilkan error
      const errBox=document.getElementById('importErrorBox');
      if(errors.length){
        errBox.style.display='block';
        document.getElementById('importErrorList').innerHTML=errors.map(e=>`• ${e}`).join('<br>');
      } else errBox.style.display='none';

    }catch(err){showNotif('Gagal baca CSV: '+err.message,1);}
  };
  reader.readAsText(f,'UTF-8');
}

function renderImportPreview(){
  if(!_importData.length)return;
  document.getElementById('importJmlPreview').textContent=_importData.length;

  // Hitung ringkasan
  let jmlBaru=0,jmlUpdate=0;
  const tbody=document.getElementById('importPreviewBody');
  tbody.innerHTML=_importData.map((d,i)=>{
    const existing=DB.produk.find(p=>p.nama.toLowerCase()===d.nama.toLowerCase()||(d.barcode&&p.barcode===d.barcode));
    let status,statusStyle;
    if(existing){
      if(_importMode==='update'){
        status='🔄 Update';statusStyle='color:#d97706;font-weight:700;';jmlUpdate++;
      } else {
        status='⏭ Lewati';statusStyle='color:var(--gray);';
      }
    } else {
      status='✅ Baru';statusStyle='color:var(--gm);font-weight:700;';jmlBaru++;
    }
    return `<tr style="border-bottom:1px solid var(--brd);${i%2===0?'background:var(--card)':'background:var(--gl2)'}">
      <td style="padding:5px 8px;${statusStyle}">${status}</td>
      <td style="padding:5px 8px;font-size:11px;font-weight:600;">${d.nama}</td>
      <td style="padding:5px 8px;font-family:'Space Mono',monospace;font-size:10px;">${fRp(d.harga)}</td>
      <td style="padding:5px 8px;font-size:11px;">${d.stok}</td>
    </tr>`;
  }).join('');

  // Ringkasan
  const dilewati=_importMode==='tambah'?_importData.filter(d=>DB.produk.find(p=>p.nama.toLowerCase()===d.nama.toLowerCase()||(d.barcode&&p.barcode===d.barcode))).length:0;
  document.getElementById('importSummaryBox').innerHTML=`
    <div style="font-size:12px;font-weight:800;color:var(--gm);margin-bottom:6px;">📊 Ringkasan Import</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;">
      <div style="background:var(--w);border-radius:7px;padding:8px;">
        <div style="font-size:18px;font-weight:800;color:var(--gm);">${_importData.length}</div>
        <div style="font-size:10px;color:var(--gray);">Total Baris</div>
      </div>
      <div style="background:var(--w);border-radius:7px;padding:8px;">
        <div style="font-size:18px;font-weight:800;color:var(--gm);">${jmlBaru}</div>
        <div style="font-size:10px;color:var(--gray);">Produk Baru</div>
      </div>
      <div style="background:var(--w);border-radius:7px;padding:8px;">
        <div style="font-size:18px;font-weight:800;color:${_importMode==='update'?'#d97706':'var(--gray)'};">${_importMode==='update'?jmlUpdate:dilewati}</div>
        <div style="font-size:10px;color:var(--gray);">${_importMode==='update'?'Diupdate':'Dilewati'}</div>
      </div>
    </div>
  `;
}

function prosesImportCSV(){
  if(!_importData.length){showNotif('Tidak ada data',1);return;}
  let jmlBaru=0,jmlUpdate=0,jmlLewat=0;
  const now=new Date().toISOString();

  _importData.forEach(d=>{
    // Pastikan kategori ada
    if(!DB.kategori.includes(d.kat))DB.kategori.push(d.kat);

    const existing=DB.produk.find(p=>
      p.nama.toLowerCase()===d.nama.toLowerCase()||(d.barcode&&p.barcode===d.barcode)
    );

    if(existing){
      if(_importMode==='update'){
        const stokAwal=existing.stok;
        existing.harga=d.harga;
        existing.modal=d.modal||existing.modal;
        if(d.stok>0){
          existing.stok=d.stok;
          DB.riwayatStok.push({waktu:now,produkId:existing.id,nama:existing.nama,jenis:'masuk',qty:d.stok,stokAwal,stokAkhir:d.stok,ref:'Import CSV'});
        }
        existing.minStok=d.minStok||existing.minStok;
        if(d.barcode&&!existing.barcode)existing.barcode=d.barcode;
        if(d.kat&&d.kat!=='Lainnya')existing.kat=d.kat;
        jmlUpdate++;
      } else jmlLewat++;
    } else {
      // Produk baru
      const newP={
        id:DB.nextId++,
        nama:d.nama,barcode:d.barcode,kat:d.kat,
        harga:d.harga,modal:d.modal,
        stok:d.stok,minStok:d.minStok,
        fav:false,timbang:false,fotoUrl:null,
      };
      DB.produk.push(newP);
      if(d.stok>0){
        DB.riwayatStok.push({waktu:now,produkId:newP.id,nama:newP.nama,jenis:'masuk',qty:d.stok,stokAwal:0,stokAkhir:d.stok,ref:'Import CSV'});
      }
      jmlBaru++;
    }
  });

  saveDB();

  // Tampilkan hasil
  goImportStep(3);
  document.getElementById('importHasilTitle').textContent='Import Berhasil! 🎉';
  document.getElementById('importHasilDetail').innerHTML=
    `✅ <b>${jmlBaru}</b> produk baru ditambahkan<br>`+
    (jmlUpdate?`🔄 <b>${jmlUpdate}</b> produk diupdate<br>`:'')+
    (jmlLewat?`⏭ <b>${jmlLewat}</b> produk dilewati (sudah ada)<br>`:'')+
    `<br>📦 Total produk sekarang: <b>${DB.produk.length}</b>`;
  showNotif(`✅ Import selesai! ${jmlBaru} baru, ${jmlUpdate} update`);
}

// ============= RESTOK CEPAT =============
let _restokData={};   // {produkId: tambahQty}
let _restokKatAktif='';
let _restokCSVData=[];

function scanBarcodeStok(){
  bukaScanner(code=>{
    const p=DB.produk.find(x=>x.barcode===code);
    document.getElementById('stokSearch').value=code;
    renderStok();
    if(p)showNotif('✅ '+p.nama+' ditemukan');
    else showNotif('❌ Barcode "'+code+'" tidak ditemukan',1);
  });
}

function scanBarcodeRestok(){
  bukaScanner(code=>{
    const p=DB.produk.find(x=>x.barcode===code);
    document.getElementById('restokSearch').value=code;
    renderRestokList();
    if(p){
      showNotif('✅ '+p.nama+' ditemukan — masukkan jumlah restok');
      setTimeout(()=>{
        const inp=document.getElementById('restokInput_'+p.id);
        if(inp){inp.focus();inp.select();}
      },150);
    }else{
      showNotif('❌ Barcode "'+code+'" tidak ditemukan',1);
    }
  });
}

function setTabRestok(tab){
  document.getElementById('tabRestokManual').classList.toggle('active',tab==='manual');
  document.getElementById('tabRestokCSV').classList.toggle('active',tab==='csv');
  document.getElementById('restokTabManual').style.display=tab==='manual'?'':'none';
  document.getElementById('restokTabCSV').style.display=tab==='csv'?'':'none';
}

function bukaRestok(){
  _restokData={};
  document.getElementById('restokSearch').value='';
  document.getElementById('restokKet').value='';
  _restokKatAktif='';
  renderRestokKatFilter();
  renderRestokList();
  setTabRestok('manual');
  bukaM('mRestokCepat');
}

function renderRestokKatFilter(){
  const el=document.getElementById('restokKatFilter');
  if(!el)return;
  const kats=['Semua',...(DB.kategori||[])];
  el.innerHTML=kats.map(k=>`
    <button class="kpill ${(_restokKatAktif===k||(!_restokKatAktif&&k==='Semua'))?'active':''}"
      style="flex-shrink:0;font-size:11px;padding:4px 12px;"
      onclick="setRestokKat('${k}')">${k}</button>
  `).join('');
}

function setRestokKat(k){
  _restokKatAktif=k==='Semua'?'':k;
  renderRestokKatFilter();
  renderRestokList();
}

function renderRestokList(){
  const el=document.getElementById('restokList');if(!el)return;
  const q=(document.getElementById('restokSearch')?.value||'').toLowerCase();
  let produk=DB.produk.filter(p=>!p.timbang);
  if(_restokKatAktif)produk=produk.filter(p=>p.kat===_restokKatAktif);
  if(q)produk=produk.filter(p=>p.nama.toLowerCase().includes(q)||(p.barcode||'').includes(q));

  if(!produk.length){
    el.innerHTML='<div style="padding:20px;text-align:center;color:var(--gray);font-size:13px;">Produk tidak ditemukan</div>';
    return;
  }

  el.innerHTML=produk.map(p=>{
    const stokClass=p.stok===0?'color:var(--r)':p.stok<=(p.minStok||5)?'color:#d97706':'color:var(--stok-ok)';
    const val=_restokData[p.id]||'';
    return `<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--brd);background:${_restokData[p.id]?'var(--gf)':'var(--card)'};" id="restokRow_${p.id}">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nama}</div>
        <div style="font-size:10px;margin-top:2px;display:flex;gap:8px;align-items:center;">
          <span style="${stokClass};font-weight:700;">Stok: ${p.stok}</span>
          <span style="color:var(--gray);">${p.kat}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
        <button onclick="adjustRestok(${p.id},-1)" style="width:28px;height:28px;border-radius:7px;border:1.5px solid var(--brd);background:var(--gl2);font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--r);">−</button>
        <input type="number" min="0" id="restokInput_${p.id}" value="${val}"
          style="width:54px;padding:5px;border:2px solid ${val?'var(--gm)':'var(--brd)'};border-radius:7px;font-family:'Space Mono',monospace;font-size:14px;font-weight:700;text-align:center;background:var(--inp);color:var(--txt);outline:none;"
          placeholder="0" oninput="setRestokVal(${p.id},this.value)" onfocus="this.select()">
        <button onclick="adjustRestok(${p.id},1)" style="width:28px;height:28px;border-radius:7px;border:1.5px solid var(--brd);background:var(--gl2);font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--gm);">+</button>
      </div>
    </div>`;
  }).join('');
  updateRestokSummary();
}

function setRestokVal(id,val){
  const n=parseInt(val)||0;
  if(n>0)_restokData[id]=n;
  else delete _restokData[id];
  // Update row background
  const row=document.getElementById('restokRow_'+id);
  if(row)row.style.background=n>0?'var(--gf)':'var(--card)';
  const inp=document.getElementById('restokInput_'+id);
  if(inp)inp.style.borderColor=n>0?'var(--gm)':'var(--brd)';
  updateRestokSummary();
}

function adjustRestok(id,delta){
  const inp=document.getElementById('restokInput_'+id);
  if(!inp)return;
  const cur=parseInt(inp.value)||0;
  const nv=Math.max(0,cur+delta);
  inp.value=nv||'';
  setRestokVal(id,nv);
}

function updateRestokSummary(){
  const el=document.getElementById('restokSummary');if(!el)return;
  const keys=Object.keys(_restokData);
  if(!keys.length){el.style.display='none';return;}
  const totalItem=keys.length;
  const totalQty=keys.reduce((s,k)=>s+(_restokData[k]||0),0);
  el.style.display='block';
  el.innerHTML=`✅ <b>${totalItem}</b> produk akan direstok &nbsp;·&nbsp; Total <b>${totalQty}</b> unit ditambah`;
}

function simpanRestokCepat(){
  const keys=Object.keys(_restokData);
  if(!keys.length){showNotif('Belum ada produk yang direstok',1);return;}
  const ket=document.getElementById('restokKet').value.trim()||'Restok Manual';
  const now=new Date().toISOString();
  let jml=0;
  keys.forEach(id=>{
    const qty=_restokData[id]||0;if(!qty)return;
    const p=DB.produk.find(x=>x.id==id);if(!p)return;
    const stokAwal=p.stok;
    p.stok=stokAwal+qty;
    DB.riwayatStok.push({waktu:now,produkId:p.id,nama:p.nama,jenis:'masuk',qty,stokAwal,stokAkhir:p.stok,ref:ket});
    jml++;
  });
  saveDB();
  tutupM('mRestokCepat');
  renderStok();
  showNotif(`✅ Restok selesai! ${jml} produk diupdate`);
  _restokData={};
}

// ===== RESTOK via CSV =====
function downloadTemplateRestokCSV(){
  const headers=['Nama Produk','Barcode','Tambah Stok','Catatan'];
  const contoh=DB.produk.slice(0,3).map(p=>[p.nama,p.barcode||'','0','']);
  if(!contoh.length)contoh.push(['Indomie Goreng','8992388195607','48',''],['Aqua 600ml','8886011101009','60','']);
  const csv=[headers,...contoh].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='template_restok.csv';a.click();
  showNotif('📄 Template restok didownload!');
}

function resetRestokCSV(){
  _restokCSVData=[];
  document.getElementById('restokCSVInput').value='';
  document.getElementById('restokCSVFileName').textContent='Belum ada file dipilih';
  document.getElementById('restokCSVPreview').style.display='none';
}

function prosesRestokCSV(e){
  const f=e.target.files[0];if(!f)return;
  document.getElementById('restokCSVFileName').textContent=f.name;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const text=ev.target.result.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
      const lines=text.split('\n').filter(l=>l.trim());
      if(lines.length<2){showNotif('CSV kosong atau hanya header',1);return;}
      const header=lines[0].split(',').map(h=>h.replace(/"/g,'').toLowerCase().replace(/[^a-z0-9]/g,''));
      const iNama=header.findIndex(h=>h.includes('nama')||h.includes('produk'));
      const iBarcode=header.findIndex(h=>h.includes('barcode')||h.includes('kode'));
      const iTambah=header.findIndex(h=>h.includes('tambah')||h.includes('stok')||h.includes('qty')||h.includes('jumlah'));
      if(iNama<0&&iBarcode<0){showNotif('CSV harus punya kolom Nama atau Barcode',1);return;}
      if(iTambah<0){showNotif('CSV harus punya kolom Tambah Stok',1);return;}
      _restokCSVData=[];const errors=[];
      for(let i=1;i<lines.length;i++){
        const cols=lines[i].split(',').map(c=>c.replace(/^"|"$/g,'').trim());
        if(cols.every(c=>!c))continue;
        const namaCari=(cols[iNama]||'').trim();
        const barcodeCari=(iBarcode>=0?cols[iBarcode]||'':'').trim();
        const tambah=parseInt((cols[iTambah]||'0').replace(/[^0-9]/g,''))||0;
        const p=DB.produk.find(x=>(barcodeCari&&x.barcode===barcodeCari)||(namaCari&&x.nama.toLowerCase()===namaCari.toLowerCase()));
        if(!p){errors.push(`Baris ${i+1}: Produk "${namaCari||barcodeCari}" tidak ditemukan`);continue;}
        if(tambah<=0){errors.push(`Baris ${i+1}: Jumlah tambah harus lebih dari 0`);continue;}
        _restokCSVData.push({produk:p,tambah});
      }
      // Render preview
      document.getElementById('restokCSVJml').textContent=_restokCSVData.length;
      document.getElementById('restokCSVBody').innerHTML=_restokCSVData.map((d,i)=>`
        <tr style="border-bottom:1px solid var(--brd);${i%2===0?'':'background:var(--gl2)'}">
          <td style="padding:5px 8px;font-size:11px;color:var(--gm);font-weight:700;">✅ Siap</td>
          <td style="padding:5px 8px;font-size:11px;font-weight:600;">${d.produk.nama}</td>
          <td style="padding:5px 8px;text-align:center;font-family:'Space Mono',monospace;font-size:11px;">${d.produk.stok}</td>
          <td style="padding:5px 8px;text-align:center;font-family:'Space Mono',monospace;font-size:11px;color:var(--gm);font-weight:700;">+${d.tambah}</td>
          <td style="padding:5px 8px;text-align:center;font-family:'Space Mono',monospace;font-size:11px;font-weight:800;">${d.produk.stok+d.tambah}</td>
        </tr>`).join('');
      const errEl=document.getElementById('restokCSVError');
      if(errors.length){errEl.style.display='block';errEl.innerHTML='<b>⚠️ Dilewati:</b><br>'+errors.map(e=>`• ${e}`).join('<br>');}
      else errEl.style.display='none';
      document.getElementById('restokCSVPreview').style.display=_restokCSVData.length?'':'none';
      if(!_restokCSVData.length)showNotif('Tidak ada produk valid di CSV',1);
    }catch(err){showNotif('Gagal baca CSV: '+err.message,1);}
  };
  reader.readAsText(f,'UTF-8');
}

function simpanRestokCSV(){
  if(!_restokCSVData.length){showNotif('Tidak ada data restok',1);return;}
  const ket=document.getElementById('restokCSVKet').value.trim()||'Import Restok CSV';
  const now=new Date().toISOString();
  _restokCSVData.forEach(d=>{
    const stokAwal=d.produk.stok;
    d.produk.stok=stokAwal+d.tambah;
    DB.riwayatStok.push({waktu:now,produkId:d.produk.id,nama:d.produk.nama,jenis:'masuk',qty:d.tambah,stokAwal,stokAkhir:d.produk.stok,ref:ket});
  });
  saveDB();tutupM('mRestokCepat');renderStok();
  showNotif(`✅ Restok CSV selesai! ${_restokCSVData.length} produk diupdate`);
  resetRestokCSV();_restokCSVData=[];
}

