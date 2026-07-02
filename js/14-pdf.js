// ============= EXPORT LAPORAN KE PDF — v6 baru =============
// Menggunakan jsPDF (dimuat lazy dari CDN)

function _loadJsPDF(cb){
  if(window.jspdf&&window.jspdf.jsPDF){cb&&cb();return;}
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload=()=>{cb&&cb();};
  s.onerror=()=>showNotif('Gagal load library PDF. Cek koneksi internet.',1);
  document.head.appendChild(s);
}

function eksporLaporanPDF(){
  _loadJsPDF(()=>{
    try{
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
      const s=DB.settings||{};
      const namaWarung=s.namaWarung||'Warung Pro';
      const now=new Date();
      const tglCetak=now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});

      // Header
      doc.setFontSize(18);doc.setFont('helvetica','bold');
      doc.text(namaWarung,105,18,{align:'center'});
      doc.setFontSize(10);doc.setFont('helvetica','normal');
      doc.text('Laporan Penjualan — Dicetak: '+tglCetak,105,25,{align:'center'});
      doc.setDrawColor(27,67,50);doc.setLineWidth(0.5);doc.line(14,28,196,28);

      let y=36;

      // Ringkasan hari ini
      const trxHariIni=DB.transaksi.filter(t=>!t.void&&new Date(t.waktu).toDateString()===now.toDateString());
      const omzetHariIni=trxHariIni.reduce((s,t)=>s+t.total,0);
      const labaHariIni=trxHariIni.reduce((s,t)=>s+t.items.reduce((ss,i)=>{
        const p=DB.produk.find(x=>x.id===i.id);const h=i.hargaCustom!=null?i.hargaCustom:i.harga;
        return ss+(h-(p?.modal||0))*(i.qty||1);
      },0),0);

      doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Ringkasan Hari Ini',14,y);y+=7;
      doc.setFontSize(10);doc.setFont('helvetica','normal');
      const summaryData=[
        ['Jumlah Transaksi',trxHariIni.length+'x'],
        ['Total Omzet',_fRpPDF(omzetHariIni)],
        ['Estimasi Laba',_fRpPDF(labaHariIni)],
        ['Rata-rata/Transaksi',_fRpPDF(trxHariIni.length?omzetHariIni/trxHariIni.length:0)],
      ];
      summaryData.forEach(([label,val])=>{
        doc.text(label,14,y);doc.text(val,196,y,{align:'right'});y+=6;
      });

      y+=4;doc.setDrawColor(200,200,200);doc.line(14,y,196,y);y+=6;

      // Top 10 produk terlaris
      doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Top 10 Produk Terlaris (Semua Waktu)',14,y);y+=7;
      const allTrx=_getTrxAll();
      const cm={};allTrx.forEach(t=>t.items.forEach(i=>{cm[i.nama]=(cm[i.nama]||0)+i.qty;}));
      const top10=Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,10);
      doc.setFontSize(9);doc.setFont('helvetica','bold');
      doc.text('Produk',14,y);doc.text('Qty',130,y);doc.text('Omzet',196,y,{align:'right'});y+=5;
      doc.setFont('helvetica','normal');
      top10.forEach(([nm,qty],i)=>{
        const omz=allTrx.reduce((s,t)=>s+t.items.filter(it=>it.nama===nm).reduce((ss,it)=>{const h=it.hargaCustom!=null?it.hargaCustom:it.harga;return ss+h*it.qty;},0),0);
        doc.text((i+1)+'. '+nm.substring(0,40),14,y);doc.text(qty+'x',130,y);doc.text(_fRpPDF(omz),196,y,{align:'right'});
        y+=5;if(y>270){doc.addPage();y=20;}
      });

      y+=4;doc.line(14,y,196,y);y+=6;

      // Daftar transaksi hari ini
      if(trxHariIni.length){
        doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Transaksi Hari Ini',14,y);y+=7;
        doc.setFontSize(8);doc.setFont('helvetica','bold');
        doc.text('Waktu',14,y);doc.text('Kasir',55,y);doc.text('Items',90,y);doc.text('Metode',145,y);doc.text('Total',196,y,{align:'right'});y+=5;
        doc.setFont('helvetica','normal');
        trxHariIni.forEach(t=>{
          const waktu=new Date(t.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
          const items=t.items.length+'x item';
          const metode={tunai:'Tunai',transfer:'Transfer',qris:'QRIS',kredit:'Kredit'}[t.metode]||t.metode;
          doc.text(waktu,14,y);doc.text((t.kasir||'-').substring(0,16),55,y);doc.text(items,90,y);doc.text(metode,145,y);doc.text(_fRpPDF(t.total),196,y,{align:'right'});
          y+=5;if(y>275){doc.addPage();y=20;}
        });
      }

      // Footer
      const pageCount=doc.getNumberOfPages();
      for(let p=1;p<=pageCount;p++){
        doc.setPage(p);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(150,150,150);
        doc.text('Kasir Warung Pro — '+namaWarung+' | Hal '+p+'/'+pageCount,105,290,{align:'center'});
        doc.setTextColor(0,0,0);
      }

      doc.save('laporan_'+namaWarung.replace(/\s/g,'_')+'_'+now.toISOString().slice(0,10)+'.pdf');
      showNotif('✅ Laporan PDF diunduh!');
      catatLog('Export PDF','Laporan harian '+now.toLocaleDateString('id-ID'));
    }catch(e){
      console.error('PDF error:',e);
      showNotif('Gagal buat PDF: '+e.message,1);
    }
  });
}

function _fRpPDF(n){
  n=Math.round(n||0);
  if(n>=1e9)return 'Rp '+(n/1e9).toFixed(1)+'M';
  if(n>=1e6)return 'Rp '+(n/1e6).toFixed(1)+'jt';
  return 'Rp '+n.toLocaleString('id-ID');
}

// ============= KALKULATOR DISKON — v6 baru =============
function bukaKalkDiskon(){
  document.getElementById('kdHargaNormal').value='';
  document.getElementById('kdDiskonPct').value='';
  document.getElementById('kdHargaPromo').value='';
  document.getElementById('kdHasil').style.display='none';
  // Isi dropdown produk di keranjang
  const sel=document.getElementById('kdProdukKeranjang');
  sel.innerHTML='<option value="">-- Tidak perlu, hanya hitung saja --</option>'+
    keranjang.map((it,i)=>`<option value="${i}">${it.nama} (${fRp(it.hargaCustom!=null?it.hargaCustom:it.harga)})</option>`).join('');
  bukaM('mKalkDiskon');
}
function _updateHasilKalk(normal,promo){
  if(!normal||!promo||promo>normal){document.getElementById('kdHasil').style.display='none';return;}
  const disc=normal-promo;
  const pct=Math.round(disc/normal*100);
  document.getElementById('kdHasilNormal').textContent=fRp(normal);
  document.getElementById('kdHasilDiskon').textContent='-'+fRp(disc)+' ('+pct+'%)';
  document.getElementById('kdHasilPromo').textContent=fRp(promo);
  document.getElementById('kdHasil').style.display='block';
}
function hitungKalkDiskon(){
  const normal=parseInt(document.getElementById('kdHargaNormal').value)||0;
  const pct=parseFloat(document.getElementById('kdDiskonPct').value)||0;
  if(!normal)return;
  if(pct>0){
    const promo=Math.round(normal*(1-pct/100));
    document.getElementById('kdHargaPromo').value=promo;
    _updateHasilKalk(normal,promo);
  }
}
function hitungKalkDiskonDariPct(){
  const normal=parseInt(document.getElementById('kdHargaNormal').value)||0;
  const pct=parseFloat(document.getElementById('kdDiskonPct').value)||0;
  if(!normal||!pct)return;
  const promo=Math.round(normal*(1-pct/100));
  document.getElementById('kdHargaPromo').value=promo;
  _updateHasilKalk(normal,promo);
}
function hitungKalkDiskonDariHarga(){
  const normal=parseInt(document.getElementById('kdHargaNormal').value)||0;
  const promo=parseInt(document.getElementById('kdHargaPromo').value)||0;
  if(!normal||!promo)return;
  const pct=Math.round((1-promo/normal)*100);
  document.getElementById('kdDiskonPct').value=pct;
  _updateHasilKalk(normal,promo);
}
function terapkanKalkDiskon(){
  const promo=parseInt(document.getElementById('kdHargaPromo').value)||0;
  const idx=document.getElementById('kdProdukKeranjang').value;
  if(!promo){showNotif('Hitung dulu harga promo-nya',1);return;}
  if(idx===''){
    // Tidak ada produk spesifik — terapkan sebagai diskon nominal ke total
    const normal=parseInt(document.getElementById('kdHargaNormal').value)||0;
    if(!normal){tutupM('mKalkDiskon');return;}
    const disc=normal-promo;
    setDiskonType('rp');
    document.getElementById('diskonVal').value=disc;
    hitungDiskon();
    tutupM('mKalkDiskon');
    showNotif('✅ Diskon Rp '+disc.toLocaleString('id-ID')+' diterapkan');
    return;
  }
  const i=parseInt(idx);
  if(keranjang[i]){
    keranjang[i].hargaCustom=promo;
    renderKeranjang();hitungKem();
    tutupM('mKalkDiskon');
    showNotif('✅ Harga '+keranjang[i].nama+' → '+fRp(promo));
  }
}
