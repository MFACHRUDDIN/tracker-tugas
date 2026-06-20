# Tracker Tugas Kuliah — Manajemen Semester 1 (Full-Stack)

Aplikasi tracker tugas kuliah online untuk seluruh kelas, dengan data tersimpan
terpusat di database — bukan lagi `localStorage` — sehingga semua mahasiswa memakai
data yang sama secara real-time.

**Stack (semuanya gratis):**

| Bagian           | Teknologi                            |
|------------------|--------------------------------------|
| Frontend         | HTML + Tailwind CSS (CDN) + JS murni |
| Backend          | Node.js + Express                    |
| Database         | Supabase (PostgreSQL)                |
| Hosting backend  | Railway **atau** Render              |
| Hosting frontend | Vercel **atau** Netlify              |

---

## Daftar Isi

1. [Struktur folder](#1-struktur-folder)
2. [Cara kerja login](#2-cara-kerja-login)
3. [Setup Supabase (database)](#3-setup-supabase-database)
4. [Jalankan backend di komputer sendiri](#4-jalankan-backend-di-komputer-sendiri)
5. [Jalankan frontend di komputer sendiri](#5-jalankan-frontend-di-komputer-sendiri)
6. [Deploy backend ke Railway](#6-deploy-backend-ke-railway)
7. [Deploy backend ke Render (alternatif)](#7-deploy-backend-ke-render-alternatif)
8. [Deploy frontend ke Vercel](#8-deploy-frontend-ke-vercel)
9. [Deploy frontend ke Netlify (alternatif)](#9-deploy-frontend-ke-netlify-alternatif)
10. [Hubungkan frontend dan backend](#10-hubungkan-frontend-dan-backend)
11. [Cara pakai aplikasi setelah online](#11-cara-pakai-aplikasi-setelah-online)
12. [Troubleshooting](#12-troubleshooting)
13. [Catatan keamanan](#13-catatan-keamanan)

---

## 1. Struktur Folder

```
tracker-tugas-fullstack/
├── backend/
│   ├── server.js           ← semua endpoint REST API
│   ├── supabaseClient.js   ← koneksi ke Supabase
│   ├── package.json
│   ├── .env.example        ← contoh isi file rahasia (.env)
│   └── .gitignore
├── frontend/
│   ├── index.html          ← seluruh tampilan (satu file)
│   └── config.js           ← 1 baris: alamat URL backend
├── database/
│   └── schema.sql          ← perintah SQL untuk membuat tabel
└── README.md
```

---

## 2. Cara Kerja Login

Tidak ada email / password. Login cukup pakai:

- **Nama lengkap** — bebas diketik sendiri
- **Kode kelas** — satu kode yang sama untuk semua mahasiswa (kamu yang tentukan, contoh: `MANAJEMEN1A`)

Ada juga **kode dosen** terpisah (contoh: `DOSENMNJ2026`) yang kalau dipakai saat login
akan masuk sebagai **akun dosen** — bisa melihat tugas semua mahasiswa sekaligus.

**Alur login di balik layar:**
1. Mahasiswa ketik nama + kode kelas → dikirim ke `POST /login`
2. Backend cek: kode cocok dengan `CLASS_CODE` (jadi mahasiswa) atau `ADMIN_CODE` (jadi dosen)?
3. Kalau cocok, backend cari / buat baris di tabel `users` dengan nama tersebut
4. Backend kirim balik **token JWT** → disimpan di `localStorage` browser
5. Token ini dipakai sebagai "kunci" di setiap permintaan berikutnya

> **Catatan:** dua orang dengan nama persis sama akan dianggap sebagai user yang sama.
> Minta mahasiswa memakai nama lengkap agar tidak bentrok.

---

## 3. Setup Supabase (Database)

> Estimasi waktu: 10 menit

**Langkah-langkah:**

1. Buka **https://supabase.com** → klik **Start your project** → daftar / login (bisa pakai GitHub)

2. Klik **New project**
   - Name: bebas, contoh `tracker-tugas-manajemen`
   - Database password: buat password (simpan, tapi tidak akan dipakai langsung)
   - Region: **Singapore** (paling dekat)
   - Klik **Create new project** → tunggu 1–2 menit

3. Setelah project siap, di sidebar kiri klik **SQL Editor** → **New query**

4. Buka file `database/schema.sql` dari proyek ini → **copy semua isinya** → **paste** ke SQL Editor

5. Klik tombol **Run** (pojok kanan bawah). Harus muncul: `Success. No rows returned`

6. Verifikasi: klik **Table Editor** di sidebar → harus ada 2 tabel: `users` dan `tasks`

7. Ambil API key: klik ⚙️ **Project Settings** (pojok kiri bawah) → **API**
   - Salin **Project URL** → bentuknya `https://xxxxxxxxxxxx.supabase.co`
   - Di bagian **Project API keys**, klik **Reveal** di baris `service_role` → salin keynya

   > ⚠️ **PENTING:** `service_role` key punya akses penuh ke database.
   > JANGAN taruh di kode frontend atau commit ke GitHub.
   > Key ini hanya boleh ada di file `.env` backend.

---

## 4. Jalankan Backend di Komputer Sendiri

**Prasyarat:** Node.js versi 18 atau lebih baru (cek dengan `node -v`)

```bash
# Masuk ke folder backend
cd backend

# Install dependensi
npm install

# Salin file contoh environment
cp .env.example .env
```

Buka file `backend/.env` dengan text editor, lalu isi semua nilainya:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
JWT_SECRET=ganti-dengan-teks-acak-panjang-min-32-karakter
CLASS_CODE=MANAJEMEN1A
ADMIN_CODE=DOSENMNJ2026
FRONTEND_URL=*
PORT=3000
```

> Tips buat `JWT_SECRET`: buka https://www.uuidgenerator.net/ dan salin 2–3 UUID digabung.

Jalankan server:

```bash
npm start
```

Kalau berhasil, muncul:
```
✅  Tracker Tugas API berjalan di http://localhost:3000
    CLASS_CODE  : MANAJEMEN1A
    ADMIN_CODE  : DOSENMNJ2026
    FRONTEND_URL: *
```

Tes di browser: buka `http://localhost:3000` → harus muncul `{"status":"ok","message":"Tracker Tugas API berjalan 🚀"}`

---

## 5. Jalankan Frontend di Komputer Sendiri

Pastikan `frontend/config.js` masih berisi:
```js
window.API_BASE_URL = "http://localhost:3000";
```

Karena `index.html` memuat `config.js` sebagai file terpisah, jangan dibuka dengan
double-click biasa (browser akan blokir `file://` requests). Gunakan server statis:

```bash
cd frontend
npx serve .
```

Ikuti URL yang muncul di terminal (biasanya `http://localhost:3000` atau port lain
seperti `http://localhost:4173` kalau bentrok dengan backend).

Coba login dengan nama apa saja + kode `CLASS_CODE` yang kamu set di `.env`.

---

## 6. Deploy Backend ke Railway

> Estimasi waktu: 15 menit

1. **Push kode ke GitHub** (buat repo baru di github.com, upload semua file termasuk
   folder `backend/` — tapi pastikan `backend/.env` TIDAK ikut, karena sudah ada di `.gitignore`)

2. Buka **https://railway.app** → login pakai GitHub

3. Klik **New Project** → **Deploy from GitHub repo** → pilih repo kamu

4. Setelah project dibuat, klik project tersebut → tab **Settings** → cari **Root Directory**
   → isi dengan `backend` (supaya Railway hanya menjalankan folder backend)

5. Tab **Variables** → klik **Add Variable** satu per satu:
   ```
   SUPABASE_URL             = https://xxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOi...
   JWT_SECRET               = teks-acak-panjangmu
   CLASS_CODE               = MANAJEMEN1A
   ADMIN_CODE               = DOSENMNJ2026
   FRONTEND_URL             = *
   ```
   > `PORT` tidak perlu — Railway mengisi otomatis.

6. Railway otomatis build & deploy. Tunggu sampai status berubah menjadi **Active** (tanda hijau)

7. Tab **Settings** → **Networking** → klik **Generate Domain**
   → Kamu dapat URL seperti: `https://tracker-tugas-backend-production.up.railway.app`

8. Tes: buka URL tersebut di browser → harus muncul `{"status":"ok",...}` ✓

---

## 7. Deploy Backend ke Render (Alternatif)

1. Push kode ke GitHub (sama seperti langkah 6.1)

2. Buka **https://render.com** → login pakai GitHub

3. Klik **New +** → **Web Service** → pilih repo kamu

4. Isi konfigurasi:
   | Setting        | Nilai           |
   |----------------|-----------------|
   | Root Directory | `backend`       |
   | Runtime        | Node            |
   | Build Command  | `npm install`   |
   | Start Command  | `npm start`     |
   | Instance Type  | Free            |

5. Tambahkan Environment Variables (sama seperti langkah 6.5)

6. Klik **Create Web Service** → tunggu build selesai

7. Render memberikan URL seperti: `https://tracker-tugas-backend.onrender.com`

> **Catatan Render free tier:** server otomatis "tidur" setelah 15 menit tidak ada trafik.
> Request pertama akan butuh ~30–50 detik untuk "bangun". Ini normal — beritahu mahasiswa
> kalau loading pertama terasa lambat.

---

## 8. Deploy Frontend ke Vercel

1. Push kode ke GitHub (repo yang sama atau repo terpisah, boleh)

2. Buka **https://vercel.com** → login pakai GitHub

3. Klik **Add New** → **Project** → pilih repo kamu → **Import**

4. Di bagian **Root Directory** → klik **Edit** → pilih folder `frontend`

5. **Framework Preset**: pilih **Other** (ini HTML statis, tidak butuh build tool)

6. Klik **Deploy** → tunggu beberapa detik

7. Vercel memberi URL seperti: `https://tracker-tugas-kelas.vercel.app` ✓

---

## 9. Deploy Frontend ke Netlify (Alternatif)

**Cara tercepat — drag & drop, tanpa GitHub:**

1. Buka **https://app.netlify.com/drop**

2. Seret (drag) folder `frontend/` dari komputer ke halaman tersebut

3. Netlify otomatis upload dan memberi URL seperti: `https://tracker-tugas-kelas.netlify.app`

**Cara yang lebih proper (terhubung ke GitHub — disarankan):**

1. **Add new site** → **Import an existing project** → pilih repo GitHub
2. Set **Base directory** ke `frontend`
3. Build command: kosongkan
4. Publish directory: `.`
5. **Deploy site**

---

## 10. Hubungkan Frontend dan Backend

Setelah keduanya online, ada **2 hal** yang harus diubah:

### A. Update `config.js` di frontend

Buka `frontend/config.js`, ubah URL-nya:
```js
// Ganti dengan URL backend kamu dari langkah 6.7 atau 7.7
window.API_BASE_URL = "https://tracker-tugas-backend-production.up.railway.app";
```
(Tanpa garis miring `/` di akhir URL)

Lalu **commit dan push** perubahan ini ke GitHub → Vercel/Netlify otomatis redeploy.
(Kalau pakai Netlify drag & drop, ulangi drag folder `frontend/` yang sudah diedit.)

### B. Update `FRONTEND_URL` di backend

Di Railway/Render, ubah environment variable:
```
FRONTEND_URL = https://tracker-tugas-kelas.vercel.app
```
(Ganti dengan URL frontend kamu, tanpa `/` di akhir)

Simpan → Railway/Render otomatis restart. Kalau tidak, klik **Redeploy** manual.

### Tes akhir

Buka URL frontend di browser → coba login → kalau muncul data, semuanya sudah terhubung! 🎉

Kalau muncul error "CORS policy" di console browser (klik kanan → Inspect → Console),
kemungkinan `FRONTEND_URL` di backend belum benar atau backend belum restart.

---

## 11. Cara Pakai Aplikasi Setelah Online

1. **Bagikan link frontend** ke seluruh mahasiswa (contoh: `https://tracker-tugas-kelas.vercel.app`)

2. **Bagikan `CLASS_CODE`** (nilai yang kamu set, contoh `MANAJEMEN1A`) — ini dipakai semua
   mahasiswa untuk login bersama nama masing-masing

3. **Jangan sebar `ADMIN_CODE`** — hanya untuk kamu/dosen, memberikan akses melihat tugas
   semua mahasiswa

4. Siapa saja (termasuk yang belum login) bisa klik **"Lihat statistik publik"** di halaman
   login untuk melihat ringkasan kelas secara anonim

5. Daftar tugas di-refresh otomatis setiap **12 detik** — tidak perlu refresh manual

---

## 12. Troubleshooting

**"Tidak bisa terhubung ke server"**
→ Pastikan `config.js` sudah benar dan backend hidup (buka URL backend langsung di browser).
→ Kalau pakai Render free tier, tunggu 30–50 detik (server sedang bangun dari tidur).

**Error "blocked by CORS policy" di console browser**
→ Pastikan `FRONTEND_URL` di environment variable backend sama persis dengan URL frontend
  (termasuk `https://`, tanpa `/` di akhir). Redeploy backend setelah mengubahnya.

**"Kode kelas salah" padahal sudah benar**
→ Cek environment variable `CLASS_CODE` di Railway/Render: tidak ada spasi tersembunyi?
  Backend sudah di-restart setelah env variable diubah?

**Otomatis logout terus / error 401**
→ `JWT_SECRET` di backend berubah → semua token lama tidak valid. Minta mahasiswa login ulang.

**`npm install` gagal di lokal**
→ `node -v` → harus 18+. Hapus `node_modules/` dan `package-lock.json`, coba lagi.

**Data tugas tidak muncul setelah login**
→ Cek tabel `tasks` di Supabase Table Editor — ada datanya tidak?
→ Cek apakah `SUPABASE_SERVICE_ROLE_KEY` benar (bukan `anon` key yang tertukar).

**RLS error dari Supabase**
→ Jalankan ulang `schema.sql` di SQL Editor. Pastikan baris `alter table ... enable row level security;`
  sudah dieksekusi dengan benar.

---

## 13. Catatan Keamanan

- **Jangan pernah commit `.env`** (sudah dilindungi `.gitignore` — jangan hapus baris itu)
- `SUPABASE_SERVICE_ROLE_KEY` = kunci master database — hanya boleh ada di environment
  variable Railway/Render, **tidak pernah di kode frontend**
- Sistem login (nama + kode kelas) cocok untuk kelas kecil dengan risiko rendah —
  **bukan** pengganti sistem autentikasi sungguhan
- Ganti `CLASS_CODE`, `ADMIN_CODE`, dan `JWT_SECRET` dengan nilai yang kamu buat sendiri
  sebelum dipakai — jangan pakai contoh dari file ini apa adanya

---

Selamat memakai! Kalau ada error yang tidak ada di Troubleshooting, salin pesan errornya
(dari console browser atau log Railway/Render) untuk membantu menelusurinya.
