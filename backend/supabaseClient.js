// Membuat satu koneksi Supabase yang dipakai bersama di seluruh server.js
// Memakai SERVICE ROLE KEY (bukan anon key) supaya backend punya akses
// penuh ke database. Browser/frontend TIDAK PERNAH melihat key ini.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl      = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌  SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env');
  console.error('    Lihat backend/.env.example untuk contohnya.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

module.exports = supabase;
