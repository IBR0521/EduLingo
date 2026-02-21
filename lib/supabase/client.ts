"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) {
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration. Please check your environment variables.")
  }

  // createBrowserClient automatically syncs with server-side cookies
  // It reads/writes cookies that are set by the server (middleware and server components)
  // This ensures sessions persist across browser restarts
  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

  return client
}
