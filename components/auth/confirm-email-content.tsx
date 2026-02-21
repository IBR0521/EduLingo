"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const confirmEmail = async () => {
      const supabase = createClient()

      const token_hash = searchParams.get("token_hash")
      const type = searchParams.get("type")

      if (type === "email") {
        const { data, error } = await supabase.auth.getSession()

        // Ignore "Auth session missing" errors - they're expected for unauthenticated users
        if (error && error.message !== "Auth session missing!" && error.name !== "AuthSessionMissingError") {
          setStatus("error")
          setMessage("Failed to confirm email. The link may be invalid or expired.")
          return
        }
        
        if (data?.session) {
          setStatus("success")
          setMessage("Your email has been confirmed successfully! You can now sign in.")
          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        } else {
          setStatus("error")
          setMessage("Could not verify your email. Please try again or contact support.")
        }
      } else {
        setStatus("error")
        setMessage("Invalid confirmation link.")
      }
    }

    confirmEmail()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
            {status === "error" && <XCircle className="h-6 w-6 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Confirming Email"}
            {status === "success" && "Email Confirmed"}
            {status === "error" && "Confirmation Failed"}
          </CardTitle>
          <CardDescription>{message || "Please wait while we confirm your email address..."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status === "success" && (
            <p className="text-center text-sm text-muted-foreground">Redirecting you to the dashboard...</p>
          )}
          {status === "error" && (
            <Button asChild className="w-full">
              <Link href="/login">Go to Sign In</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
