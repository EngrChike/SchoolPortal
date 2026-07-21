import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Safety check to make sure you copied the keys correctly into .env.local
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Error: Missing Supabase Environment Variables in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);