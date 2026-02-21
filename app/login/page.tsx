"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        // Ignore "Auth session missing" errors - they're expected for unauthenticated users
        if (userError && userError.message !== "Auth session missing!" && userError.name !== "AuthSessionMissingError") {
          console.error("Auth check error:", userError)
          setChecking(false)
          return
        }

        if (user) {
          // User is already logged in, get role and redirect
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()

          if (profileError) {
            // Try multiple ways to extract error information
            const errorInfo = {
              message: profileError.message,
              code: profileError.code,
              details: profileError.details,
              hint: profileError.hint,
              status: (profileError as any).status || (profileError as any).statusCode,
              name: (profileError as any).name,
              toString: String(profileError),
              keys: Object.keys(profileError),
            }
            
            // Try to stringify with error handling
            let errorString = "Unknown error"
            try {
              errorString = JSON.stringify(profileError, Object.getOwnPropertyNames(profileError))
            } catch (e) {
              try {
                errorString = String(profileError)
              } catch (e2) {
                errorString = `Error object: ${Object.keys(profileError).join(", ")}`
              }
            }
            
            console.error("Profile fetch error - Full details:", errorInfo)
            console.error("Profile fetch error - Stringified:", errorString)
            console.error("Profile fetch error - Raw:", profileError)
            
            // If profile doesn't exist, user might need to complete registration
            // Continue to show login page
            setChecking(false)
            return
          }

          if (profile && 'role' in profile) {
            const roleRoutes: Record<string, string> = {
              main_teacher: "/dashboard/main-teacher",
              teacher: "/dashboard/teacher",
              student: "/dashboard/student",
              parent: "/dashboard/parent",
            }
            const redirectPath = roleRoutes[profile.role as string] || "/dashboard"
            router.replace(redirectPath)
            return
          }
        }
      } catch (error) {
        console.error("Auth check error:", error)
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <LoginForm />
      </div>
    </div>
  )
}

