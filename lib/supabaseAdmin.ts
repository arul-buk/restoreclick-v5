// lib/supabaseAdmin.ts

import { createClient } from '@supabase/supabase-js';
import { serverConfig } from './config.server'; // Use the server config

const supabaseAdmin = createClient(serverConfig.supabase.url, serverConfig.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAdmin;