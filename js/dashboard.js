const sesi = KOKA.wajibLogin();

if (sesi) {
  document.getElementById('nama-siswa').textContent = sesi.nama;
  document.getElementById('kelas-siswa').textContent = sesi.kelas;
}

document.getElementById('btn-keluar').addEventListener('click', () => {
  if (confirm('Yakin ingin keluar dari KOKA?')) {
    KOKA.keluar();
  }
});

/* ==========================================================================
   KOKAI — kotak asisten AI di dashboard.
   Kotak ini TERKUNCI secara bawaan. Ia hanya terbuka jika Apps Script
   melaporkan KOKAI_AKTIF = "ya". Jika gagal terhubung, tetap terkunci.
   ========================================================================== */
(function cekKokai() {
  const kartu = document.getElementById('kartu-kokai');
  if (!kartu) return;

  kartu.addEventListener('click', (e) => {
    if (kartu.classList.contains('kartu-terkunci')) e.preventDefault();
  });

  function bukaKartu() {
    kartu.classList.remove('kartu-terkunci');
    kartu.classList.add('kartu-kokai-aktif');
    kartu.setAttribute('href', 'kokai.html');
    kartu.removeAttribute('aria-disabled');
    document.getElementById('kokai-sub').textContent = 'Tanya asisten AI-mu di sini';
  }

  // Simpan hasil pengecekan 5 menit supaya tidak menghubungi Google setiap kali dashboard dibuka
  const KUNCI = 'koka_kokai_status';
  try {
    const simpan = JSON.parse(sessionStorage.getItem(KUNCI) || 'null');
    if (simpan && Date.now() - simpan.waktu < 5 * 60 * 1000) {
      if (simpan.aktif) bukaKartu();
      return;
    }
  } catch (e) { /* abaikan */ }

  if (typeof KOKA_CONFIG === 'undefined' || !KOKA_CONFIG.APPS_SCRIPT_URL) return;

  const kontrol = new AbortController();
  const batas = setTimeout(() => kontrol.abort(), 10000);
  fetch(KOKA_CONFIG.APPS_SCRIPT_URL + '?aksi=kokai_status', { signal: kontrol.signal })
    .then((r) => r.json())
    .then((d) => {
      const aktif = d && d.aktif === true;
      try { sessionStorage.setItem(KUNCI, JSON.stringify({ aktif, waktu: Date.now() })); } catch (e) { /* abaikan */ }
      if (aktif) bukaKartu();
    })
    .catch(() => { /* gagal terhubung: kotak tetap terkunci */ })
    .finally(() => clearTimeout(batas));
})();
