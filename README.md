# KOKA — Koding dan Kecerdasan Artifisial
### Explore The World of Coding an Ai

Website pembelajaran interaktif untuk mata pelajaran **Koding dan Kecerdasan Artifisial (KA)** kelas 5 & 6, dibangun dengan HTML5, CSS3, dan JavaScript murni (tanpa framework) — mengikuti gaya teknis proyek AKKA.

---

## ⚠️ WAJIB DIBACA: Cara Menjalankan Situs Ini
Situs ini memuat data (materi, soal, dsb) dari file **`.json`** menggunakan `fetch()`. Karena keterbatasan browser, **file tidak akan tampil jika `index.html` dibuka langsung dengan cara diklik dua kali dari komputer/HP** (protokol `file://`).

Situs ini **HARUS** dijalankan lewat web server — baik untuk uji coba lokal maupun saat sudah online nanti (GitHub Pages, Netlify, hosting berbayar, dsb akan otomatis berjalan dengan benar karena semuanya memakai `http/https`, bukan `file://`).

**Untuk uji coba di komputer sendiri**, jalankan salah satu perintah ini di dalam folder `koka/` lewat terminal, lalu buka `http://localhost:8000` di browser:
```
# Jika ada Python:
python3 -m http.server 8000

# Jika ada Node.js:
npx serve .
```

## 🎨 Tema Desain
- Warna: **Putih • Ungu • Oranye** dengan gradasi ala latar bergelombang (lihat `css/variables.css`)
- Maskot robot (dari referensi Anda) dipakai di halaman login, dashboard, petunjuk, dan gameplay
- Font: Baloo 2 (judul) & Poppins (isi)
- Audio latar (lembut, bisa dimatikan lewat tombol 🔊 mengambang) — otomatis TIDAK ada di semua halaman Asesmen

## 🗂️ Struktur Folder
```
koka/
├── index.html              → Halaman Login
├── html/                   → Semua halaman setelah login
│   ├── dashboard.html
│   ├── petunjuk.html
│   ├── cp-atp-tp.html
│   ├── materi.html          + materi-detail.html
│   ├── game.html             + game-play.html
│   └── asesmen.html         → menu, lalu:
│       ├── asesmen-sumatif.html  + asesmen-soal.html + asesmen-selesai.html
│       └── asesmen-proyek.html
├── css/                    → Semua styling (per halaman, terpisah)
├── js/                     → Semua logika (per halaman, terpisah)
├── data/                   → Semua konten & bank soal (format .json, terpisah rapi per kebutuhan)
├── assets/images/ , assets/audio/  → Maskot, gambar materi, aset game, musik latar
└── apps-script/Code.gs     → Backend Google Apps Script (Sumatif, Proyek, Refleksi)
```

## ✅ Yang Sudah Berfungsi
1. **Login** — isi nama & pilih kelas (5/6), tanpa token. Bisa di-scroll normal di HP.
2. **Dashboard** — sambutan + lambaian tangan, akses cepat ke Petunjuk & CP/TP/ATP, dan 3 kartu menu utama bergaya e-learning (gambar di atas, deskripsi di bawah).
3. **Petunjuk** — desain langkah bernomor, tidak klasik.
4. **CP/TP/ATP** — ditampilkan sebagai **tabel** (Bab × Tujuan Pembelajaran), tab kelas 5/6.
5. **Materi** — kartu bab BISA DIKLIK DI MANA SAJA (gambar/judul) untuk langsung membuka, tanpa tombol terpisah. Kelas 5 (6 bab, 3 aktif) & kelas 6 (4 bab, 2 aktif); sisanya "Segera Hadir". Setiap bab memiliki Kuis Refleksi (pilihan ganda, tanpa nilai) **dan** Kolom Refleksi (tulisan bebas) yang terkirim otomatis ke Google Sheets.
6. **Game** ala *Hunter Coin* — mekanik "susun dulu, jalankan kemudian" di atas **satu medan 6x6** berisi 5 koin dan 3 jenis rintangan (batu/box/laser). Siswa menyusun urutan panah (atas/bawah/kiri/kanan), tekan ▶️ Jalankan, robot bergerak mengikuti urutan tersebut. Menabrak rintangan = nyawa berkurang & robot kembali ke start. Menyentuh koin = muncul soal pilihan ganda; benar = koin didapat, salah = nyawa berkurang — lalu program otomatis lanjut. Kelas 5 = 3 misi, kelas 6 = 2 misi, masing-masing 5 soal/koin.
7. **Asesmen** — 2 kotak jelas terpisah (border & warna beda) untuk Sumatif dan Pengumpulan Proyek:
   - **Sumatif**: setiap **BAB** punya kode unik (token) Paket A & B tersendiri (persis seperti AKKA). Setiap paket berisi 5 soal dengan 4 jenis: 2 Pilihan Ganda (bobot 1), 1 Pilihan Ganda Kompleks (pilih 2 jawaban, bobot 2), 1 Benar/Salah (3 pernyataan, bobot 3), 1 Menjodohkan (3 pasangan, bobot 3) — total bobot 10, dinilai otomatis & proporsional, satu soal ditampilkan per halaman. Hasil dikirim ke Google Sheets.
   - **Pengumpulan Proyek**: form Nama (otomatis)/Kelas/No Presensi/**Judul Proyek (ketik bebas)** + link ATAU upload file (maks 5MB, otomatis ke Google Drive lalu dicatat di Sheets).
8. **Musik latar** — melanjutkan dari posisi terakhir saat pindah halaman (tidak mulai dari awal lagi), otomatis tidak ada di halaman Asesmen.
9. **Background dihias** — pola ikon koding samar di halaman Login & Dashboard, bisa dimatikan lewat satu class (lihat bagian "Background dihias vs polos" di bawah).

## ✏️ Cara Mengedit Konten (Guru)

| Yang ingin diubah | Edit file |
|---|---|
| Isi materi tiap bab | `data/materi-kelas5.json` / `data/materi-kelas6.json` |
| Mengaktifkan bab baru | ubah `"aktif": false` → `true` pada bab terkait, lalu isi field `konten` |
| Denah game (posisi koin & 3 jenis rintangan), lokasi banyak diatur di kode | `js/game-play.js` → array `DENAH_MEDAN` di bagian atas file. Simbol: `S`=start, `.`=kosong, `C`=koin, `R1`=batu, `R2`=box, `R3`=laser |
| Soal saat koin disentuh (5 soal per misi) | `data/game-kelas5.json` / `data/game-kelas6.json` |
| **Soal & kode unik (token) Sumatif per bab** | `data/soal-sumatif-kelas5.json` / `kelas6.json` (soal per bab+paket) DAN `data/token-sumatif.json` (kode unik per bab+paket) — **keduanya harus diedit bersamaan** karena `babId` di kedua file harus sama persis |
| CP / Elemen / Materi / TP / ATP (tabel) | `data/cp-atp-tp.json` — `cpUmum` untuk teks CP resmi per elemen, `kelas5.baris` / `kelas6.baris` untuk Materi/TP/ATP per elemen |
| Gambar maskot, koin, 3 jenis rintangan | ganti file di `assets/images/mascot/` dan `assets/images/game/` dengan **nama file yang sama** |
| Musik latar | ganti `assets/audio/latar-belakang.mp3` dengan nama file yang sama |

### 🎨 Background dihias vs polos (Login & Dashboard)
Kedua halaman ini punya **2 versi siap pakai** — cukup tambah/hapus satu kata `bg-hias` di tag `<body>`:
- **Versi dihias (default saat ini)**: `<body class="halaman-login bg-hias">` / `<body class="halaman-app bg-hias">` — pola samar ikon `</>`, `{ }`, robot kecil, dsb di belakang.
- **Versi polos**: hapus kata ` bg-hias` dari class tersebut di `index.html` (login) atau `html/dashboard.html` (dashboard).

### Contoh kode unik Sumatif yang sudah dibuat
| Kelas | Bab | Token Paket A | Token Paket B |
|---|---|---|---|
| 5 | Bab 1 | `KOKA5B1A` | `KOKA5B1B` |
| 5 | Bab 2 | `KOKA5B2A` | `KOKA5B2B` |
| 5 | Bab 3 | `KOKA5B3A` | `KOKA5B3B` |
| 6 | Bab 1 | `KOKA6B1A` | `KOKA6B1B` |
| 6 | Bab 2 | `KOKA6B2A` | `KOKA6B2B` |

## 🔗 Menghubungkan Google Sheets & Drive
1. Buat Google Spreadsheet baru → buka **Extensions > Apps Script**.
2. Salin seluruh isi `apps-script/Code.gs` ke editor Apps Script (petunjuk lengkap ada di komentar file tersebut). Skrip ini otomatis membuat 3 sheet: **Hasil** (Sumatif), **Proyek**, dan **Refleksi**.
3. Ganti `SHEET_ID` dengan ID spreadsheet Anda. Jika ingin siswa bisa upload file proyek, buat folder Google Drive lalu isi `DRIVE_FOLDER_ID`.
4. **Deploy > New deployment > Web app** (Execute as: *Me*, Who has access: *Anyone*).
5. Salin URL Web App yang diberikan Google, tempel ke `js/config.js` pada `APPS_SCRIPT_URL`.

## 🤖 KOKAI — Asisten AI (Semester 2)
Chatbot belajar untuk siswa, memakai OpenAI lewat Google Apps Script (kunci API **tidak** ada di website).
- **Saklar utama**: Script Properties `KOKAI_AKTIF` di Apps Script (`tidak` = terkunci, `ya` = aktif). Tidak perlu deploy ulang.
- Kotak KOKAI di Dashboard (setelah CP-TP) terkunci sampai diaktifkan; halaman: `html/kokai.html`, `js/kokai.js`, `css/kokai.css`.
- Jatah per siswa/hari, batas panjang pertanyaan/jawaban, dan model diatur di Script Properties (lihat komentar di `apps-script/Code.gs`).
- Riwayat tanya-jawab & jumlah token tercatat di sheet **KOKAI**.

## 🚀 Cara Publikasikan (GitHub Pages, contoh gratis)
1. Buat repository baru di GitHub, upload seluruh isi folder `koka/`.
2. Buka **Settings > Pages**, pilih branch `main` dan folder `/ (root)`.
3. Tunggu beberapa menit, situs akan aktif di `https://namauser.github.io/nama-repo/`.

## 🖼️ Aset yang Masih Placeholder (Siap Diganti)
- `assets/images/game/koin.png` & `assets/images/game/rintangan.png` — buatan sementara, tinggal timpa dengan desain Anda sendiri (nama file sama).
- `assets/audio/latar-belakang.mp3` — musik buatan sementara (nada lembut), tinggal ganti.
- Bab 4–6 (Kelas 5) & Bab 3–4 (Kelas 6) — struktur sudah siap, tinggal isi kontennya.

---
Footer: **KOKA © 2026**
