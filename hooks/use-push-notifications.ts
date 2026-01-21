"use client"

import { useState, useEffect } from "react"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  checkPushPermission,
  isPushSupported,
} from "@/lib/push-notifications"
import { toast } from "sonner"

export function usePushNotifications(userId: string) {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const checkSupport = async () => {
      setIsSupported(isPushSupported())
      
      if (isPushSupported()) {
        const currentPermission = await checkPushPermission()
        setPermission(currentPermission)

        // Check if already subscribed
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          setIsSubscribed(!!subscription)
        } catch (error) {
          console.error("Error checking subscription:", error)
        }
      }
      
      setIsLoading(false)
    }

    checkSupport()
  }, [userId])

  const subscribe = async () => {
    if (!isSupported) {
      // Silently fail if not supported
      return false
    }

    setIsLoading(true)
    try {
      const subscription = await subscribeToPushNotifications(userId)
      if (subscription) {
        setIsSubscribed(true)
        setPermission("granted")
        // Don't show toast for auto-subscribe
        return true
      } else {
        // Silently fail - permission might be denied or not granted
        return false
      }
    } catch (error: any) {
      console.log("Push notification subscription skipped:", error?.message || "Unknown error")
      // Silently fail - don't show errors for auto-subscribe
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      const success = await unsubscribeFromPushNotifications(userId)
      if (success) {
        setIsSubscribed(false)
        toast.success("Push notifications disabled")
        return true
      } else {
        toast.error("Failed to disable push notifications")
        return false
      }
    } catch (error) {
      console.error("Error unsubscribing from push:", error)
      toast.error("Failed to disable push notifications")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  }
}

