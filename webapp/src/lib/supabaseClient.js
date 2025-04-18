import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ouoltbhcojflwuuhilho.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91b2x0Ymhjb2pmbHd1dWhpbGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNjU1OTYsImV4cCI6MjA1OTc0MTU5Nn0._aNJ0pnNhgUg5Jr1pNnPz6ladIWTv9bDqnAHN86g8fE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 