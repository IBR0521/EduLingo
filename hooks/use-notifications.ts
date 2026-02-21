"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/lib/types"

export function useNotifications(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!userId) return

    loadUnreadCount()
    setupRealtimeSubscription()

    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId])

  const loadUnreadCount = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("notifications")
      .select("id, is_read")
      .eq("user_id", userId)
      .eq("is_read", false)

    if (!error && data) {
      setUnreadCount(data.length)
    }
  }

  const setupRealtimeSubscription = () => {
    const supabase = createClient()

    const channel = supabase
      .channel(`notifications-count:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Reload count when notifications change
          loadUnreadCount()
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  return { unreadCount, notifications }
}






