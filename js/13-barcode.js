// ============= BARCODE GENERATOR — v6 baru =============
// Menggunakan JsBarcode (dimuat lazy dari CDN saat pertama kali dipakai)
// Generate label harga + barcode untuk dicetak di kertas stiker atau HVS

function bukaBarcodeGenerator(){
  _loadJsBarcode(()=>{
    // Isi dropdown produk
    const sel=document.getElementById('bcProdukSel');
    sel.innerHTML='<option value="">-- Pilih Produk --</option>'+
      DB.produk.map(p=>`<option value="${p.id}">${p.nama}</option>`).join('');
    document.getElementById('bcKode').value='';
    document.getElementById('bcNama').value='';
    document.getElementById('bcHarga').value='';
    document.getElementById('bcJumlah').value='1';
    document.getElementById('bcPreviewWrap').style.display='none';
    document.getElementById('bcErr').style.display='none';
    bukaM('mBarcode');
  });
}

function previewBarcode(){
  const produkId=document.getElementById('bcProdukSel').value;
  const p=produkId?DB.produk.find(x=>x.id===parseInt(produkId)):null;

  // Auto-isi dari produk yang dipilih
  if(p){
    if(!document.getElementById('bcKode').value)
      document.getElementById('bcKode').value=p.barcode||String(p.id);
    if(!document.getElementById('bcNama').value)
      document.getElementById('bcNama').value=p.nama;
    if(!document.getElementById('bcHarga').value)
      document.getElementById('bcHarga').value=p.harga||'';
  }

  const kode=document.getElementById('bcKode').value.trim();
  const nama=document.getElementById('bcNama').value.trim();
  const harga=parseInt(document.getElementById('bcHarga').value)||0;

  if(!kode){
    document.getElementById('bcPreviewWrap').style.display='none';
    return;
  }

  try{
    const svg=document.getElementById('bcPreviewSvg');
    JsBarcode(svg, kode, {
      format:'CODE128',
      width:1.5,
      height:40,
      displayValue:true,
      fontSize:10,
      margin:4,
    });
    document.getElementById('bcPreviewNama').textContent=nama||'';
    document.getElementById('bcPreviewHarga').textContent=harga?fRp(harga):'';
    document.getElementById('bcPreviewWrap').style.display='block';
    document.getElementById('bcErr').style.display='none';
  }catch(e){
    document.getElementById('bcPreviewWrap').style.display='none';
    document.getElementById('bcErr').style.display='block';
  }
}

function cetakLabelBarcode(){
  const kode=document.getElementById('bcKode').value.trim();
  const nama=document.getElementById('bcNama').value.trim()||kode;
  const harga=parseInt(document.getElementById('bcHarga').value)||0;
  const jumlah=Math.min(50,Math.max(1,parseInt(document.getElementById('bcJumlah').value)||1));

  if(!kode){showNotif('Isi kode barcode dulu',1);return;}
  if(!window.JsBarcode){showNotif('Library barcode belum siap, coba lagi',1);return;}

  // Buat print area dengan label-label
  const printEl=document.getElementById('bcPrintArea');
  printEl.innerHTML='';

  for(let i=0;i<jumlah;i++){
    const label=document.createElement('div');
    label.style.cssText='display:inline-block;border:1px dashed #999;padding:4px 6px;margin:3px;text-align:center;width:58mm;vertical-align:top;page-break-inside:avoid;';
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    label.appendChild(svg);
    const namaEl=document.createElement('div');
    namaEl.style.cssText='font-family:Arial,sans-serif;font-size:10px;font-weight:700;margin-top:2px;word-break:break-word;';
    namaEl.textContent=nama;
    label.appendChild(namaEl);
    if(harga){
      const hargaEl=document.createElement('div');
      hargaEl.style.cssText='font-family:Arial,sans-serif;font-size:12px;font-weight:900;color:#1b4332;';
      hargaEl.textContent=fRp(harga);
      label.appendChild(hargaEl);
    }
    printEl.appendChild(label);
    try{
      JsBarcode(svg,kode,{format:'CODE128',width:1.5,height:35,displayValue:true,fontSize:9,margin:2});
    }catch(e){
      label.innerHTML='<div style="color:red;font-size:10px">⚠ Kode tidak valid</div>';
    }
  }

  // Styling khusus print untuk label
  const style=document.createElement('style');
  style.id='bcPrintStyle';
  style.textContent=`@media print{body *{display:none!important;}#bcPrintArea,#bcPrintArea *{display:inline-block!important;}@page{margin:5mm;size:A4;}#bcPrintArea{display:block!important;}}`;
  document.head.appendChild(style);

  tutupM('mBarcode');
  showNotif('🖨 Membuka dialog cetak...');
  setTimeout(()=>{
    window.print();
    // Hapus style print setelah selesai
    setTimeout(()=>document.getElementById('bcPrintStyle')?.remove(),1000);
  },200);

  catatLog('Cetak Label Barcode', nama+' · '+jumlah+' label · kode: '+kode);
}
