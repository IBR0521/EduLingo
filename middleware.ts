import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            // Set long expiration for persistent sessions (1 year)
            const cookieOptions = {
              ...options,
              maxAge: options?.maxAge || 60 * 60 * 24 * 365, // 1 year
              sameSite: options?.sameSite || 'lax' as const,
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
            }
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    })
    
    // Refresh session on every request to keep it alive
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Refresh the session to extend expiration
        await supabase.auth.refreshSession()
      }
    } catch (error: any) {
      // Ignore "Auth session missing" errors - they're expected for unauthenticated requests
      if (error?.message !== "Auth session missing!" && error?.name !== "AuthSessionMissingError") {
        // Silently continue - don't interrupt the request
      }
    }

    // Note: We don't call getSession() here to avoid "Auth session missing" errors
    // The Supabase client will handle session management automatically
    // Cookies are synced through the cookie handlers above
  } catch (error: any) {
    // Continue even if there's an error
    // Ignore "Auth session missing" errors as they're expected for unauthenticated requests
    if (error?.message !== "Auth session missing!" && error?.name !== "AuthSessionMissingError") {
      console.error("Middleware error:", error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

