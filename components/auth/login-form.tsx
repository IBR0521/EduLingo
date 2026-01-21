"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const router = useRouter()
  const isNavigatingRef = useRef(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isNavigatingRef.current || loading) return
    
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!data.user || !data.session) {
        setError("Failed to sign in. Please try again.")
        setLoading(false)
        return
      }

      // Wait a moment to ensure session cookies are set by Supabase
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Verify session is still valid
      const { data: { session: verifiedSession }, error: sessionError } = await supabase.auth.getSession()
      
      // Handle session errors gracefully
      if (sessionError) {
        // Ignore "Auth session missing" errors right after login - cookies might not be synced yet
        if (sessionError.message === "Auth session missing!" || sessionError.name === "AuthSessionMissingError") {
          // Wait a bit longer for cookies to sync, then try again
          await new Promise((resolve) => setTimeout(resolve, 300))
          const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession()
          if (retryError || !retrySession) {
            if (!isNavigatingRef.current) {
              setError("Session could not be established. Please try again.")
              setLoading(false)
            }
            return
          }
          // Session is now available, continue
        } else {
          if (!isNavigatingRef.current) {
            setError("Session could not be established. Please try again.")
            setLoading(false)
          }
          return
        }
      } else if (!verifiedSession) {
        if (!isNavigatingRef.current) {
          setError("Session could not be established. Please try again.")
          setLoading(false)
        }
        return
      }

      // Get user role for redirect
      // Use a more detailed query to get better error information
      const profileQuery = supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single()
      
      const { data: profile, error: profileError } = await profileQuery
      
      // Log the full response for debugging
      console.log("Profile query response:", { profile, profileError, userId: data.user.id })

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
        
        // Log error in multiple ways to capture all information
        console.group("🔴 Profile Fetch Error Details")
        console.error("Error Info Object:", errorInfo)
        console.error("Error Stringified:", errorString)
        console.error("Error Raw Object:", profileError)
        console.error("Error Type:", typeof profileError)
        console.error("Error Constructor:", profileError?.constructor?.name)
        if (profileError) {
          console.error("Error Properties:", Object.getOwnPropertyNames(profileError))
          console.error("Error Descriptors:", Object.getOwnPropertyDescriptors(profileError))
        }
        console.groupEnd()
        
        if (!isNavigatingRef.current) {
          // Check if it's a 406 error (RLS policy issue) - this is the most common issue
          const status = errorInfo.status || (profileError as any)?.statusCode || (profileError as any)?.status
          const code = errorInfo.code || (profileError as any)?.code
          const message = errorInfo.message || errorString || "Unknown error"
          
          // 406 = Not Acceptable, usually means RLS policy blocking access
          // PGRST116 = No rows returned (but could also be RLS blocking)
          if (status === 406 || message?.includes("406") || message?.includes("Not Acceptable") || message?.includes("permission denied") || message?.includes("new row violates row-level security")) {
            setError("❌ Database Security Error: Row Level Security (RLS) policies are blocking access. Please run 'scripts/08_verify_and_fix_rls.sql' in your Supabase SQL Editor to fix this. See DATABASE_SETUP.md for instructions.")
          } else if (code === "PGRST116" || message?.includes("No rows") || message?.includes("not found") || message?.includes("0 rows") || (status === 200 && !profile)) {
            // PGRST116 means no rows found - user profile doesn't exist
            // DO NOT auto-create profile - this would overwrite roles
            // Instead, show error and direct user to proper fix
            console.error("User profile not found for user:", data.user.id)
            setError("User profile not found. Your account exists but your profile is missing. Please contact support or run the SQL script 'scripts/09_create_missing_profiles.sql' in Supabase SQL Editor. DO NOT create profiles automatically as this may overwrite existing roles.")
            setLoading(false)
            return
          } else {
            const errorMsg = message && message !== "Unknown error" ? message : `Database error (Status: ${status || code || 'unknown'}). Check browser console for details.`
            setError(`Failed to load user profile: ${errorMsg}`)
          }
          setLoading(false)
        }
        return
      }

      if (!profile) {
        if (!isNavigatingRef.current) {
          setError("User profile not found. Please complete your registration.")
          setLoading(false)
        }
        return
      }

      const roleRoutes: Record<string, string> = {
        main_teacher: "/dashboard/main-teacher",
        teacher: "/dashboard/teacher",
        student: "/dashboard/student",
        parent: "/dashboard/parent",
      }

      const redirectPath = profile && 'role' in profile ? roleRoutes[profile.role as string] || "/dashboard" : "/dashboard"
      
      // Mark that we're navigating to prevent further state updates
      isNavigatingRef.current = true
      
      // Use window.location.replace for full page reload to ensure cookies are properly set
      // This ensures the server can read the session cookies on the next request
      // Using replace instead of href prevents back button issues
      window.location.replace(redirectPath)
    } catch (err) {
      if (!isNavigatingRef.current) {
        console.error("Login error:", err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
        setLoading(false)
      }
    }
  }

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
          <GraduationCap className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
        <CardDescription className="text-base">Sign in to your account to continue</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

