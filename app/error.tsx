"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Suppress "Auth session missing" errors - they're expected for unauthenticated requests
  if (
    error?.message === "Auth session missing!" ||
    error?.name === "AuthSessionMissingError" ||
    error?.message?.includes("Auth session missing")
  ) {
    // Silently handle this error - it's expected for unauthenticated users
    return null
  }
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  const isConnectionError = 
    error.message?.includes("Supabase") ||
    error.message?.includes("connection") ||
    error.message?.includes("fetch") ||
    error.message?.includes("network")

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {isConnectionError
              ? "Unable to connect to the database. Please check your connection settings."
              : "An unexpected error occurred. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-mono text-xs">{error.message}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/"} className="flex-1">
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}







