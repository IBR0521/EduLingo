/**
 * Centralized error handling utilities
 */

export interface ErrorInfo {
  message: string
  code?: string
  details?: string
  hint?: string
}

/**
 * Extract user-friendly error message from Supabase error
 */
export function getErrorMessage(error: any): string {
  if (!error) return "An unknown error occurred"

  // Supabase errors
  if (error.message) {
    // Ignore "Auth session missing" errors as they're expected for unauthenticated requests
    if (error.message === "Auth session missing!" || error.name === "AuthSessionMissingError") {
      return ""
    }
    return error.message
  }

  // Network errors
  if (error.name === "TypeError" && error.message?.includes("fetch")) {
    return "Network error. Please check your connection and try again."
  }

  // Generic error
  if (typeof error === "string") {
    return error
  }

  return "An unexpected error occurred. Please try again."
}

/**
 * Check if error should be logged
 */
export function shouldLogError(error: any): boolean {
  if (!error) return false
  
  // Don't log "Auth session missing" errors
  if (error.message === "Auth session missing!" || error.name === "AuthSessionMissingError") {
    return false
  }

  return true
}

/**
 * Handle database query error
 */
export function handleDatabaseError(error: any, defaultMessage: string = "Failed to load data"): ErrorInfo {
  const message = getErrorMessage(error)
  
  if (shouldLogError(error)) {
    console.error("Database error:", error)
  }

  return {
    message: message || defaultMessage,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  }
}

