import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('example') && !supabaseAnonKey.includes('replace-with-your-anon-key'));

const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithPassword: async () => ({
          data: { user: null },
          error: new Error('Supabase não configurado. Use as contas demo do sistema.'),
        }),
        signOut: async () => ({ error: null }),
        setSession: async () => ({ error: null }),
        signInWithIdToken: async () => ({
          data: { user: null },
          error: new Error('Supabase não configurado. Use as contas demo do sistema.'),
        }),
      },
    } as any);

export default supabase;
