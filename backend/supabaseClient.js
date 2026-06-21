require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl       = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌  SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: { transport: require('ws') }
});

module.exports = supabase;