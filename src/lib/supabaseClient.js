import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://rttraruhalqrljnkaprj.supabase.co';
const fallbackSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dHJhcnVoYWxxcmxqbmthcHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MDIwMTYsImV4cCI6MjA5OTE3ODAxNn0.Khfqx4CO3vFv3SSlSQ0KOk1sCMIvX3gCCjbVKGuyJyw';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
