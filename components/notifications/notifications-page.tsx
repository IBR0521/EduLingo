"use client"

import { useState, useEffect, useRef } from "react"
import type { User, Notification } from "@/lib/types"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { toast } from "sonner"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton-loader"

interface NotificationsPageProps {
  user: User
}

export function NotificationsPage({ user }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const channelRef = useRef<any>(null)
  const { subscribe } = usePushNotifications(user.id)

  useEffect(() => {
    loadNotifications()
    setupRealtimeSubscription()
    
    // Automatically subscribe to push notifications
    const autoSubscribe = async () => {
      try {
        await subscribe()
      } catch (error) {
        // Silently fail - user might have denied permission or it's not supported
        console.log("Auto-subscribe to push notifications skipped:", error)
      }
    }
    autoSubscribe()

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const loadNotifications = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      
      // Check if user.id is valid
      if (!user?.id) {
        console.error("Invalid user ID:", user)
        setNotifications([])
        setLoading(false)
        return
      }

      const { data, error: dbError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (dbError) {
        const errorInfo = handleDatabaseError(dbError, "Failed to load notifications")
        setError(errorInfo.message)
        toast.error(errorInfo.message)
        setNotifications([])
        setLoading(false)
        return
      }

      setNotifications(data || [])
    } catch (err: any) {
      const errorInfo = handleDatabaseError(err, "Failed to load notifications")
      setError(errorInfo.message)
      toast.error("Failed to load notifications", {
        description: errorInfo.message || err?.message || "Network error. Please check your connection and refresh the page.",
      })
      setNotifications([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const supabase = createClient()

    // Subscribe to notifications table changes for this user
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            // New notification received
            const newNotification = payload.new as Notification
            setNotifications((prev) => [newNotification, ...prev])
            
            // Show toast notification
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
            })
          } else if (payload.eventType === "UPDATE") {
            // Notification updated (e.g., marked as read)
            const updatedNotification = payload.new as Notification
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            )
          } else if (payload.eventType === "DELETE") {
            // Notification deleted
            const deletedId = payload.old.id
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  const handleMarkAsRead = async (notificationId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark as read", {
        description: error.message || "Please try again",
      })
      return
    }

    // Update local state (realtime will also update it, but this is immediate)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
  }

  const handleMarkAllAsRead = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking all as read:", error)
      toast.error("Failed to mark all as read", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("All notifications marked as read")
    // Update local state
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleDelete = async (notificationId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("Notification deleted")
    // Update local state (realtime will also update it)
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const filteredNotifications = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return "💬"
      case "grade":
        return "📊"
      case "assignment":
        return "📝"
      case "attendance":
        return "📅"
      default:
        return "🔔"
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <Skeleton variant="text" className="h-8 w-64 mb-2" />
            <Skeleton variant="text" className="h-4 w-96" />
          </div>
          <SkeletonCard />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Stay updated with important information</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline" className="flex-1 sm:flex-initial">
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg sm:text-xl">All Notifications</CardTitle>
                {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")} className="flex-1 sm:flex-initial">
                  All
                </Button>
                <Button
                  variant={filter === "unread" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("unread")}
                  className="flex-1 sm:flex-initial"
                >
                  Unread
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
                description={filter === "unread" ? "All caught up!" : "You'll see notifications here when you receive them"}
              />
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      !notification.is_read ? "bg-muted/50 border-primary" : "bg-card"
                    }`}
                  >
                    <div className="text-2xl mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${!notification.is_read ? "font-bold" : ""}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(notification.created_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{notification.message}</p>
                      <div className="flex items-center gap-1 sm:gap-2 pt-2 flex-wrap">
                        {!notification.is_read && (
                          <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(notification.id)} className="text-xs">
                            <Check className="mr-1 h-3 w-3" />
                            <span className="hidden sm:inline">Mark as read</span>
                            <span className="sm:hidden">Read</span>
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-xs">
                              <Trash2 className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(notification.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
