-- ============================================================
-- Skema Database — Tracker Tugas Manajemen Semester 1
-- Jalankan seluruh file ini di:
--   Supabase Dashboard > SQL Editor > New query > paste > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabel users
-- Setiap baris = satu mahasiswa atau akun dosen.
-- Tidak ada password — autentikasi pakai "nama + kode kelas"
-- yang diverifikasi di backend (server.js).
-- ------------------------------------------------------------
create table if not exists users (
  id         uuid        primary key default gen_random_uuid(),
  nama       text        not null,
  role       text        not null default 'mahasiswa'
               check (role in ('mahasiswa', 'dosen')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabel tasks
-- Setiap baris = satu tugas kuliah milik satu user.
-- ------------------------------------------------------------
create table if not exists tasks (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references users(id) on delete cascade,

  judul               text        not null,
  mata_kuliah         text        not null,
  mata_kuliah_custom  text,
  jenis_tugas         text        not null,
  jenis_tugas_custom  text,
  mode                text        not null check (mode in ('individu', 'kelompok')),

  tanggal_diberikan   date,
  tanggal_deadline    date        not null,
  deskripsi           text,
  prioritas           int         not null default 3 check (prioritas between 1 and 5),
  selesai             boolean     not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_tasks_user_id    on tasks(user_id);
create index if not exists idx_tasks_deadline   on tasks(tanggal_deadline);
create index if not exists idx_tasks_mata_kuliah on tasks(mata_kuliah);

-- ------------------------------------------------------------
-- Row Level Security
-- Backend memakai SERVICE ROLE KEY yang selalu melewati RLS.
-- Mengaktifkan RLS tanpa policy = blokir akses langsung dari
-- browser (anon/public key) — data hanya bisa diakses lewat
-- backend Express kita.
-- ------------------------------------------------------------
alter table users enable row level security;
alter table tasks enable row level security;

-- ------------------------------------------------------------
-- Trigger: otomatis update kolom updated_at saat tugas diubah
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ============================================================
-- Selesai. Cek di Table Editor: harus ada 2 tabel baru ->
-- "users" dan "tasks".
-- ============================================================
