
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = "https://ksjzrlardsfqfbariypa.supabase.co";
export const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzanpybGFyZHNmcWZiYXJpeXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NjIzNDgsImV4cCI6MjA4NjMzODM0OH0.Axcy21QJYKtSDI0_qQY1oG9_4TRLLo_0S4jeUFcdv8o";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined
  }
});
