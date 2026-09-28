/* ==========================================================================
   KOKA — kokai.js  (asisten AI "KOKAI")
   - Halaman ini hanya bisa dipakai jika Apps Script melaporkan
     KOKAI_AKTIF = "ya" (saklar ada di Apps Script, bukan di sini).
   - Kunci API OpenAI TIDAK ada di website; semua panggilan lewat Apps Script.
   - Batas jatah per siswa dihitung & ditegakkan di Apps Script.
   ========================================================================== */

const sesi = KOKA.wajibLogin();

const KUNCI_RIWAYAT = 'koka_kokai_riwayat';
const SARAN = ['Apa itu algoritma?', 'Apa itu AI?', 'Apa itu Scratch?'];

let maksTanya = 300;
let batasHarian = 3;
let sisa = null;
let sedangKirim = false;
let riwayat = [];          // [{ r: 'u' | 'a', t: 'teks' }]

const el = (id) => document.getElementById(id);
const panel = { memuat: el('kokai-memuat'), terkunci: el('kokai-terkunci'), gagal: el('kokai-gagal'), chat: el('kokai-chat') };
const daftar = el('kokai-daftar');
const input = el('kokai-input');
const tombolKirim = el('kokai-kirim');

function tampilkan(nama) {
  Object.keys(panel).forEach((k) => { panel[k].hidden = (k !== nama); });
}

/* ---------- Komunikasi dengan Apps Script ---------- */

async function ambilStatus() {
  const url = KOKA_CONFIG.APPS_SCRIPT_URL + '?aksi=kokai_status'
    + '&nama=' + encodeURIComponent(sesi.nama)
    + '&kelas=' + encodeURIComponent(sesi.kelas);
  const kontrol = new AbortController();
  const batas = setTimeout(() => kontrol.abort(), 15000);
  try {
    const res = await fetch(url, { signal: kontrol.signal });
    return await res.json();
  } finally { clearTimeout(batas); }
}

async function kirimKeServer(payload) {
  const kontrol = new AbortController();
  const batas = setTimeout(() => kontrol.abort(), 30000);
  try {
    // text/plain = "simple request": tidak memicu preflight CORS pada Apps Script
    const res = await fetch(KOKA_CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: kontrol.signal
    });
    return await res.json();
  } finally { clearTimeout(batas); }
}

/* ---------- Tampilan ---------- */

function tambahGelembung(jenis, teks) {
  const baris = document.createElement('div');
  baris.className = 'kokai-baris ' + jenis;

  if (jenis === 'kokai') {
    const avatar = document.createElement('img');
    avatar.className = 'kokai-avatar';
    avatar.src = '../assets/images/mascot/maskot-kepala.png';
    avatar.alt = '';
    baris.appendChild(avatar);
  }
  const gelembung = document.createElement('div');
  gelembung.className = 'kokai-gelembung';
  gelembung.textContent = teks;          // textContent: aman dari HTML/skrip
  baris.appendChild(gelembung);

  daftar.appendChild(baris);
  daftar.scrollTop = daftar.scrollHeight;
  return baris;
}

function tampilkanMengetik() {
  const baris = document.createElement('div');
  baris.className = 'kokai-baris kokai';
  baris.innerHTML = '<img class="kokai-avatar" src="../assets/images/mascot/maskot-kepala.png" alt="">'
    + '<div class="kokai-gelembung"><span class="kokai-titik"><i></i><i></i><i></i></span></div>';
  daftar.appendChild(baris);
  daftar.scrollTop = daftar.scrollHeight;
  return baris;
}

function perbaruiKuota() {
  const lencana = el('kokai-kuota');
  if (sisa === null) { lencana.hidden = true; return; }
  lencana.hidden = false;
  lencana.textContent = '🎟️ Sisa: ' + sisa + '/' + batasHarian;

  const habis = sisa <= 0;
  input.disabled = habis || sedangKirim;
  tombolKirim.disabled = habis || sedangKirim;
  input.placeholder = habis
    ? 'Jatah hari ini sudah habis. Sampai jumpa besok! 🌙'
    : 'Tulis pertanyaanmu tentang koding atau AI…';
}

function perbaruiHitung() {
  const n = input.value.length;
  const h = el('kokai-hitung');
  h.textContent = n + '/' + maksTanya;
  h.classList.toggle('penuh', n >= maksTanya);
}

function tampilkanSaran() {
  const wadah = el('kokai-saran');
  wadah.innerHTML = '';
  if (riwayat.length > 0 || sisa <= 0) return;
  SARAN.forEach((teks) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kokai-chip';
    b.textContent = teks;
    b.addEventListener('click', () => { input.value = teks; perbaruiHitung(); input.focus(); });
    wadah.appendChild(b);
  });
}

function simpanRiwayat() {
  try { sessionStorage.setItem(KUNCI_RIWAYAT, JSON.stringify({ nama: sesi.nama, kelas: sesi.kelas, riwayat: riwayat.slice(-20) })); }
  catch (e) { /* abaikan */ }
}

function muatRiwayat() {
  try {
    const data = JSON.parse(sessionStorage.getItem(KUNCI_RIWAYAT) || 'null');
    if (data && data.nama === sesi.nama && data.kelas === sesi.kelas && Array.isArray(data.riwayat)) {
      riwayat = data.riwayat;
    }
  } catch (e) { riwayat = []; }
}

/* ---------- Kirim pertanyaan ---------- */

async function kirim() {
  if (sedangKirim) return;
  const teks = input.value.trim();
  if (!teks) return;
  if (sisa !== null && sisa <= 0) return;

  tambahGelembung('siswa', teks);
  input.value = '';
  perbaruiHitung();
  el('kokai-saran').innerHTML = '';

  sedangKirim = true;
  perbaruiKuota();
  tombolKirim.disabled = true;
  input.disabled = true;
  const mengetik = tampilkanMengetik();

  let kembalikanTeks = false;
  try {
    const d = await kirimKeServer({
      jenis: 'kokai',
      nama: sesi.nama,
      kelas: sesi.kelas,
      pertanyaan: teks,
      riwayat: riwayat.slice(-4)
    });
    mengetik.remove();

    if (d.status === 'ok') {
      tambahGelembung('kokai', d.jawaban);
      riwayat.push({ r: 'u', t: teks }, { r: 'a', t: d.jawaban });
      simpanRiwayat();
      if (typeof d.sisa === 'number') sisa = d.sisa;
    } else if (d.status === 'nonaktif') {
      tampilkan('terkunci');
      return;
    } else {
      tambahGelembung('sistem', d.pesan || 'KOKAI sedang istirahat. Coba lagi nanti ya 🙏');
      if (d.status === 'batas') sisa = 0;
      else kembalikanTeks = true;         // pertanyaan tidak terpakai: kembalikan ke kotak ketik
    }
  } catch (err) {
    mengetik.remove();
    tambahGelembung('sistem', 'Koneksi bermasalah. Periksa internetmu lalu coba lagi ya 🙏');
    kembalikanTeks = true;
  } finally {
    sedangKirim = false;
    if (kembalikanTeks) { input.value = teks; perbaruiHitung(); }
    perbaruiKuota();
    if (!input.disabled) input.focus();
  }
}

/* ---------- Mulai ---------- */

async function mulai() {
  tampilkan('memuat');
  if (typeof KOKA_CONFIG === 'undefined' || !KOKA_CONFIG.APPS_SCRIPT_URL) { tampilkan('gagal'); return; }

  let status;
  try { status = await ambilStatus(); }
  catch (err) { tampilkan('gagal'); return; }

  if (!status || status.aktif !== true) { tampilkan('terkunci'); return; }

  if (typeof status.maksTanya === 'number') maksTanya = status.maksTanya;
  if (typeof status.batas === 'number') batasHarian = status.batas;
  sisa = typeof status.sisa === 'number' ? status.sisa : batasHarian;

  input.maxLength = maksTanya;
  muatRiwayat();

  daftar.innerHTML = '';
  tambahGelembung('kokai', 'Hai ' + sesi.nama + '! Aku KOKAI 🤖 Tanyakan apa saja tentang koding dan kecerdasan artifisial ya. Kamu punya ' + sisa + ' pertanyaan hari ini.');
  riwayat.forEach((x) => tambahGelembung(x.r === 'u' ? 'siswa' : 'kokai', x.t));

  tampilkan('chat');
  perbaruiKuota();
  perbaruiHitung();
  tampilkanSaran();
  if (sisa <= 0) tambahGelembung('sistem', 'Jatah pertanyaanmu hari ini sudah habis. Coba lagi besok ya! 🌙');
}

tombolKirim.addEventListener('click', kirim);
input.addEventListener('input', perbaruiHitung);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kirim(); }
});
el('kokai-coba-lagi').addEventListener('click', mulai);

mulai();
