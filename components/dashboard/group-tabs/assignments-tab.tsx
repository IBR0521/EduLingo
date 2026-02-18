"use client"

import { useState, useEffect } from "react"
import type { Assignment } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ClipboardList, Trash2, FileText, Upload, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"
import { handleDatabaseError } from "@/lib/error-handler"
import { SkeletonTable } from "@/components/ui/skeleton-loader"
import { uploadFileToStorage, deleteFileFromStorage } from "@/lib/storage"
import { sendPushNotification } from "@/lib/send-push-notification"

interface AssignmentsTabProps {
  groupId: string
  teacherId: string
}

interface FileRecord {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
}

export function AssignmentsTab({ groupId, teacherId }: AssignmentsTabProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
  })
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [assignmentFiles, setAssignmentFiles] = useState<Record<string, FileRecord[]>>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    loadAssignments()
  }, [groupId])

  const loadAssignments = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data, error: dbError } = await supabase
        .from("assignments")
        .select("*")
        .eq("group_id", groupId)
        .order("due_date", { ascending: true })

      if (dbError) {
        const errorInfo = handleDatabaseError(dbError, "Failed to load assignments")
        setError(errorInfo.message)
        toast.error(errorInfo.message)
        setLoading(false)
        return
      }

      if (data) {
        setAssignments(data)
        // Load files for each assignment
        data.forEach((assignment) => {
          loadAssignmentFiles(assignment.id)
        })
      }
    } catch (error) {
      const errorInfo = handleDatabaseError(error, "Failed to load assignments")
      setError(errorInfo.message)
      toast.error(errorInfo.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAssignmentFiles = async (assignmentId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading assignment files:", error)
      return
    }

    if (data) {
      setAssignmentFiles((prev) => ({ ...prev, [assignmentId]: data }))
    }
  }

  const handleCreate = async () => {
    // Validate form
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      toast.error("Assignment title must be at least 3 characters")
      return
    }

    if (formData.title.length > 255) {
      toast.error("Assignment title is too long (max 255 characters)")
      return
    }

    if (formData.description && formData.description.length > 2000) {
      toast.error("Description is too long (max 2000 characters)")
      return
    }

    try {
      const supabase = createClient()
      const { data: newAssignment, error } = await supabase
        .from("assignments")
        .insert({
          group_id: groupId,
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          created_by: teacherId,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating assignment:", error)
        toast.error("Failed to create assignment", {
          description: error.message || "Please try again",
        })
        return
      }

      // Get all students in the group
      const { data: groupStudents, error: studentsError } = await supabase
        .from("group_students")
        .select("student_id")
        .eq("group_id", groupId)

      if (studentsError) {
        console.error("Error fetching group students:", studentsError)
        // Don't block assignment creation if we can't get students
      } else if (groupStudents && groupStudents.length > 0) {
        // Create notifications for all students in the group
        const dueDateText = formData.due_date
          ? format(new Date(formData.due_date), "PPp")
          : "No due date"
        
        const notifications = groupStudents.map((gs) => ({
          user_id: gs.student_id,
          title: "New Assignment",
          message: `${formData.title.trim()}${formData.due_date ? ` - Due: ${dueDateText}` : ""}`,
          type: "assignment",
          priority: "high",
          category: "assignment",
          action_url: `/dashboard/student?group=${groupId}`,
        }))

        // Insert notifications (silent failure - don't block assignment creation)
        supabase
          .from("notifications")
          .insert(notifications)
          .then(() => {
            console.log(`✅ Created ${notifications.length} notifications for students`)
          })
          .catch((notifError) => {
            console.error("Error creating notifications:", notifError)
            // Silent failure - assignment was created successfully
          })

        // Send push notifications to all students (silent failure)
        groupStudents.forEach((gs) => {
          sendPushNotification(
            gs.student_id,
            "New Assignment",
            formData.title.trim(),
            `/dashboard/student?group=${groupId}`,
            "high"
          ).catch((pushError) => {
            // Silent failure - don't block assignment creation
            console.error(`Error sending push notification to ${gs.student_id}:`, pushError)
          })
        })
      }

      toast.success("Assignment created successfully", {
        description: groupStudents && groupStudents.length > 0
          ? `All ${groupStudents.length} students have been notified`
          : undefined,
      })
      setIsCreateOpen(false)
      setFormData({ title: "", description: "", due_date: "" })
      loadAssignments()
    } catch (error) {
      console.error("Unexpected error creating assignment:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleDelete = async (assignmentId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("assignments").delete().eq("id", assignmentId)

    if (error) {
      console.error("Error deleting assignment:", error)
      toast.error("Failed to delete assignment", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("Assignment deleted successfully")
    loadAssignments()
  }

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedAssignment) {
      toast.error("Please select a file to upload")
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (uploadFile.size > maxSize) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB",
      })
      return
    }

    setUploading(true)
    const supabase = createClient()

    try {
      // Upload to Supabase Storage
      const storagePath = `assignment-${selectedAssignment.id}/`
      const uploadResult = await uploadFileToStorage(uploadFile, "assignments", storagePath)

      if (uploadResult.error || !uploadResult.url) {
        toast.error("Failed to upload file", {
          description: uploadResult.error || "Please try again",
        })
        setUploading(false)
        return
      }

      // Save file record to database
      const { error } = await supabase.from("files").insert({
        uploaded_by: teacherId,
        assignment_id: selectedAssignment.id,
        file_name: uploadFile.name,
        file_url: uploadResult.url,
        file_type: uploadFile.type,
        file_size: uploadFile.size,
        storage_provider: "supabase",
        storage_path: uploadResult.path,
      })

      if (error) {
        console.error("Error saving file record:", error)
        // Try to delete uploaded file from storage if database insert fails
        await deleteFileFromStorage("assignments", uploadResult.path)
        toast.error("Failed to save file record", {
          description: error.message || "Please try again",
        })
        setUploading(false)
        return
      }

      toast.success("File uploaded successfully")
      setIsUploadOpen(false)
      setUploadFile(null)
      setSelectedAssignment(null)
      loadAssignmentFiles(selectedAssignment.id)
    } catch (error) {
      console.error("Unexpected error uploading file:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  // Track if component is mounted to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate || !isMounted) return false
    return new Date(dueDate) < new Date()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">Assignments & Homework</CardTitle>
            <CardDescription className="text-sm">Manage assignments for this group</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>Add homework or assignment for students</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Assignment Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Essay on Environmental Issues"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Assignment details and requirements"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.title}>
                  Create Assignment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 border border-destructive bg-destructive/10 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {loading ? (
          <SkeletonTable />
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Create your first assignment for this group"
          />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Title</TableHead>
                    <TableHead className="min-w-[200px] hidden md:table-cell">Description</TableHead>
                    <TableHead className="min-w-[150px]">Due Date</TableHead>
                    <TableHead className="min-w-[100px]">Files</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const files = assignmentFiles[assignment.id] || []
                return (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.title}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {assignment.description || "No description"}
                    </TableCell>
                    <TableCell>
                      {assignment.due_date ? format(new Date(assignment.due_date), "PPp") : "No due date"}
                    </TableCell>
                    <TableCell>
                      {files.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{files.length} file(s)</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No files</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.due_date && isOverdue(assignment.due_date) ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setIsUploadOpen(true)
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{assignment.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(assignment.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Show files for each assignment */}
        {assignments.map((assignment) => {
          const files = assignmentFiles[assignment.id] || []
          if (files.length === 0) return null
          return (
            <div key={`files-${assignment.id}`} className="mt-6 p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Files for: {assignment.title}</h4>
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} • {format(new Date(file.created_at), "PP")}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>Upload materials for: {selectedAssignment?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input id="file" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
              {uploadFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={!uploadFile || uploading}>
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
