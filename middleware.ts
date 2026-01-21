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
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    // Get session to ensure cookies are synced
    // This will return null if no session exists, which is fine
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Only log actual errors, not missing sessions (which is normal for unauthenticated requests)
    if (sessionError && sessionError.message !== "Auth session missing!") {
      console.error("Middleware session error:", sessionError)
    }
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

