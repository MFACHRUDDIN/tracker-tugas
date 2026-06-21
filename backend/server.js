// ============================================================
// Tracker Tugas API — Backend (Node.js + Express + Supabase)
// ============================================================
// Endpoint:
//   GET    /              -> cek server hidup
//   GET    /health        -> health check (Railway/Render)
//   POST   /login         -> login pakai nama + kode kelas
//   GET    /tasks         -> daftar tugas (milik sendiri / semua kalau dosen)
//   POST   /tasks         -> tambah tugas baru
//   PUT    /tasks/:id     -> edit tugas atau toggle selesai
//   DELETE /tasks/:id     -> hapus tugas
//   GET    /public/stats  -> statistik agregat anonim (tanpa login)
// ============================================================

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
const supabase = require('./supabaseClient');

const app        = express();
const PORT       = process.env.PORT       || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const CLASS_CODE = process.env.CLASS_CODE;
const ADMIN_CODE = process.env.ADMIN_CODE;

if (!JWT_SECRET || !CLASS_CODE || !ADMIN_CODE) {
  console.error('❌  Pastikan JWT_SECRET, CLASS_CODE, dan ADMIN_CODE sudah diisi di .env');
  process.exit(1);
}

// ------------------------------------------------------------
// Daftar pilihan yang valid — harus sinkron dengan frontend
// ------------------------------------------------------------
const MATA_KULIAH_LIST = [
  'Pengantar Manajemen', 'Pengantar Ekonomi', 'Matematika Ekonomi dan Bisnis',
  'Bahasa Indonesia',    'Bahasa Inggris', 'Bahasa Arab',
  'Pengantar Bisnis','Worldview Islam','KepondokModernan','Pengantar Akuntansi'
];
const JENIS_TUGAS_LIST = [
  'Makalah/Esai',     'Presentasi',    'Laporan/Resume',
  'Kuis/Soal Latihan','Studi Kasus',   'Diskusi/Debat',  'Lainnya'
];

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------
const allowedOrigin = (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*')
  ? process.env.FRONTEND_URL
  : true; // true = izinkan semua origin (aman untuk development)

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '200kb' }));

// ------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------
function signToken(user) {
  return jwt.sign(
    { id: user.id, nama: user.nama, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login kembali.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, nama, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesi login sudah berakhir. Silakan login kembali.' });
  }
}

function isUuid(str) {
  return typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function validateTaskInput(body) {
  if (!body.judul || !String(body.judul).trim())
    return 'Judul tugas wajib diisi.';
  if (!body.mata_kuliah || !MATA_KULIAH_LIST.includes(body.mata_kuliah))
    return 'Mata kuliah tidak valid.';
  if (body.mata_kuliah === 'Lainnya' && !String(body.mata_kuliah_custom || '').trim())
    return 'Nama mata kuliah (Lainnya) wajib diisi.';
  if (!body.jenis_tugas || !JENIS_TUGAS_LIST.includes(body.jenis_tugas))
    return 'Jenis tugas tidak valid.';
  if (body.jenis_tugas === 'Lainnya' && !String(body.jenis_tugas_custom || '').trim())
    return 'Nama jenis tugas (Lainnya) wajib diisi.';
  if (!body.mode || !['individu', 'kelompok'].includes(body.mode))
    return 'Mode pengerjaan harus "individu" atau "kelompok".';
  if (!body.tanggal_deadline)
    return 'Tanggal deadline wajib diisi.';
  if (body.prioritas !== undefined) {
    const p = Number(body.prioritas);
    if (Number.isNaN(p) || p < 1 || p > 5)
      return 'Prioritas harus berupa angka 1 sampai 5.';
  }
  return null;
}

// ------------------------------------------------------------
// GET / — health check dasar
// GET /health — untuk Railway / Render
// ------------------------------------------------------------
app.get('/',       (req, res) => res.json({ status: 'ok', message: 'Tracker Tugas API berjalan 🚀' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ------------------------------------------------------------
// POST /login
// Body: { nama: string, kode: string }
// ------------------------------------------------------------
app.post('/login', async (req, res) => {
  try {
    const { nama, kode } = req.body || {};

    if (!nama || typeof nama !== 'string' || !nama.trim())
      return res.status(400).json({ error: 'Nama wajib diisi.' });
    if (!kode || typeof kode !== 'string')
      return res.status(400).json({ error: 'Kode kelas wajib diisi.' });

    const namaTrim = nama.trim().slice(0, 80);

    // Tentukan role berdasar kode
    let role = null;
    if (kode === ADMIN_CODE)       role = 'dosen';
    else if (kode === CLASS_CODE)  role = 'mahasiswa';

    if (!role) {
      return res.status(401).json({
        error: 'Kode kelas salah. Tanyakan kode yang benar ke dosen atau teman sekelas.'
      });
    }

    // Cari user yang sudah pernah login (nama case-insensitive + role yang sama)
    const { data: existingUser, error: findErr } = await supabase
      .from('users')
      .select('*')
      .ilike('nama', namaTrim)
      .eq('role', role)
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;

    let user = existingUser;
    if (!user) {
      // Buat user baru jika belum pernah login
      const { data: created, error: createErr } = await supabase
        .from('users')
        .insert({ nama: namaTrim, role })
        .select()
        .single();
      if (createErr) throw createErr;
      user = created;
    }

    const token = signToken(user);
    res.json({ token, user: { id: user.id, nama: user.nama, role: user.role } });

  } catch (e) {
    console.error('POST /login error:', e);
    res.status(500).json({ error: 'Terjadi kesalahan saat login. Coba lagi sebentar lagi.' });
  }
});

// ------------------------------------------------------------
// GET /tasks
// Mahasiswa -> hanya tugas miliknya sendiri
// Dosen     -> semua tugas + nama pemilik
// ------------------------------------------------------------
app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const selectFields = req.user.role === 'dosen'
      ? '*, users:user_id ( nama )'
      : '*';

    let query = supabase.from('tasks').select(selectFields);

    if (req.user.role !== 'dosen') {
      query = query.eq('user_id', req.user.id);
    }

    query = query.order('tanggal_deadline', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    res.json({ tasks: data });
  } catch (e) {
    console.error('GET /tasks error:', e);
    res.status(500).json({ error: 'Gagal mengambil data tugas.' });
  }
});

// ------------------------------------------------------------
// POST /tasks
// ------------------------------------------------------------
app.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const validationError = validateTaskInput(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const payload = {
      user_id:            req.user.id,
      judul:              String(body.judul).trim(),
      mata_kuliah:        body.mata_kuliah,
      mata_kuliah_custom: body.mata_kuliah === 'Lainnya'
                            ? String(body.mata_kuliah_custom).trim()
                            : null,
      jenis_tugas:        body.jenis_tugas,
      jenis_tugas_custom: body.jenis_tugas === 'Lainnya'
                            ? String(body.jenis_tugas_custom).trim()
                            : null,
      mode:               body.mode,
      tanggal_diberikan:  body.tanggal_diberikan || null,
      tanggal_deadline:   body.tanggal_deadline,
      deskripsi:          body.deskripsi ? String(body.deskripsi).trim() : null,
      prioritas:          body.prioritas !== undefined ? Number(body.prioritas) : 3,
      selesai:            false
    };

    const { data, error } = await supabase.from('tasks').insert(payload).select().single();
    if (error) throw error;

    res.status(201).json({ task: data });
  } catch (e) {
    console.error('POST /tasks error:', e);
    res.status(500).json({ error: 'Gagal menambahkan tugas.' });
  }
});

// ------------------------------------------------------------
// PUT /tasks/:id
// Bisa edit lengkap, atau hanya toggle { selesai: true/false }
// ------------------------------------------------------------
app.put('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'ID tugas tidak valid.' });

    // Ambil tugas yang ada
    const { data: existing, error: findErr } = await supabase
      .from('tasks').select('*').eq('id', id).maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });

    // Cek kepemilikan
    if (req.user.role !== 'dosen' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Kamu tidak punya akses untuk mengubah tugas ini.' });
    }

    const body = req.body || {};
    const isFullEdit = body.judul !== undefined
                    || body.mata_kuliah !== undefined
                    || body.tanggal_deadline !== undefined;

    if (isFullEdit) {
      const merged = { ...existing, ...body };
      const validationError = validateTaskInput(merged);
      if (validationError) return res.status(400).json({ error: validationError });
    }

    // Bangun objek update — hanya field yang dikirim
    const u = {};
    if (body.judul              !== undefined) u.judul              = String(body.judul).trim();
    if (body.mata_kuliah        !== undefined) u.mata_kuliah        = body.mata_kuliah;
    if (body.mata_kuliah_custom !== undefined)
      u.mata_kuliah_custom = body.mata_kuliah === 'Lainnya'
                              ? String(body.mata_kuliah_custom || '').trim()
                              : null;
    if (body.jenis_tugas        !== undefined) u.jenis_tugas        = body.jenis_tugas;
    if (body.jenis_tugas_custom !== undefined)
      u.jenis_tugas_custom = body.jenis_tugas === 'Lainnya'
                              ? String(body.jenis_tugas_custom || '').trim()
                              : null;
    if (body.mode               !== undefined) u.mode               = body.mode;
    if (body.tanggal_diberikan  !== undefined) u.tanggal_diberikan  = body.tanggal_diberikan || null;
    if (body.tanggal_deadline   !== undefined) u.tanggal_deadline   = body.tanggal_deadline;
    if (body.deskripsi          !== undefined) u.deskripsi          = body.deskripsi ? String(body.deskripsi).trim() : null;
    if (body.prioritas          !== undefined) u.prioritas          = Number(body.prioritas);
    if (body.selesai            !== undefined) u.selesai            = Boolean(body.selesai);

    const { data, error } = await supabase
      .from('tasks').update(u).eq('id', id).select().single();
    if (error) throw error;

    res.json({ task: data });
  } catch (e) {
    console.error('PUT /tasks/:id error:', e);
    res.status(500).json({ error: 'Gagal memperbarui tugas.' });
  }
});

// ------------------------------------------------------------
// DELETE /tasks/:id
// ------------------------------------------------------------
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'ID tugas tidak valid.' });

    const { data: existing, error: findErr } = await supabase
      .from('tasks').select('*').eq('id', id).maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ error: 'Tugas tidak ditemukan.' });

    if (req.user.role !== 'dosen' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Kamu tidak punya akses untuk menghapus tugas ini.' });
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /tasks/:id error:', e);
    res.status(500).json({ error: 'Gagal menghapus tugas.' });
  }
});

// ------------------------------------------------------------
// GET /public/stats — TANPA LOGIN (anonim, hanya agregat)
// ------------------------------------------------------------
app.get('/public/stats', async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('mata_kuliah, tanggal_deadline, selesai');
    if (error) throw error;

    let aktif = 0, selesai = 0;
    const perMatkul = {};
    let deadlineTerdekat = null;

    (tasks || []).forEach(t => {
      if (t.selesai) {
        selesai++;
      } else {
        aktif++;
        const d = new Date(t.tanggal_deadline + 'T00:00:00');
        if (!deadlineTerdekat || d < deadlineTerdekat) deadlineTerdekat = d;
      }
      perMatkul[t.mata_kuliah] = (perMatkul[t.mata_kuliah] || 0) + 1;
    });

    let mataKuliahTerbanyak = null, maxCount = 0;
    Object.entries(perMatkul).forEach(([mk, count]) => {
      if (count > maxCount) { maxCount = count; mataKuliahTerbanyak = mk; }
    });

    res.json({
      total_tugas:                    (tasks || []).length,
      tugas_aktif:                    aktif,
      tugas_selesai:                  selesai,
      mata_kuliah_terbanyak:          mataKuliahTerbanyak,
      mata_kuliah_terbanyak_jumlah:   maxCount,
      deadline_terdekat:              deadlineTerdekat
                                        ? deadlineTerdekat.toISOString().slice(0, 10)
                                        : null
    });
  } catch (e) {
    console.error('GET /public/stats error:', e);
    res.status(500).json({ error: 'Gagal mengambil statistik publik.' });
  }
});

// ------------------------------------------------------------
// 404 fallback
// ------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// ------------------------------------------------------------
// Start server
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅  Tracker Tugas API berjalan di http://localhost:${PORT}`);
  console.log(`    CLASS_CODE  : ${CLASS_CODE}`);
  console.log(`    ADMIN_CODE  : ${ADMIN_CODE}`);
  console.log(`    FRONTEND_URL: ${process.env.FRONTEND_URL || '*'}`);
});
