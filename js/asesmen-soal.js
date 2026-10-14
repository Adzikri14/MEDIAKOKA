/* ==========================================================================
   KOKA — asesmen-soal.js
   Menampilkan SATU soal per halaman, mendukung 4 jenis soal:
   - pg          : Pilihan Ganda biasa (radio, 1 jawaban benar)
   - pgk         : Pilihan Ganda Kompleks (checkbox, pilih 2 jawaban benar,
                   dinilai benar HANYA jika pilihan persis sama dengan kunci)
   - benarsalah  : 3 pernyataan, siswa memilih Benar/Salah tiap pernyataan
                   (nilai proporsional: bobot/3 per pernyataan benar)
   - menjodohkan : 3 pasangan, siswa memilih jawaban kanan yang cocok untuk
                   tiap butir kiri (nilai proporsional: bobot/3 per pasangan
                   benar)
   Jawaban tersimpan di memori (bukan DOM) sehingga siswa bisa maju-mundur
   tanpa kehilangan jawaban.
   Guru cukup mengedit file data/soal-sumatif-kelas5.json /
   data/soal-sumatif-kelas6.json untuk mengubah soal maupun bobot nilai.
   ========================================================================== */

const sesiSoalSumatif = KOKA.wajibLogin();
const sumatifAktif = JSON.parse(sessionStorage.getItem('koka_sumatif_aktif') || 'null');

if (!sumatifAktif) {
  window.location.href = 'asesmen.html';
}

let bankSoalAktif = [];
let jawabanTerpilih = [];   // struktur jawaban berbeda tergantung jenis soal
let indexSoalAktif = 0;
let waktuTersisaDetik = 0;
let timerInterval = null;

/* Normalisasi skema soal: data boleh memakai nama kunci "jawaban"/"kunci" (pg),
   "jawabanBenar"/"kunci" (pgk), dan true/false atau "benar"/"salah" (benar-salah).
   Semua diseragamkan agar penilaian selalu benar, apa pun cara menulis JSON-nya. */
function keBoolBenarSalah(v) {
  if (typeof v === 'boolean') return v;
  const t = String(v).trim().toLowerCase();
  return t === 'benar' || t === 'b' || t === 'true';
}
function normalisasiSoal(soal) {
  if (soal.jenis === 'pg') {
    const k = soal.jawaban !== undefined ? soal.jawaban : soal.kunci;
    soal.jawaban = parseInt(k, 10);
  } else if (soal.jenis === 'pgk') {
    const k = soal.jawabanBenar !== undefined ? soal.jawabanBenar : soal.kunci;
    soal.jawabanBenar = (Array.isArray(k) ? k : []).map(x => parseInt(x, 10));
  } else if (soal.jenis === 'benarsalah') {
    soal.pernyataan.forEach(p => {
      p.jawaban = keBoolBenarSalah(p.jawaban !== undefined ? p.jawaban : p.kunci);
    });
  }
  return soal;
}

async function muatSoalSumatif() {
  document.getElementById('hud-nama-siswa').textContent = sumatifAktif.nama;
  document.getElementById('hud-detail-siswa').textContent = `Kelas ${sumatifAktif.kelas} • No. ${sumatifAktif.presensi} • ${sumatifAktif.babJudul} • Paket ${sumatifAktif.paket}`;

  const bank = await KOKA.ambilJSON(`soal-sumatif-kelas${sumatifAktif.kelas}.json`);
  const babData = bank.bab.find(b => b.babId === sumatifAktif.babId);
  const paketSoal = babData && babData.paket ? babData.paket[sumatifAktif.paket] : null;
  if (!paketSoal || paketSoal.length === 0) {
    alert('Soal untuk bab/paket ini belum tersedia. Hubungi gurumu.');
    sessionStorage.removeItem('koka_sumatif_aktif');
    window.location.href = 'asesmen.html';
    return;
  }
  bankSoalAktif = paketSoal.map(normalisasiSoal);
  waktuTersisaDetik = bank.petunjukUmum.durasiMenit * 60;

  jawabanTerpilih = bankSoalAktif.map(soal => {
    if (soal.jenis === 'pg') return null;
    if (soal.jenis === 'pgk') return [];
    if (soal.jenis === 'benarsalah') return soal.pernyataan.map(() => null);
    if (soal.jenis === 'menjodohkan') return soal.pasangan.map(() => null);
    return null;
  });

  renderSoalAktif();
  mulaiTimer();
}

function renderSoalAktif() {
  const soal = bankSoalAktif[indexSoalAktif];
  const total = bankSoalAktif.length;

  document.getElementById('progres-teks').textContent = `Soal ${indexSoalAktif + 1}/${total}`;
  document.getElementById('progres-bar-isi').style.width = `${((indexSoalAktif + 1) / total) * 100}%`;
  renderPetaNomor();

  const wadah = document.getElementById('daftar-soal-sumatif');
  const labelJenis = {
    pg: 'Pilihan Ganda', pgk: 'Pilihan Ganda Kompleks',
    benarsalah: 'Benar / Salah', menjodohkan: 'Menjodohkan'
  }[soal.jenis];

  wadah.innerHTML = `
    <div class="kartu-soal-sumatif">
      <div class="no-soal-sumatif">SOAL ${indexSoalAktif + 1} DARI ${total} • ${labelJenis}</div>
      <p class="teks-soal-sumatif">${soal.teks}</p>
      ${soal.gambar ? `<div class="gambar-soal-sumatif"><img src="../assets/${soal.gambar}" alt="Gambar soal"></div>` : ''}
      <div id="isi-jenis-soal"></div>
    </div>
  `;

  const isiWadah = document.getElementById('isi-jenis-soal');
  if (soal.jenis === 'pg') renderPG(isiWadah, soal);
  else if (soal.jenis === 'pgk') renderPGK(isiWadah, soal);
  else if (soal.jenis === 'benarsalah') renderBenarSalah(isiWadah, soal);
  else if (soal.jenis === 'menjodohkan') renderMenjodohkan(isiWadah, soal);

  document.getElementById('btn-sebelumnya').disabled = indexSoalAktif === 0;
  document.getElementById('btn-selanjutnya').textContent =
    indexSoalAktif === total - 1 ? 'Kumpulkan Jawaban ✔' : 'Selanjutnya ▶';
}

/* ---- Render per jenis soal ---- */

function renderPetaNomor() {
  const wadah = document.getElementById('peta-nomor-soal');
  wadah.innerHTML = bankSoalAktif.map((soal, i) => {
    const terjawab = soalSudahDijawab(soal, jawabanTerpilih[i]);
    let kelas = 'nomor-peta';
    if (i === indexSoalAktif) kelas += ' aktif';
    else if (terjawab) kelas += ' terjawab';
    else kelas += ' kosong';
    return `<button type="button" class="${kelas}" data-index="${i}">${i + 1}</button>`;
  }).join('');

  wadah.querySelectorAll('.nomor-peta').forEach(btn => {
    btn.addEventListener('click', () => {
      indexSoalAktif = parseInt(btn.dataset.index, 10);
      renderSoalAktif();
    });
  });
}

function renderPG(wadah, soal) {
  wadah.innerHTML = `
    <div class="opsi-sumatif">
      ${soal.pilihan.map((p, j) => `
        <label>
          <input type="radio" name="pg-${soal.id}" value="${j}" ${jawabanTerpilih[indexSoalAktif] === j ? 'checked' : ''}>
          <span>${String.fromCharCode(97 + j)}. ${p}</span>
        </label>
      `).join('')}
    </div>
  `;
  wadah.querySelectorAll(`input[name="pg-${soal.id}"]`).forEach(input => {
    input.addEventListener('change', () => { jawabanTerpilih[indexSoalAktif] = parseInt(input.value, 10); });
  });
}

function renderPGK(wadah, soal) {
  const dipilih = jawabanTerpilih[indexSoalAktif];
  wadah.innerHTML = `
    <p class="catatan-jenis-soal">☑️ Pilih tepat 2 jawaban yang benar.</p>
    <div class="opsi-sumatif">
      ${soal.pilihan.map((p, j) => `
        <label>
          <input type="checkbox" name="pgk-${soal.id}" value="${j}" ${dipilih.includes(j) ? 'checked' : ''}>
          <span>${String.fromCharCode(97 + j)}. ${p}</span>
        </label>
      `).join('')}
    </div>
  `;
  wadah.querySelectorAll(`input[name="pgk-${soal.id}"]`).forEach(input => {
    input.addEventListener('change', () => {
      const semuaCentang = Array.from(wadah.querySelectorAll(`input[name="pgk-${soal.id}"]:checked`));
      if (semuaCentang.length > 2) {
        input.checked = false;
        alert('Maksimal pilih 2 jawaban saja.');
        return;
      }
      jawabanTerpilih[indexSoalAktif] = semuaCentang.map(i => parseInt(i.value, 10));
    });
  });
}

function renderBenarSalah(wadah, soal) {
  wadah.innerHTML = `
    <div class="daftar-benarsalah">
      ${soal.pernyataan.map((p, i) => `
        <div class="baris-benarsalah">
          <span class="teks-pernyataan">${i + 1}. ${p.teks}</span>
          <div class="pilihan-bs">
            <label class="opsi-bs"><input type="radio" name="bs-${soal.id}-${i}" value="benar" ${jawabanTerpilih[indexSoalAktif][i] === true ? 'checked' : ''}> Benar</label>
            <label class="opsi-bs"><input type="radio" name="bs-${soal.id}-${i}" value="salah" ${jawabanTerpilih[indexSoalAktif][i] === false ? 'checked' : ''}> Salah</label>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  soal.pernyataan.forEach((p, i) => {
    wadah.querySelectorAll(`input[name="bs-${soal.id}-${i}"]`).forEach(input => {
      input.addEventListener('change', () => {
        jawabanTerpilih[indexSoalAktif][i] = input.value === 'benar';
      });
    });
  });
}

function renderMenjodohkan(wadah, soal) {
  const opsiKanan = soal.pasangan.map(p => p.kanan);
  wadah.innerHTML = `
    <div class="daftar-menjodohkan">
      ${soal.pasangan.map((p, i) => `
        <div class="baris-menjodohkan">
          <span class="kiri-jodoh">${p.kiri}</span>
          <span class="panah-jodoh">→</span>
          <select class="input-teks select-jodoh" data-index="${i}">
            <option value="" disabled ${jawabanTerpilih[indexSoalAktif][i] === null ? 'selected' : ''}>-- pilih jawaban --</option>
            ${opsiKanan.map(opsi => `<option value="${opsi}" ${jawabanTerpilih[indexSoalAktif][i] === opsi ? 'selected' : ''}>${opsi}</option>`).join('')}
          </select>
        </div>
      `).join('')}
    </div>
  `;
  wadah.querySelectorAll('.select-jodoh').forEach(sel => {
    sel.addEventListener('change', () => {
      jawabanTerpilih[indexSoalAktif][parseInt(sel.dataset.index, 10)] = sel.value;
    });
  });
}

/* ---- Navigasi ---- */

document.getElementById('btn-sebelumnya').addEventListener('click', () => {
  if (indexSoalAktif > 0) { indexSoalAktif -= 1; renderSoalAktif(); }
});

document.getElementById('btn-selanjutnya').addEventListener('click', () => {
  if (indexSoalAktif < bankSoalAktif.length - 1) { indexSoalAktif += 1; renderSoalAktif(); }
  else kumpulkanJawaban(false);
});

/* ---- Timer ---- */

function mulaiTimer() {
  perbaruiTampilanTimer();
  timerInterval = setInterval(() => {
    waktuTersisaDetik -= 1;
    perbaruiTampilanTimer();
    if (waktuTersisaDetik <= 0) {
      clearInterval(timerInterval);
      kumpulkanJawaban(true);
    }
  }, 1000);
}
function perbaruiTampilanTimer() {
  const menit = Math.max(Math.floor(waktuTersisaDetik / 60), 0);
  const detik = Math.max(waktuTersisaDetik % 60, 0);
  document.getElementById('timer-sumatif').textContent =
    `${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;
}

/* ---- Penilaian ---- */

function soalSudahDijawab(soal, jawaban) {
  if (soal.jenis === 'pg') return jawaban !== null;
  if (soal.jenis === 'pgk') return jawaban.length === 2;
  if (soal.jenis === 'benarsalah') return jawaban.every(j => j !== null);
  if (soal.jenis === 'menjodohkan') return jawaban.every(j => j !== null && j !== '');
  return false;
}

function nilaiSoal(soal, jawaban) {
  if (soal.jenis === 'pg') {
    return jawaban === soal.jawaban ? soal.bobot : 0;
  }
  if (soal.jenis === 'pgk') {
    const sama = jawaban.length === soal.jawabanBenar.length &&
      jawaban.slice().sort((a, b) => a - b).join(',') === soal.jawabanBenar.slice().sort((a, b) => a - b).join(',');
    return sama ? soal.bobot : 0;
  }
  if (soal.jenis === 'benarsalah') {
    const jumlahBenar = soal.pernyataan.filter((p, i) => jawaban[i] === p.jawaban).length;
    return (jumlahBenar / soal.pernyataan.length) * soal.bobot;
  }
  if (soal.jenis === 'menjodohkan') {
    const jumlahBenar = soal.pasangan.filter((p, i) => jawaban[i] === p.kanan).length;
    return (jumlahBenar / soal.pasangan.length) * soal.bobot;
  }
  return 0;
}

function hitungNilai() {
  let totalBobot = 0;
  let bobotDidapat = 0;

  bankSoalAktif.forEach((soal, i) => {
    totalBobot += soal.bobot;
    bobotDidapat += nilaiSoal(soal, jawabanTerpilih[i]);
  });

  const nilaiAkhir = totalBobot > 0 ? Math.round((bobotDidapat / totalBobot) * 100) : 0;
  return { nilaiAkhir, totalBobot, bobotDidapat };
}

async function kumpulkanJawaban(otomatis) {
  if (timerInterval) clearInterval(timerInterval);

  if (!otomatis) {
    const indexBelum = bankSoalAktif.findIndex((soal, i) => !soalSudahDijawab(soal, jawabanTerpilih[i]));
    if (indexBelum !== -1) {
      if (!confirm('Masih ada soal yang belum lengkap dijawab. Yakin ingin mengumpulkan?')) {
        indexSoalAktif = indexBelum;
        renderSoalAktif();
        mulaiTimer();
        return;
      }
    }
  }

  const hasil = hitungNilai();
  const payload = {
    jenis: 'sumatif',
    nama: sumatifAktif.nama,
    kelas: sumatifAktif.kelas,
    presensi: sumatifAktif.presensi,
    token: sumatifAktif.token,
    babId: sumatifAktif.babId,
    babJudul: sumatifAktif.babJudul,
    paket: sumatifAktif.paket,
    nilai: hasil.nilaiAkhir,
    poinDidapat: Math.round(hasil.bobotDidapat * 10) / 10,
    totalPoin: hasil.totalBobot,
    jumlahSoal: bankSoalAktif.length,
    waktuSelesai: new Date().toISOString()
  };

  sessionStorage.setItem('koka_sumatif_hasil', JSON.stringify(payload));

  // Kirim ke Google Sheets melalui Google Apps Script.
  // Guru cukup mengganti URL di js/config.js setelah deploy apps-script/Code.gs
  try {
    await fetch(KOKA_CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Gagal mengirim ke Google Sheets, hasil tetap ditampilkan ke siswa.', err);
  }

  sessionStorage.removeItem('koka_sumatif_aktif');
  window.location.href = 'asesmen-selesai.html';
}

muatSoalSumatif();
