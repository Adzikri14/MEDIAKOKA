/* ==========================================================================
   KOKA — asesmen-sumatif.js
   Setiap BAB punya kode unik (token) sendiri untuk Paket A & Paket B
   (data/token-sumatif.json). Siswa memasukkan satu token; sistem mencari
   token tersebut di SEMUA bab pada kelasnya untuk menentukan bab & paket
   soal yang harus dikerjakan (data/soal-sumatif-kelasX.json).
   ========================================================================== */

const sesiAsesmen = KOKA.wajibLogin();
let petunjukUmum = null;

async function muatInfo() {
  document.getElementById('info-nama').textContent = sesiAsesmen.nama;
  document.getElementById('input-kelas').value = sesiAsesmen.kelas;

  const bank = await KOKA.ambilJSON(`soal-sumatif-kelas${sesiAsesmen.kelas}.json`);
  petunjukUmum = bank.petunjukUmum;

  document.getElementById('info-jumlah').textContent = `${petunjukUmum.jumlahSoal} soal / bab`;
  document.getElementById('info-durasi').textContent = `${petunjukUmum.durasiMenit} menit`;
  document.getElementById('info-jenis').innerHTML = petunjukUmum.jenisSoal.map(j => `<span class="tag-jenis">${j}</span>`).join('');
  document.getElementById('info-catatan').textContent = petunjukUmum.catatan + ' Kode unik yang kamu masukkan menentukan Bab dan Paket soal yang akan kamu kerjakan.';
}

document.getElementById('form-sumatif').addEventListener('submit', async function (e) {
  e.preventDefault();
  const presensi = document.getElementById('input-presensi').value.trim();
  const token = document.getElementById('input-token').value.trim().toUpperCase();
  const errBox = document.getElementById('pesan-error');
  errBox.style.display = 'none';

  const daftarToken = await KOKA.ambilJSON('token-sumatif.json');
  const tokenKelas = daftarToken[sesiAsesmen.kelas] || {};

  let babCocok = null;
  let paketCocok = null;

  for (const babId of Object.keys(tokenKelas)) {
    const entriBab = tokenKelas[babId];
    if (entriBab.A === token) { babCocok = babId; paketCocok = 'A'; break; }
    if (entriBab.B === token) { babCocok = babId; paketCocok = 'B'; break; }
  }

  if (!babCocok) {
    errBox.style.display = 'block';
    return;
  }

  // Pastikan soal untuk bab & paket ini sudah tersedia di bank soal
  const bank = await KOKA.ambilJSON(`soal-sumatif-kelas${sesiAsesmen.kelas}.json`);
  const babData = bank.bab.find(b => b.babId === babCocok);
  const paketSoal = babData && babData.paket ? babData.paket[paketCocok] : null;
  if (!paketSoal || paketSoal.length === 0) {
    errBox.textContent = `Soal Paket ${paketCocok} untuk bab ini belum tersedia. Hubungi gurumu.`;
    errBox.style.display = 'block';
    return;
  }
  errBox.textContent = 'Kode unik tidak ditemukan. Periksa kembali penulisannya.';

  const dataSumatif = {
    nama: sesiAsesmen.nama,
    kelas: sesiAsesmen.kelas,
    presensi,
    token,
    babId: babCocok,
    babJudul: tokenKelas[babCocok].babJudul,
    paket: paketCocok,
    mulai: new Date().toISOString()
  };
  sessionStorage.setItem('koka_sumatif_aktif', JSON.stringify(dataSumatif));
  window.location.href = 'asesmen-soal.html';
});

muatInfo();
