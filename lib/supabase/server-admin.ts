import { createClient } from "@supabase/supabase-js"

/**
 * Admin Supabase client (service role) for server-side API routes only.
 * Bypasses RLS to avoid policy recursion and allow privileged operations.
 *
 * NEVER import this into client components. Keep usage in /app/api/** only.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log("[createAdminClient] URL:", url ? url.substring(0, 20) + "..." : "undefined")

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client")
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
