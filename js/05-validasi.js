// ============= VALIDASI INPUT — v6 FIX =============
// Fungsi validasi terpusat — tidak lagi tersebar di masing-masing simpan*()
const Validator = {
  // Nama: wajib ada, min 2 karakter, max 100
  nama(val, label='Nama'){
    if(!val||!val.trim()) return label+' wajib diisi';
    if(val.trim().length < 2) return label+' minimal 2 karakter';
    if(val.trim().length > 100) return label+' maksimal 100 karakter';
    return null;
  },
  // Nominal: angka positif
  nominal(val, label='Nominal', required=true){
    if(!val&&!required) return null;
    const n=parseInt(val)||0;
    if(required&&n<=0) return label+' harus lebih dari 0';
    if(n<0) return label+' tidak boleh negatif';
    if(n>1e10) return label+' terlalu besar';
    return null;
  },
  // PIN: 4-6 digit angka
  pin(val){
    if(!val||!val.trim()) return 'PIN wajib diisi';
    if(!/^\d{4,6}$/.test(val.trim())) return 'PIN harus 4-6 digit angka';
    return null;
  },
  // Nomor WA: format Indonesia
  wa(val){
    if(!val||!val.trim()) return null; // opsional
    const cleaned=val.trim().replace(/[\s\-]/g,'');
    if(!/^(08|628)\d{8,12}$/.test(cleaned)) return 'No WA tidak valid (mulai dengan 08 atau 628)';
    return null;
  },
  // Harga: angka >= 0
  harga(val, label='Harga'){
    const n=parseInt(val)||0;
    if(n<0) return label+' tidak boleh negatif';
    if(n>1e10) return label+' terlalu besar (maks Rp 10 miliar)';
    return null;
  },
  // Stok: bilangan bulat >= 0
  stok(val){
    if(val===''||val===null||val===undefined) return null;
    const n=parseInt(val);
    if(isNaN(n)) return 'Stok harus angka';
    if(n<0) return 'Stok tidak boleh negatif';
    if(n>99999) return 'Stok terlalu besar';
    return null;
  },
  // Tampilkan error di bawah field (non-blocking) dan kembalikan true jika valid
  show(fieldId, errMsg){
    const el=document.getElementById(fieldId);
    if(!el) return !errMsg;
    let errEl=el.parentNode.querySelector('.field-err');
    if(!errEl){
      errEl=document.createElement('div');
      errEl.className='field-err';
      errEl.style.cssText='color:#dc2626;font-size:10px;margin-top:3px;font-weight:600;';
      el.parentNode.insertBefore(errEl,el.nextSibling);
    }
    if(errMsg){
      el.style.borderColor='#dc2626';
      errEl.textContent='⚠ '+errMsg;
      el.focus();
      return false;
    } else {
      el.style.borderColor='';
      errEl.textContent='';
      return true;
    }
  },
  clearAll(formId){
    const form=formId?document.getElementById(formId):document;
    if(!form) return;
    form.querySelectorAll('.field-err').forEach(e=>e.textContent='');
    form.querySelectorAll('input,select,textarea').forEach(e=>e.style.borderColor='');
  }
};

// ===== OVERRIDE simpanProduk dengan validasi kuat =====
const _simpanProdukOrig=simpanProduk;
simpanProduk=function(){
  Validator.clearAll('mTambah');
  const nm=document.getElementById('fNama').value.trim();
  const harga=document.getElementById('fHarga').value;
  const modal=document.getElementById('fModal').value;
  const stok=document.getElementById('fStok').value;
  const barcode=document.getElementById('fBarcode').value.trim();
  const editId=parseInt(document.getElementById('fId').value)||null;

  let ok=true;
  const errNama=Validator.nama(nm,'Nama produk');
  if(errNama){Validator.show('fNama',errNama);ok=false;}

  const errHarga=Validator.harga(harga,'Harga jual');
  if(errHarga){Validator.show('fHarga',errHarga);ok=false;}

  const errModal=Validator.harga(modal,'Harga modal');
  if(errModal){Validator.show('fModal',errModal);ok=false;}

  const errStok=Validator.stok(stok);
  if(errStok){Validator.show('fStok',errStok);ok=false;}

  // Cek harga jual < modal (warning, bukan blokir)
  const hargaNum=parseInt(harga)||0;
  const modalNum=parseInt(modal)||0;
  if(hargaNum>0&&modalNum>0&&hargaNum<modalNum){
    if(!document.getElementById('fNama').dataset.rugiConfirmed){
      if(!confirm('⚠️ Harga jual ('+fRp(hargaNum)+') lebih rendah dari modal ('+fRp(modalNum)+').\nLanjutkan?')){return;}
      document.getElementById('fNama').dataset.rugiConfirmed='1';
    }
  }

  // Cek barcode duplikat
  if(barcode){
    const dup=DB.produk.find(p=>p.barcode===barcode&&p.id!==editId);
    if(dup){Validator.show('fBarcode','Barcode sudah dipakai: '+dup.nama);ok=false;}
  }

  if(!ok){showNotif('⚠ Ada data yang tidak valid, cek form',1);return;}
  document.getElementById('fNama').dataset.rugiConfirmed='';
  _simpanProdukOrig();
};

// ===== OVERRIDE simpanUser dengan validasi kuat =====
const _simpanUserOrig=simpanUser;
simpanUser=function(){
  Validator.clearAll('mUser');
  const nm=document.getElementById('uNama').value.trim();
  const pin=document.getElementById('uPin').value;
  let ok=true;
  const errNama=Validator.nama(nm,'Nama kasir');
  if(errNama){Validator.show('uNama',errNama);ok=false;}
  const errPin=Validator.pin(pin);
  if(errPin){Validator.show('uPin',errPin);ok=false;}
  // Cek PIN duplikat
  if(!errPin){
    const dup=DB.users.find(u=>u.pin===pin.trim());
    if(dup){Validator.show('uPin','PIN sudah dipakai oleh '+dup.nama);ok=false;}
  }
  if(!ok){showNotif('⚠ Cek form pengguna',1);return;}
  _simpanUserOrig();
};

// ===== OVERRIDE simpanHutang dengan validasi kuat =====
const _simpanHutangOrig=simpanHutang;
simpanHutang=function(){
  Validator.clearAll('mHutang');
  const nm=document.getElementById('hNama').value.trim();
  const nom=document.getElementById('hNominal').value;
  const wa=document.getElementById('hWa').value;
  let ok=true;
  const errNama=Validator.nama(nm,'Nama pelanggan');
  if(errNama){Validator.show('hNama',errNama);ok=false;}
  const errNom=Validator.nominal(nom,'Nominal');
  if(errNom){Validator.show('hNominal',errNom);ok=false;}
  const errWa=Validator.wa(wa);
  if(errWa){Validator.show('hWa',errWa);ok=false;}
  if(!ok){showNotif('⚠ Cek form hutang',1);return;}
  _simpanHutangOrig();
};

function bukaStokEdit(id){
  const p=DB.produk.find(x=>x.id===id);if(!p)return;
  document.getElementById('seId').value=id;
  document.getElementById('seNama').value=p.nama;
  document.getElementById('seStokSaatIni').value=p.stok;
  document.getElementById('seInput').value='';
  document.getElementById('seHasil').value=p.stok;
  bukaM('mStokEdit');
  setTimeout(()=>document.getElementById('seInput').focus(),150);
}
function _seUpdateHasil(){
  const id=parseInt(document.getElementById('seId').value);
  const p=DB.produk.find(x=>x.id===id);if(!p)return;
  const delta=parseInt(document.getElementById('seInput').value)||0;
  document.getElementById('seHasil').value=Math.max(0,p.stok+delta);
}
function seGeser(arah){
  const inp=document.getElementById('seInput');
  const cur=parseInt(inp.value)||0;
  inp.value=cur+arah;
  _seUpdateHasil();
}
function simpanStokEdit(){
  const id=parseInt(document.getElementById('seId').value);
  const p=DB.produk.find(x=>x.id===id);if(!p)return;
  const delta=parseInt(document.getElementById('seInput').value)||0;
  if(delta===0){showNotif('Isi jumlah perubahan dulu',1);return;}
  const stokAwal=p.stok;p.stok=Math.max(0,p.stok+delta);
  DB.riwayatStok.push({waktu:new Date().toISOString(),produkId:p.id,nama:p.nama,jenis:delta>=0?'masuk':'keluar',qty:Math.abs(delta),stokAwal,stokAkhir:p.stok,ref:'Manual'});
  catatLog('Ubah Stok Manual', p.nama+': '+stokAwal+' → '+p.stok+' ('+(delta>=0?'+':'')+delta+')');
  saveDB();tutupM('mStokEdit');renderStok();renderKasir();showNotif(`✅ Stok ${p.nama}: ${stokAwal} → ${p.stok}`);
}

