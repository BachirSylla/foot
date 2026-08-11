"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True si les clés sont présentes -> mode "live". Sinon -> mode démo (mock). */
export const isSupabaseConfigured = Boolean(url && anon);

let _client: SupabaseClient | null = null;

/** Client Supabase navigateur (singleton). Null si non configuré. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_client) {
    _client = createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _client;
}
