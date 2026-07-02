// ============= PRODUK RENDER =============
let filterKat='';
let sortMode='default'; // 'default' | 'az' | 'terlaris'
function setSortMode(mode){
  sortMode=mode;
  ['Default','AZ','Terlaris'].forEach(s=>{
    const id='sort'+s;
    const el=document.getElementById(id);
    if(el)el.classList.toggle('active',(s==='Default'&&mode==='default')||(s==='AZ'&&mode==='az')||(s==='Terlaris'&&mode==='terlaris'));
  });
  renderProduk();
}
// Hitung qty total terjual per produk (semua histori transaksi non-void), dipakai untuk sort "Terlaris"
function hitungTotalLaku(){
  const map={};
  (DB.transaksi||[]).forEach(t=>{
    if(t.void)return;
    (t.items||[]).forEach(it=>{
      if(it.isBundling)return;
      map[it.id]=(map[it.id]||0)+(it.qty||0);
    });
  });
  return map;
}
function renderKatFilter(){
  const fr=document.getElementById('filterRow');
  const katList=['Semua',...(DB.kategori||[])];
  fr.innerHTML=katList.map(k=>`<button class="kpill ${filterKat===k||(k==='Semua'&&!filterKat)?'active':''}" onclick="setKat('${k}')">${k}</button>`).join('');
}
function setKat(k){filterKat=k==='Semua'?'':k;document.querySelectorAll('.kpill').forEach(p=>p.classList.toggle('active',p.textContent===k));renderProduk();}
function clearSearch(){document.getElementById('searchP').value='';renderProduk();}
function renderKasir(){renderKatFilter();renderProduk();renderHoldSlots();renderFavBar();}
function renderFavBar(){
  const favs=DB.produk.filter(p=>p.fav);
  const fb=document.getElementById('favBar');
  if(!favs.length){fb.style.display='none';return;}
  fb.style.display='flex';
  document.getElementById('favChips').innerHTML=favs.map(p=>{
    const stokInfo=p.timbang?'':'· '+p.stok;
    return `<button class="fav-chip" onclick="addProduk(${p.id})">${p.fotoUrl?`<img src="${p.fotoUrl}" class="fav-img">`:''}${p.nama.split(' ')[0]} ${stokInfo}</button>`;
  }).join('');
}

// Prediksi stok habis
function prediksiHabisDalam(p){
  const trx30=DB.transaksi.filter(t=>{const d=new Date(t.waktu);const now=new Date();return (now-d)<30*24*3600*1000&&!t.void;});
  let totalJual=0;trx30.forEach(t=>t.items.forEach(it=>{if(it.id===p.id&&!it.timbang)totalJual+=it.qty;}));
  if(!totalJual)return null;
  const rataHari=totalJual/30;
  const hariSisa=Math.floor(p.stok/rataHari);
  return hariSisa;
}

// ===== KONSTANTA PERFORMA =====
const PRODUK_PAGE_SIZE = 40;
let _produkPage = 0;
let _produkList = [];
let _produkScrollHandler = null;

function renderProduk(){
  const q=(document.getElementById('searchP').value||'').toLowerCase();
  const pg=document.getElementById('pgrid');
  let list=DB.produk.filter(p=>{
    const cariOk=!q||(p.nama.toLowerCase().includes(q)||p.barcode?.includes(q));
    const katOk=!filterKat||p.kat===filterKat;
    return cariOk&&katOk;
  });
  const _lakuMap=sortMode==='terlaris'?hitungTotalLaku():null;
  if(sortMode==='az'){list=list.slice().sort((a,b)=>a.nama.localeCompare(b.nama,'id'));}
  else if(sortMode==='terlaris'){list=list.slice().sort((a,b)>(_lakuMap[b.id]||0)-(_lakuMap[a.id]||0));}
  if(!list.length){pg.innerHTML='<div class="empty-s"><div class="ei">🔍</div><p>Produk tidak ditemukan</p></div>';return;}
  const lowList=list.filter(p=>!p.timbang&&p.stok<=(p.minStok||5)&&p.stok>=0);
  let alertHTML='';
  if(lowList.length){
    alertHTML=`<div style="background:#fff3e0;border-bottom:1.5px solid #fed7aa;padding:8px 12px;font-size:11px;font-weight:700;color:#92400e;display:flex;align-items:center;gap:8px;flex-shrink:0;">⚠️ Stok hampir habis: ${lowList.map(p=>`<span style="background:var(--r);color:#fff;padding:1px 6px;border-radius:4px">${p.nama} (${p.stok})</span>`).join(' ')}</div>`;
  }
  _produkList=list;
  _produkPage=0;
  if(_produkScrollHandler){pg.removeEventListener('scroll',_produkScrollHandler);_produkScrollHandler=null;}
  pg.innerHTML=alertHTML+'<div id="produkItems"></div>';
  _renderProdukBatch(_lakuMap);
  if(_produkList.length>PRODUK_PAGE_SIZE){
    _produkScrollHandler=()=>{if(pg.scrollTop+pg.clientHeight>=pg.scrollHeight-200)_renderProdukBatch(_lakuMap);};
    pg.addEventListener('scroll',_produkScrollHandler,{passive:true});
  }
}

// IntersectionObserver untuk lazy loading foto — dibuat sekali, dipakai semua gambar
const _lazyObserver=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){const img=e.target;if(img.dataset.src){img.src=img.dataset.src;delete img.dataset.src;}_lazyObserver.unobserve(img);}});
},{rootMargin:'200px'}):null;

function _renderProdukBatch(_lakuMap){
  const start=_produkPage*PRODUK_PAGE_SIZE;
  const batch=_produkList.slice(start,start+PRODUK_PAGE_SIZE);
  if(!batch.length)return;
  _produkPage++;
  const container=document.getElementById('produkItems');
  if(!container)return;
  const html=batch.map(p=>{
    const inCart=keranjang.filter(i=>i.id===p.id).reduce((s,i)=>s+i.qty,0);
    const habis=!p.timbang&&p.stok<=0;
    let stokClass='stok-ok',stokTxt='Stok '+p.stok;
    if(!p.timbang){if(p.stok<=0){stokClass='stok-habis';stokTxt='Habis';}else if(p.stok<=(p.minStok||5)){stokClass='stok-low';stokTxt='⚠ Sisa '+p.stok;}}
    let expBadge='';
    if(p.exp){const dExp=new Date(p.exp);const now=new Date();const diff=(dExp-now)/(1000*3600*24);if(diff<0)expBadge='<span class="expired-badge">Expired</span>';else if(diff<7)expBadge=`<span class="expired-badge">Exp ${Math.round(diff)}h</span>`;}
    let predBadge='';
    if(!p.timbang&&p.stok>0){const hari=prediksiHabisDalam(p);if(hari!==null){if(hari<=3)predBadge=`<span class="prediksi-badge prediksi-merah">📉 Habis ~${hari} hari</span>`;else if(hari<=7)predBadge=`<span class="prediksi-badge prediksi-kuning">📉 Habis ~${hari} hari</span>`;}}
    let promoBadge=p.promo&&p.promoHarga?'<span class="promo-badge">🏷 Promo</span>':'';
    let terlarisBadge='';
    if(sortMode==='terlaris'){const laku=(_lakuMap&&_lakuMap[p.id])||0;if(laku>0)terlarisBadge=`<span class="hbadge" style="background:var(--o)">🔥 ${laku} terjual</span>`;}
    const hargaAktif=p.promo&&p.promoHarga?p.promoHarga:p.harga;
    // Lazy loading: pakai data-src bukan src, foto di-load lewat IntersectionObserver saat masuk viewport
    const icoHTML=p.fotoUrl
      ?`<img data-src="${p.fotoUrl}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="lazy-img" style="width:42px;height:42px;border-radius:10px;object-fit:cover;flex-shrink:0">`
      :`<div class="pcard-ico ${p.timbang?'timbang':''}">${p.kat==='Mie & Pasta'?'🍜':p.kat==='Minuman'?'🥤':p.kat==='Snack'?'🍟':p.kat==='Rokok'?'🚬':p.kat==='Sembako'?'🌾':p.kat==='Kebersihan'?'🧹':p.kat==='Sayur & Buah'?'🥬':p.kat==='Daging & Ikan'?'🥩':'📦'}</div>`;
    return `<div class="pcard ${habis?'habis':''} ${p.fav?'fav-item':''} ${p.timbang?'timbang':''}" onclick="addProduk(${p.id})">${icoHTML}<div class="pcard-body"><div class="pn">${p.nama}</div><div class="prow2"><span class="pkb">${p.kat}</span>${!p.timbang?`<span class="ps ${stokClass}">${stokTxt}</span>`:'<span class="timbang-badge">⚖ Timbang</span>'}${expBadge}${promoBadge}${predBadge}${terlarisBadge}</div></div><div class="pcard-right"><div class="ph ${p.timbang?'tim':''}">${fRp(hargaAktif)}${p.timbang?'/kg':''}</div>${p.promo&&p.promoHarga?`<div style="font-size:10px;color:var(--gray);text-decoration:line-through">${fRp(p.harga)}</div>`:''}${p.grosir?`<div style="font-size:9px;color:var(--o);font-weight:700">${fRp(p.grosir)} ×${p.grosirMin}</div>`:''}${inCart>0?`<div style="font-size:10px;font-weight:700;color:var(--r);background:var(--rl);padding:2px 6px;border-radius:4px">🛒 ${inCart}</div>`:''}<button class="padd" onclick="event.stopPropagation();addProduk(${p.id})" ${habis?'disabled':''}>+</button></div></div>`;
  }).join('');
  container.insertAdjacentHTML('beforeend',html);
  if(_lazyObserver){container.querySelectorAll('img.lazy-img:not([data-observed])').forEach(img=>{img.dataset.observed='1';_lazyObserver.observe(img);});}
  else{container.querySelectorAll('img.lazy-img').forEach(img=>{if(img.dataset.src)img.src=img.dataset.src;});}
  const sisanya=_produkList.length-_produkPage*PRODUK_PAGE_SIZE;
  let infoEl=document.getElementById('produkLoadMore');
  if(sisanya>0){if(!infoEl)container.insertAdjacentHTML('afterend','<div id="produkLoadMore" style="text-align:center;padding:10px;font-size:11px;color:var(--gray)">Scroll ke bawah untuk lihat lebih banyak...</div>');}
  else{if(infoEl)infoEl.remove();if(_produkScrollHandler){document.getElementById('pgrid')?.removeEventListener('scroll',_produkScrollHandler);_produkScrollHandler=null;}}
}


// ============= TIMBANG =============
let _timProduk=null,_timUnit='kg';
function bukaTimbang(p){
  _timProduk=p;_timUnit='kg';
  document.getElementById('timNama').textContent=p.nama;
  document.getElementById('timHarga').textContent=fRp(p.harga)+'/kg';
  document.getElementById('timImg').innerHTML=p.fotoUrl?`<img src="${p.fotoUrl}" style="width:48px;height:48px;border-radius:10px;object-fit:cover">`:'<span style="font-size:32px">⚖</span>';
  document.getElementById('beratInput').value='';
  document.getElementById('hasilHarga').textContent='Rp 0';
  document.getElementById('hasilDetail').textContent='-';
  // satuan pills
  const satuan=p.satuan?[p.satuan,'gram','ons']:['kg','gram','ons'];
  _timUnit=satuan[0];
  document.getElementById('satuanPills').innerHTML=satuan.map(s=>`<button class="satuan-pill ${s===_timUnit?'active':''}" onclick="setSatuanTim('${s}',this)">${s}</button>`).join('');
  document.getElementById('beratUnit').textContent=_timUnit;
  // cepat
  const cepat=_timUnit==='gram'?[100,250,500,750]:_timUnit==='ons'?[1,2,3,5]:[0.25,0.5,1,1.5,2];
  document.getElementById('beratCepat').innerHTML=cepat.map(v=>`<button onclick="document.getElementById('beratInput').value=${v};hitungTimbang()">${v}${_timUnit}</button>`).join('');
  bukaM('mTimbang');
}
function setSatuanTim(s,btn){
  _timUnit=s;
  document.querySelectorAll('.satuan-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('beratUnit').textContent=s;
  const cepat=s==='gram'?[100,250,500,750]:s==='ons'?[1,2,3,5]:[0.25,0.5,1,1.5,2];
  document.getElementById('beratCepat').innerHTML=cepat.map(v=>`<button onclick="document.getElementById('beratInput').value=${v};hitungTimbang()">${v}${s}</button>`).join('');
  hitungTimbang();
}
function hitungTimbang(){
  const berat=parseFloat(document.getElementById('beratInput').value)||0;
  if(!_timProduk||berat<=0){document.getElementById('hasilHarga').textContent='Rp 0';document.getElementById('hasilDetail').textContent='-';return;}
  let kg=berat;if(_timUnit==='gram')kg=berat/1000;else if(_timUnit==='ons')kg=berat/10;
  const h=Math.round(_timProduk.harga*kg);
  document.getElementById('hasilHarga').textContent=fRp(h);
  document.getElementById('hasilDetail').textContent=`${berat}${_timUnit} × ${fRp(_timProduk.harga)}/kg`;
}

// ============= HARGA CUSTOM =============
function bukaHargaCustom(idx){
  if(me&&me.role==='kasir'){showNotif('⚠ Hanya Pemilik yang bisa ubah harga',1);return;}
  const it=keranjang[idx];if(!it)return;
  document.getElementById('hcNama').value=it.nama;
  document.getElementById('hcNormal').value=fRp(it.harga);
  document.getElementById('hcInput').value=it.hargaCustom!==null?it.hargaCustom:it.harga;
  document.getElementById('hcIdx').value=idx;
  bukaM('mHargaCustom');
}
function simpanHargaCustom(){
  const idx=parseInt(document.getElementById('hcIdx').value);
  const v=parseInt(document.getElementById('hcInput').value)||0;
  keranjang[idx].hargaCustom=v;
  tutupM('mHargaCustom');renderKeranjang();hitungDiskon();showNotif('✅ Harga diubah');
}

// ============= SCANNER (3 MODE) =============
let _scanStream=null,_scanInterval=null,_scanCtx=null,_scanCanvas=null,_scanCB=null,_scanMode='kamera';

function bukaScanner(callback=null){
  _scanCB=callback;
  bukaM('mScanner');
  // Reset state
  document.getElementById('scanFotoPreviewWrap').style.display='none';
  document.getElementById('manualBarcodeInput').value='';
  // Auto-pilih mode: coba kamera live dulu, kalau gagal auto switch ke foto
  switchScanMode('kamera');
}

function tutupScanner(){
  stopScan();
  tutupM('mScanner');
  // Reset file inputs supaya bisa dipilih ulang
  document.getElementById('scanFotoKamera').value='';
  document.getElementById('scanFotoGaleri').value='';
}

function switchScanMode(mode){
  _scanMode=mode;
  stopScan();
  // Update tab buttons
  ['kamera','foto','manual'].forEach(m=>{
    document.getElementById('scanTab'+m.charAt(0).toUpperCase()+m.slice(1)).classList.toggle('active',m===mode);
  });
  // Show/hide panels
  document.getElementById('scanModeKamera').style.display=mode==='kamera'?'':'none';
  document.getElementById('scanModeFoto').style.display=mode==='foto'?'':'none';
  document.getElementById('scanModeManual').style.display=mode==='manual'?'':'none';

  if(mode==='kamera'){
    startScanLive();
  } else if(mode==='foto'){
    document.getElementById('scanResult').textContent='📸 Tap "Buka Kamera" atau "Pilih dari Galeri"';
  } else {
    document.getElementById('scanResult').textContent='⌨️ Ketik barcode lalu tekan Cari';
    setTimeout(()=>document.getElementById('manualBarcodeInput').focus(),100);
  }
}

async function startScanLive(){
  const v=document.getElementById('scanVideo');
  document.getElementById('scanResult').textContent='⏳ Membuka kamera...';
  try{
    _scanStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}
    });
    v.srcObject=_scanStream;
    await v.play();
    _scanCanvas=document.createElement('canvas');
    _scanCtx=_scanCanvas.getContext('2d',{willReadFrequently:true});

    // Coba BarcodeDetector API (Chrome Android 83+, paling akurat)
    if('BarcodeDetector' in window){
      const detector=new BarcodeDetector({
        formats:['ean_13','ean_8','qr_code','code_128','code_39','upc_a','upc_e','itf','data_matrix','aztec','pdf417']
      });
      _scanInterval=setInterval(async()=>{
        if(v.readyState===v.HAVE_ENOUGH_DATA&&v.videoWidth>0){
          try{const b=await detector.detect(v);if(b.length>0)processBarcode(b[0].rawValue);}catch(_){}
        }
      },250);
      document.getElementById('scanResult').textContent='📷 Kamera aktif — arahkan ke barcode...';
    } else {
      // Fallback jsQR (load dari CDN jika belum ada)
      const doJsQR=()=>{
        _scanInterval=setInterval(()=>{
          if(v.readyState===v.HAVE_ENOUGH_DATA&&v.videoWidth>0){
            _scanCanvas.height=v.videoHeight;_scanCanvas.width=v.videoWidth;
            _scanCtx.drawImage(v,0,0,_scanCanvas.width,_scanCanvas.height);
            const img=_scanCtx.getImageData(0,0,_scanCanvas.width,_scanCanvas.height);
            const code=jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'});
            if(code)processBarcode(code.data);
          }
        },250);
        document.getElementById('scanResult').textContent='📷 Kamera aktif (jsQR) — arahkan ke barcode...';
      };
      if(window.jsQR){doJsQR();}
      else{
        document.getElementById('scanResult').textContent='⏳ Memuat library scan...';
        const sc=document.createElement('script');
        sc.src='https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
        sc.onload=doJsQR;
        sc.onerror=()=>{
          document.getElementById('scanResult').textContent='⚠️ Kamera aktif tapi library gagal dimuat. Coba mode Foto atau Manual.';
        };
        document.head.appendChild(sc);
      }
    }
  }catch(e){
    // Kamera gagal — otomatis sarankan mode foto
    document.getElementById('scanResult').innerHTML=
      '❌ Kamera tidak bisa diakses di file lokal.<br>'+
      '<b>Coba mode 🖼 Foto</b> — tap tombol tab "Foto/Galeri" di atas!';
    showNotif('Kamera gagal — coba mode Foto',1);
    // Auto switch ke foto setelah 1.5 detik
    setTimeout(()=>{if(_scanMode==='kamera')switchScanMode('foto');},1500);
  }
}

function stopScan(){
  if(_scanInterval)clearInterval(_scanInterval);
  if(_scanStream)_scanStream.getTracks().forEach(t=>t.stop());
  _scanStream=null;_scanInterval=null;
}

// ---- MODE FOTO: proses gambar dari kamera/galeri ----
function prosesGambarBarcode(e){
  const f=e.target.files[0];if(!f)return;
  document.getElementById('scanResult').textContent='⏳ Memproses gambar...';
  const reader=new FileReader();
  reader.onload=ev=>{
    const imgEl=document.getElementById('scanFotoPreview');
    imgEl.src=ev.target.result;
    document.getElementById('scanFotoPreviewWrap').style.display='block';
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      // Scale down supaya cepat diproses
      const maxW=800;
      const scale=Math.min(1,maxW/img.width);
      canvas.width=img.width*scale;canvas.height=img.height*scale;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);

      // Coba BarcodeDetector dari gambar
      if('BarcodeDetector' in window){
        const detector=new BarcodeDetector({
          formats:['ean_13','ean_8','qr_code','code_128','code_39','upc_a','upc_e','itf','data_matrix']
        });
        // BarcodeDetector bisa detect dari ImageBitmap
        createImageBitmap(f).then(bmp=>{
          detector.detect(bmp).then(barcodes=>{
            if(barcodes.length>0){
              processBarcode(barcodes[0].rawValue);
            } else {
              // Fallback ke jsQR
              tryJsQROnImageData(imageData,canvas.width,canvas.height);
            }
          }).catch(()=>tryJsQROnImageData(imageData,canvas.width,canvas.height));
        }).catch(()=>tryJsQROnImageData(imageData,canvas.width,canvas.height));
      } else {
        tryJsQROnImageData(imageData,canvas.width,canvas.height);
      }
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(f);
}

function tryJsQROnImageData(imageData,w,h){
  const doDetect=()=>{
    const code=jsQR(imageData.data,w,h,{inversionAttempts:'attemptBoth'});
    if(code){processBarcode(code.data);}
    else{
      document.getElementById('scanResult').textContent=
        '❌ Barcode tidak terbaca dari foto. Pastikan barcode terlihat jelas & tidak blur. Coba lagi atau pakai mode Manual.';
      playBeep(false);
    }
  };
  if(window.jsQR){doDetect();}
  else{
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
    sc.onload=doDetect;
    sc.onerror=()=>{document.getElementById('scanResult').textContent='❌ Library tidak bisa dimuat. Gunakan mode Manual.';};
    document.head.appendChild(sc);
  }
}

// ---- MODE MANUAL: ketik barcode ----
function submitManualBarcode(){
  const code=document.getElementById('manualBarcodeInput').value.trim();
  if(!code){showNotif('Masukkan kode barcode',1);return;}
  processBarcode(code);
}

// ---- PROSES BARCODE (semua mode) ----
function processBarcode(code){
  document.getElementById('scanResult').textContent='✅ Barcode: '+code;
  playBeep(true);
  if(_scanCB){
    stopScan();
    _scanCB(code);
    tutupM('mScanner');
    return;
  }
  const p=DB.produk.find(x=>x.barcode===code);
  if(p){
    addProduk(p.id);
    stopScan();
    tutupM('mScanner');
    showNotif('✅ '+p.nama+' ditambah');
  } else {
    document.getElementById('scanResult').textContent=
      '❌ Barcode "'+code+'" tidak ditemukan di database produk.';
    playBeep(false);
  }
}

function scanBarcodeTambah(){
  bukaScanner(code=>{
    document.getElementById('fBarcode').value=code;
    showNotif('✅ Barcode: '+code);
  });
}

// ============= FOTO PRODUK =============
let _fotoBase64=null;
function triggerFotoInput(){document.getElementById('fotoInput').click();}
function handleFoto(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    _fotoBase64=ev.target.result;
    const prev=document.getElementById('fotoPreview');
    prev.src=_fotoBase64;prev.style.display='block';
    document.getElementById('fotoPlaceholder').style.display='none';
    document.getElementById('fotoRemove').style.display='flex';
  };
  r.readAsDataURL(f);
}
function hapusFoto(e){e.stopPropagation();_fotoBase64=null;document.getElementById('fotoPreview').style.display='none';document.getElementById('fotoPlaceholder').style.display='block';document.getElementById('fotoRemove').style.display='none';document.getElementById('fotoInput').value='';}

// ============= PRODUK CRUD =============
function bukaModalTambah(p=null){
  _fotoBase64=null;
  document.getElementById('fotoPreview').style.display='none';document.getElementById('fotoPlaceholder').style.display='block';document.getElementById('fotoRemove').style.display='none';
  document.getElementById('mTambahTitle').textContent=p?'✏ Edit Produk':'+ Tambah Produk';
  document.getElementById('fKat').innerHTML=(DB.kategori||[]).map(k=>`<option ${p&&p.kat===k?'selected':''}>${k}</option>`).join('');
  if(p){
    document.getElementById('fNama').value=p.nama||'';document.getElementById('fBarcode').value=p.barcode||'';
    document.getElementById('fHarga').value=p.harga||'';document.getElementById('fModal').value=p.modal||'';
    document.getElementById('fGrosir').value=p.grosir||'';document.getElementById('fGrosirMin').value=p.grosirMin||'';
    document.getElementById('fStok').value=p.stok||'';document.getElementById('fMinStok').value=p.minStok||'';
    document.getElementById('fExp').value=p.exp||'';document.getElementById('fTimbang').checked=!!p.timbang;
    document.getElementById('fFav').checked=!!p.fav;document.getElementById('fSatuan').value=p.satuan||'kg';
    document.getElementById('fId').value=p.id;
    document.getElementById('fgSatuan').style.display=p.timbang?'block':'none';
    if(p.fotoUrl){_fotoBase64=p.fotoUrl;const prev=document.getElementById('fotoPreview');prev.src=p.fotoUrl;prev.style.display='block';document.getElementById('fotoPlaceholder').style.display='none';document.getElementById('fotoRemove').style.display='flex';}
  }else{
    ['fNama','fBarcode','fHarga','fModal','fGrosir','fGrosirMin','fStok','fMinStok','fExp','fSatuan'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('fTimbang').checked=false;document.getElementById('fFav').checked=false;
    document.getElementById('fId').value='';document.getElementById('fgSatuan').style.display='none';
  }
  document.getElementById('fTimbang').onchange=function(){document.getElementById('fgSatuan').style.display=this.checked?'block':'none';};
  bukaM('mTambah');
}
function simpanProduk(){
  if(me&&me.role==='kasir'){showNotif('⚠ Hanya Pemilik/Manajer Stok yang bisa ubah produk',1);return;}
  const id=parseInt(document.getElementById('fId').value)||null;
  const nm=document.getElementById('fNama').value.trim();
  if(!nm){showNotif('Nama produk harus diisi',1);return;}
  // Peringatan kalau nama produk sudah ada (bukan blokir keras — ada warung yang sengaja
  // punya 2 entri nama sama untuk varian/rak berbeda, jadi cukup minta konfirmasi).
  const namaDup=DB.produk.find(x=>x.nama.toLowerCase()===nm.toLowerCase()&&x.id!==id);
  if(namaDup){
    konfirmasi('Produk dengan nama "'+namaDup.nama+'" sudah ada.\nTetap simpan sebagai produk baru/terpisah?',()=>{
      _simpanProdukEksekusi(id,nm);
    },{labelYa:'✔ Tetap Simpan',warna:'var(--gm)'});
    return;
  }
  _simpanProdukEksekusi(id,nm);
}
function _simpanProdukEksekusi(id,nm){
  const data={
    nama:nm,barcode:document.getElementById('fBarcode').value.trim(),kat:document.getElementById('fKat').value,
    harga:parseInt(document.getElementById('fHarga').value)||0,modal:parseInt(document.getElementById('fModal').value)||0,
    grosir:parseInt(document.getElementById('fGrosir').value)||null,grosirMin:parseInt(document.getElementById('fGrosirMin').value)||null,
    stok:parseInt(document.getElementById('fStok').value)||0,minStok:parseInt(document.getElementById('fMinStok').value)||5,
    exp:document.getElementById('fExp').value||null,timbang:document.getElementById('fTimbang').checked,
    fav:document.getElementById('fFav').checked,satuan:document.getElementById('fSatuan').value||'kg',
    fotoUrl:_fotoBase64||null,
  };
  if(id){
    const i=DB.produk.findIndex(x=>x.id===id);
    if(i!==-1){
      const lama=DB.produk[i];
      const perubahan=[];
      if(lama.harga!==data.harga)perubahan.push('harga '+fRp(lama.harga)+'→'+fRp(data.harga));
      if(lama.stok!==data.stok)perubahan.push('stok '+lama.stok+'→'+data.stok);
      if(lama.nama!==data.nama)perubahan.push('nama "'+lama.nama+'"→"'+data.nama+'"');
      DB.produk[i]={...DB.produk[i],...data};
      catatLog('Edit Produk', nm+(perubahan.length?': '+perubahan.join(', '):' (tanpa perubahan nilai utama)'));
      // Notif WA kalau harga berubah signifikan (>10%)
      if(lama.harga>0&&data.harga>0){
        const selisihPct=Math.abs(data.harga-lama.harga)/lama.harga*100;
        if(selisihPct>=10){
          notifWaOwnerAksi(
            'PERUBAHAN HARGA PRODUK',
            `Produk: ${nm}\nHarga lama: ${fRp(lama.harga)}\nHarga baru: ${fRp(data.harga)}\nSelisih: ${selisihPct.toFixed(0)}%`,
            '💰'
          );
        }
      }
    }
  }
  else{
    data.id=DB.nextId++;DB.produk.push(data);
    catatLog('Tambah Produk', nm+' · harga '+fRp(data.harga)+' · stok awal '+data.stok);
  }
  saveDB();tutupM('mTambah');renderStok();renderKasir();showNotif('✅ Produk disimpan!');
}
function hapusProduk(id){
  if(me&&me.role!=='owner'){showNotif('⚠ Hanya Pemilik yang bisa hapus produk',1);return;}
  const p=DB.produk.find(x=>x.id===id);
  konfirmasi('Hapus produk ini?',()=>{
    catatLog('Hapus Produk', (p?.nama||'ID:'+id)+' · stok terakhir '+(p?.stok??'-'));
    notifWaOwnerAksi(
      'PRODUK DIHAPUS',
      `Produk: ${p?.nama||'ID:'+id}\nStok terakhir: ${p?.stok??'-'}\nHarga: ${fRp(p?.harga||0)}`,
      '🗑'
    );
    DB.produk=DB.produk.filter(x=>x.id!==id);saveDB();renderStok();renderKasir();showNotif('Produk dihapus');
  });
}
function toggleFav(id){
  const p=DB.produk.find(x=>x.id===id);if(p)p.fav=!p.fav;saveDB();renderStok();renderFavBar();showNotif(p?.fav?'⭐ Ditandai favorit':'Dihapus dari favorit');
}

// ============= STOK PAGE =============
let _stokSort='laku';
function setStokSort(mode){
  _stokSort=mode;
  document.querySelectorAll('[id^="sortBtn_"]').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('sortBtn_'+mode);
  if(btn)btn.classList.add('active');
  renderStok();
}

function hitungTerlaris(){
  // Hitung total qty terjual per produk dari semua transaksi (tidak void)
  const cm={};
  DB.transaksi.filter(t=>!t.void).forEach(t=>
    t.items.forEach(it=>{ cm[it.id]=(cm[it.id]||0)+(it.qty||1); })
  );
  return cm;
}

function renderStok(){
  const low=DB.produk.filter(p=>!p.timbang&&p.stok<=(p.minStok||5));
  const al=document.getElementById('alertS');
  if(low.length){al.style.display='block';al.innerHTML='⚠️ Stok mau habis: '+low.map(p=>`<b>${p.nama}</b> (${p.stok})`).join(', ')+'<br>💡 Saran restok: '+low.map(p=>`${p.nama} +${(p.minStok||5)*3-p.stok}`).join(', ');}
  else al.style.display='none';

  const q=(document.getElementById('stokSearch')?.value||'').toLowerCase().trim();
  const terlaris=hitungTerlaris();

  let produk=[...DB.produk];

  // Filter pencarian — nama ATAU barcode
  if(q){
    produk=produk.filter(p=>
      p.nama.toLowerCase().includes(q)||
      (p.barcode||'').toLowerCase().includes(q)||
      (p.kat||'').toLowerCase().includes(q)
    );
  }

  // Sort
  if(_stokSort==='laku'){
    produk.sort((a,b)=>(terlaris[b.id]||0)-(terlaris[a.id]||0));
  } else if(_stokSort==='abjad'){
    produk.sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
  } else if(_stokSort==='barcode'){
    produk.sort((a,b)=>{
      const ba=a.barcode||'zzz', bb=b.barcode||'zzz';
      return ba.localeCompare(bb);
    });
  } else if(_stokSort==='stok'){
    produk.sort((a,b)=>{
      if(a.timbang&&b.timbang)return 0;
      if(a.timbang)return 1;if(b.timbang)return -1;
      return a.stok-b.stok;
    });
  }

  const tbody=document.getElementById('tblStok');
  if(!produk.length){
    tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray);">Tidak ada produk ditemukan 🔍</td></tr>`;
    return;
  }

  tbody.innerHTML=produk.map((p,idx)=>{
    let sc='sok',lbl='ok';
    if(!p.timbang){if(p.stok<=0){sc='shabis';lbl='habis';}else if(p.stok<=(p.minStok||5)){sc='slow';lbl='low';}}
    const hari=(!p.timbang&&p.stok>0)?prediksiHabisDalam(p):null;
    const ekspBadge=p.exp?`<br><span class="exp-badge ${new Date(p.exp)<new Date()?'exp-lewat':(new Date(p.exp)-new Date())<7*86400000?'exp-dekat':'exp-aman'}">${p.exp}</span>`:'';
    const terjual=terlaris[p.id]||0;
    const lakuBadge=(_stokSort==='laku'&&terjual>0)?`<span style="font-size:9px;background:#fff3e0;color:#d97706;font-weight:700;padding:1px 5px;border-radius:4px;margin-left:4px;">🔥${terjual}x</span>`:'';
    const rankBadge=(_stokSort==='laku'&&idx<3&&terjual>0)?['🥇','🥈','🥉'][idx]:'';
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:6px">
        ${rankBadge?`<span style="font-size:16px;flex-shrink:0">${rankBadge}</span>`:''}
        ${p.fotoUrl?`<img src="${p.fotoUrl}" style="width:28px;height:28px;border-radius:6px;object-fit:cover">`:''}
        <div><b>${p.nama}</b>${p.fav?'⭐':''}${lakuBadge}${ekspBadge}${p.barcode?`<br><span style="font-size:9px;color:var(--gray);font-family:'Space Mono',monospace">${p.barcode}</span>`:''}${p.grosir?`<br><span style="font-size:9px;color:var(--o)">Grosir ${fRp(p.grosir)} min×${p.grosirMin}</span>`:''}</div>
      </div></td>
      <td><span class="pillk">${p.kat}</span></td>
      <td><span class="hmono">${fRp(p.harga)}</span><br><span style="font-size:10px;color:var(--gray)">Modal ${fRp(p.modal)}</span></td>
      <td>${p.timbang?'<span class="timbang-badge">⚖</span>':`<span class="snok ${sc}">${p.stok}</span>${hari!==null&&hari<=7?`<br><span style="font-size:9px;color:var(--r)">~${hari}h</span>`:''}`}</td>
      <td style="white-space:nowrap">
        <button class="ab2 be" onclick="bukaModalTambah(DB.produk.find(x=>x.id===${p.id}))">✏</button>
        <button class="ab2 ${p.fav?'':'be'}" onclick="toggleFav(${p.id})" style="font-size:14px">⭐</button>
        <button class="ab2" onclick="bukaStokEdit(${p.id})">+Stok</button>
        <button class="ab2 bh" onclick="hapusProduk(${p.id})">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

// ===== CEK DUPLIKAT BARCODE REALTIME =====
function cekDuplikatBarcode(){
  const val=document.getElementById('fBarcode').value.trim();
  const editId=parseInt(document.getElementById('fId').value)||null;
  const warn=document.getElementById('barcodeWarn');
  if(!val){warn.style.display='none';return;}
  // Cari produk lain (bukan yang sedang diedit) dengan barcode sama
  const dup=DB.produk.find(p=>p.barcode===val&&p.id!==editId);
  if(dup){
    warn.style.display='block';
    warn.innerHTML=`⚠️ Barcode ini sudah dipakai oleh <b>${dup.nama}</b>!<br><span style="font-weight:400">Kosongkan barcode untuk tetap menyimpan produk ini.</span>`;
  } else {
    warn.style.display='none';
  }
}

