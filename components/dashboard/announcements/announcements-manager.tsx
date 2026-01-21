"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Pin, PinOff, Megaphone, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { toast } from "sonner"
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
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"

interface Announcement {
  id: string
  title: string
  content: string
  is_pinned: boolean
  created_by: string
  created_at: string
  updated_at: string
  creator?: {
    full_name: string
  }
  view_count?: number
}

interface AnnouncementsManagerProps {
  groupId: string
  teacherId: string
  isStudentView?: boolean
  studentId?: string
}

export function AnnouncementsManager({
  groupId,
  teacherId,
  isStudentView = false,
  studentId,
}: AnnouncementsManagerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_pinned: false,
  })

  useEffect(() => {
    loadAnnouncements()
  }, [groupId, isStudentView, studentId])

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Load announcements - use simple query first
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("group_id", groupId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading announcements:", error)
        toast.error("Failed to load announcements", {
          description: error.message || "Please try again",
        })
        setLoading(false)
        return
      }

      // If we have data, enrich with creator names
      let enrichedData = data || []
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map((a) => a.created_by).filter(Boolean))]
        
        if (creatorIds.length > 0) {
          const { data: creators, error: creatorsError } = await supabase
            .from("users")
            .select("id, full_name")
            .in("id", creatorIds)

          if (!creatorsError && creators) {
            const creatorsMap = new Map(creators.map((c) => [c.id, c.full_name]))

            enrichedData = data.map((announcement) => ({
              ...announcement,
              creator: {
                full_name: creatorsMap.get(announcement.created_by) || "Unknown",
              },
            }))
          } else {
            // If creator lookup fails, still show announcements without creator info
            enrichedData = data.map((announcement) => ({
              ...announcement,
              creator: {
                full_name: "Unknown",
              },
            }))
          }
        }
      }

      // If student view, mark as viewed and get view counts
      if (isStudentView && studentId && enrichedData.length > 0) {
        const announcementIds = enrichedData.map((a) => a.id)
        
        try {
          const { data: views } = await supabase
            .from("announcement_views")
            .select("announcement_id")
            .eq("user_id", studentId)
            .in("announcement_id", announcementIds)

          const viewedIds = new Set(views?.map((v) => v.announcement_id) || [])

          // Mark announcements as viewed
          const unviewedIds = announcementIds.filter((id) => !viewedIds.has(id))
          if (unviewedIds.length > 0) {
            const { error: insertError } = await supabase.from("announcement_views").insert(
              unviewedIds.map((id) => ({
                announcement_id: id,
                user_id: studentId,
              }))
            )
            
            if (insertError) {
              console.warn("Error marking announcements as viewed:", insertError)
            }
          }

          // Get view counts
          const { data: viewCounts } = await supabase
            .from("announcement_views")
            .select("announcement_id")
            .in("announcement_id", announcementIds)

          const countsMap = new Map<string, number>()
          viewCounts?.forEach((vc) => {
            countsMap.set(vc.announcement_id, (countsMap.get(vc.announcement_id) || 0) + 1)
          })

          enrichedData = enrichedData.map((announcement) => ({
            ...announcement,
            view_count: countsMap.get(announcement.id) || 0,
          }))
        } catch (viewError) {
          console.warn("Error loading view data:", viewError)
          // Continue with announcements even if view data fails
        }
      }

      setAnnouncements(enrichedData)
    } catch (error) {
      console.error("Error loading announcements:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return

    try {
      const supabase = createClient()

      const { data, error } = await supabase.from("announcements").insert({
        group_id: groupId,
        title: formData.title.trim(),
        content: formData.content.trim(),
        is_pinned: formData.is_pinned,
        created_by: teacherId,
      })

      if (!error) {
        // Create notifications for all students in the group
        const { data: groupStudents } = await supabase
          .from("group_students")
          .select("student_id")
          .eq("group_id", groupId)

        if (groupStudents && groupStudents.length > 0) {
          const notifications = groupStudents.map((gs) => ({
            user_id: gs.student_id,
            title: "New Announcement",
            message: formData.title,
            type: "announcement",
            priority: formData.is_pinned ? "high" : "normal",
            category: "announcement",
            action_url: `/dashboard/student?group=${groupId}`,
          }))

          const { data: insertedNotifications } = await supabase.from("notifications").insert(notifications).select()

          // Send push notifications to all students
          if (insertedNotifications) {
            for (const notification of insertedNotifications) {
              try {
                await fetch("/api/push/send", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_id: notification.user_id,
                    title: notification.title,
                    message: notification.message,
                    action_url: notification.action_url,
                    priority: notification.priority || "normal",
                  }),
                })
              } catch (pushError) {
                console.error("Failed to send push notification:", pushError)
                // Continue with other notifications even if one fails
              }
            }
          }
        }

        setIsCreateOpen(false)
        setFormData({ title: "", content: "", is_pinned: false })
        loadAnnouncements()
      } else {
        console.error("Error creating announcement:", error)
      }
    } catch (error) {
      console.error("Error creating announcement:", error)
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned,
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingAnnouncement || !formData.title.trim() || !formData.content.trim()) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("announcements")
        .update({
          title: formData.title.trim(),
          content: formData.content.trim(),
          is_pinned: formData.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingAnnouncement.id)

      if (!error) {
        setIsEditOpen(false)
        setEditingAnnouncement(null)
        setFormData({ title: "", content: "", is_pinned: false })
        loadAnnouncements()
      } else {
        console.error("Error updating announcement:", error)
      }
    } catch (error) {
      console.error("Error updating announcement:", error)
    }
  }

  const handleDelete = async (announcementId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("announcements").delete().eq("id", announcementId)

      if (error) {
        console.error("Error deleting announcement:", error)
        toast.error("Failed to delete announcement", {
          description: error.message || "Please try again",
        })
        return
      }

      toast.success("Announcement deleted successfully")
      loadAnnouncements()
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleTogglePin = async (announcementId: string, currentPinStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("announcements")
        .update({ is_pinned: !currentPinStatus })
        .eq("id", announcementId)

      if (!error) {
        loadAnnouncements()
      }
    } catch (error) {
      console.error("Error toggling pin:", error)
    }
  }

  if (loading) {
    return <LoadingState message="Loading announcements..." />
  }

  return (
    <div className="space-y-4">
      {!isStudentView && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Announcements</h3>
            <p className="text-sm text-muted-foreground">Share important updates with your class</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>Share an update with all students in this group</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Important: Assignment Due Date Changed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your announcement here..."
                    rows={6}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="pinned" className="text-sm font-normal">
                    Pin to top (keep announcement visible at the top)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.title.trim() || !formData.content.trim()}>
                  Post Announcement
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-12 w-12" />}
          title="No announcements yet"
          description={
            isStudentView
              ? "Your teacher hasn't posted any announcements yet"
              : "Create your first announcement to share updates with students"
          }
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className={announcement.is_pinned ? "border-primary bg-primary/5" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {announcement.is_pinned && (
                        <Badge variant="default" className="gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                      <CardTitle>{announcement.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(announcement.created_at), "PPp")}
                      </div>
                      {announcement.creator && (
                        <span>By {announcement.creator.full_name}</span>
                      )}
                      {!isStudentView && announcement.view_count !== undefined && (
                        <span>{announcement.view_count} views</span>
                      )}
                    </div>
                  </div>
                  {!isStudentView && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePin(announcement.id, announcement.is_pinned)}
                      >
                        {announcement.is_pinned ? (
                          <PinOff className="h-4 w-4" />
                        ) : (
                          <Pin className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(announcement)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(announcement.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">{announcement.content}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update announcement content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-pinned"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-pinned" className="text-sm font-normal">
                Pin to top
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.title.trim() || !formData.content.trim()}>
              Update Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}




