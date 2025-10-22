import { createClient } from './supabase/server';

export const supabaseServer = () => createClient();
