"use client"

import { toast } from "sonner"

/**
 * Hook for consistent toast notifications
 */
export function useToastNotification() {
  const showSuccess = (message: string) => {
    toast.success(message)
  }

  const showError = (message: string) => {
    toast.error(message)
  }

  const showInfo = (message: string) => {
    toast.info(message)
  }

  const showWarning = (message: string) => {
    toast.warning(message)
  }

  const showLoading = (message: string) => {
    return toast.loading(message)
  }

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
  }
}

