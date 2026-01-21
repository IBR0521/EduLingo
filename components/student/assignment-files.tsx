"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Upload, Download, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { toast } from "sonner"
import { uploadFileToStorage, deleteFileFromStorage } from "@/lib/storage"
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

interface AssignmentFilesProps {
  assignmentId: string
  studentId: string
}

interface FileRecord {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
  uploaded_by: string
}

export function AssignmentFiles({ assignmentId, studentId }: AssignmentFilesProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [assignmentId])

  const loadFiles = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading files:", error)
      toast.error("Failed to load files", {
        description: error.message || "Please try again",
      })
      return
    }

    if (data) {
      setFiles(data)
    }
  }

  const handleFileUpload = async () => {
    if (!uploadFile) {
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
      const storagePath = `assignment-${assignmentId}/`
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
        uploaded_by: studentId,
        assignment_id: assignmentId,
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
      loadFiles()
    } catch (error) {
      console.error("Unexpected error uploading file:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    const supabase = createClient()

    // First, get file record to get storage path
    const { data: fileRecord, error: fetchError } = await supabase
      .from("files")
      .select("storage_path, storage_provider")
      .eq("id", fileId)
      .eq("uploaded_by", studentId)
      .single()

    if (fetchError || !fileRecord) {
      console.error("Error fetching file record:", fetchError)
      toast.error("Failed to find file record")
      return
    }

    // Delete from database
    const { error } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId)
      .eq("uploaded_by", studentId)

    if (error) {
      console.error("Error deleting file record:", error)
      toast.error("Failed to delete file record", {
        description: error.message || "Please try again",
      })
      return
    }

    // Delete from storage if it's in Supabase Storage
    if (fileRecord.storage_provider === "supabase" && fileRecord.storage_path) {
      const deleteResult = await deleteFileFromStorage("assignments", fileRecord.storage_path)
      if (!deleteResult.success) {
        console.warn("Failed to delete file from storage:", deleteResult.error)
        // Don't show error to user since database record is already deleted
      }
    }

    toast.success("File deleted successfully")
    loadFiles()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const myFiles = files.filter((f) => f.uploaded_by === studentId)
  const teacherFiles = files.filter((f) => f.uploaded_by !== studentId)

  return (
    <div className="space-y-4">
      {teacherFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assignment Materials</CardTitle>
            <CardDescription>Files provided by your teacher</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teacherFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {format(new Date(file.created_at), "PP")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (file.file_url) {
                        // If it's a Supabase Storage file, get signed URL
                        if (file.storage_provider === "supabase" && file.storage_path) {
                          try {
                            const { getSignedUrl } = await import("@/lib/storage")
                            const result = await getSignedUrl("assignments", file.storage_path)
                            if (result.url) {
                              window.open(result.url, "_blank")
                            } else {
                              window.open(file.file_url, "_blank")
                            }
                          } catch (error) {
                            console.error("Error getting signed URL:", error)
                            window.open(file.file_url, "_blank")
                          }
                        } else {
                          window.open(file.file_url, "_blank")
                        }
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">My Submissions</CardTitle>
              <CardDescription>Files you've uploaded for this assignment</CardDescription>
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Assignment</DialogTitle>
                  <DialogDescription>Upload your completed assignment file</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentFile">Select File</Label>
                    <Input id="studentFile" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
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
                    {uploading ? "Uploading..." : "Submit File"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {myFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {format(new Date(file.created_at), "PP")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (file.file_url) {
                          // If it's a Supabase Storage file, get signed URL
                          if (file.storage_provider === "supabase" && file.storage_path) {
                            try {
                              const { getSignedUrl } = await import("@/lib/storage")
                              const result = await getSignedUrl("assignments", file.storage_path)
                              if (result.url) {
                                window.open(result.url, "_blank")
                              } else {
                                // Fallback to public URL
                                window.open(file.file_url, "_blank")
                              }
                            } catch (error) {
                              console.error("Error getting signed URL:", error)
                              // Fallback to public URL
                              window.open(file.file_url, "_blank")
                            }
                          } else {
                            // Direct URL
                            window.open(file.file_url, "_blank")
                          }
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete File</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{file.file_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(file.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
