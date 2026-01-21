"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useRef } from "react"

/**
 * Hook to keep user session alive by refreshing it periodically
 * This ensures users never get logged out automatically
 */
export function useSessionRefresh() {
  const isMountedRef = useRef(true)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const supabase = createClient()

    // Refresh session every 30 minutes to keep it alive
    const refreshInterval = setInterval(async () => {
      // Check if component is still mounted before making async calls
      if (!isMountedRef.current || typeof document === 'undefined') return
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && isMountedRef.current) {
          // Refresh the session to extend expiration
          await supabase.auth.refreshSession()
        }
      } catch (error) {
        // Silently fail - don't interrupt user experience
        if (process.env.NODE_ENV === "development") {
          console.error("Session refresh error:", error)
        }
      }
    }, 30 * 60 * 1000) // Every 30 minutes

    // Also refresh on page visibility change (when user comes back to tab)
    const handleVisibilityChange = async () => {
      // Check if component is still mounted and document is available
      if (!isMountedRef.current || typeof document === 'undefined') return
      
      if (document.visibilityState === "visible") {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session && isMountedRef.current) {
            await supabase.auth.refreshSession()
          }
        } catch (error) {
          // Silently fail
        }
      }
    }

    // Only add listener if document exists
    let listenerAdded = false
    if (typeof document !== 'undefined') {
      try {
        document.addEventListener("visibilitychange", handleVisibilityChange)
        listenerAdded = true
      } catch (error) {
        // Silently fail if we can't add listener
      }
    }

    // Cleanup
    return () => {
      isMountedRef.current = false
      
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      
      // Safely remove event listener only if it was added
      if (listenerAdded && typeof document !== 'undefined') {
        try {
          document.removeEventListener("visibilitychange", handleVisibilityChange)
        } catch (error) {
          // Silently fail if document is already being torn down
          // This prevents "removeChild" errors during navigation
        }
      }
    }
  }, [])
}


