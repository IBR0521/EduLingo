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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Edit, Trash2, FileText, Video, Link as LinkIcon, Image, File, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { Badge } from "@/components/ui/badge"

interface Material {
  id: string
  title: string
  description: string | null
  material_type: string
  file_url: string | null
  external_url: string | null
  file_size: number | null
  duration_minutes: number | null
  is_required: boolean
  module_id: string | null
  lesson_id: string | null
  order_index: number
}

interface MaterialManagerProps {
  groupId: string
  moduleId?: string | null
  lessonId?: string | null
  teacherId: string
  onUpdate?: () => void
}

export function MaterialManager({ groupId, moduleId, lessonId, teacherId, onUpdate }: MaterialManagerProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    material_type: "document",
    file_url: "",
    external_url: "",
    duration_minutes: "",
    is_required: false,
  })

  useEffect(() => {
    loadMaterials()
  }, [groupId, moduleId, lessonId])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from("course_materials")
        .select("*")
        .eq("group_id", groupId)
        .order("order_index", { ascending: true })

      if (lessonId) {
        query = query.eq("lesson_id", lessonId)
      } else if (moduleId) {
        query = query.eq("module_id", moduleId).is("lesson_id", null)
      } else {
        query = query.is("module_id", null).is("lesson_id", null)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error loading materials:", error)
        return
      }

      setMaterials(data || [])
    } catch (error) {
      console.error("Error loading materials:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) return

    try {
      const supabase = createClient()
      const maxOrder = materials.length > 0 ? Math.max(...materials.map((m) => m.order_index)) : -1

      const { error } = await supabase.from("course_materials").insert({
        group_id: groupId,
        module_id: moduleId || null,
        lesson_id: lessonId || null,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        material_type: formData.material_type,
        file_url: formData.file_url?.trim() || null,
        external_url: formData.external_url?.trim() || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        is_required: formData.is_required,
        order_index: maxOrder + 1,
        created_by: teacherId,
      })

      if (!error) {
        setIsCreateOpen(false)
        setFormData({
          title: "",
          description: "",
          material_type: "document",
          file_url: "",
          external_url: "",
          duration_minutes: "",
          is_required: false,
        })
        loadMaterials()
        onUpdate?.()
      } else {
        console.error("Error creating material:", error)
      }
    } catch (error) {
      console.error("Error creating material:", error)
    }
  }

  const handleEdit = (material: Material) => {
    setEditingMaterial(material)
    setFormData({
      title: material.title,
      description: material.description || "",
      material_type: material.material_type,
      file_url: material.file_url || "",
      external_url: material.external_url || "",
      duration_minutes: material.duration_minutes?.toString() || "",
      is_required: material.is_required,
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingMaterial || !formData.title.trim()) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("course_materials")
        .update({
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          material_type: formData.material_type,
          file_url: formData.file_url?.trim() || null,
          external_url: formData.external_url?.trim() || null,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          is_required: formData.is_required,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMaterial.id)

      if (!error) {
        setIsEditOpen(false)
        setEditingMaterial(null)
        setFormData({
          title: "",
          description: "",
          material_type: "document",
          file_url: "",
          external_url: "",
          duration_minutes: "",
          is_required: false,
        })
        loadMaterials()
        onUpdate?.()
      } else {
        console.error("Error updating material:", error)
      }
    } catch (error) {
      console.error("Error updating material:", error)
    }
  }

  const handleDelete = async (materialId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("course_materials").delete().eq("id", materialId)

      if (error) {
        console.error("Error deleting material:", error)
        toast.error("Failed to delete material", {
          description: error.message || "Please try again",
        })
        return
      }

      toast.success("Material deleted successfully")
      loadMaterials()
      onUpdate?.()
    } catch (error) {
      console.error("Error deleting material:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />
      case "audio":
        return <FileText className="h-5 w-5" />
      case "link":
        return <LinkIcon className="h-5 w-5" />
      case "image":
        return <Image className="h-5 w-5" />
      case "presentation":
        return <File className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return <LoadingState message="Loading materials..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Course Materials</h3>
          <p className="text-sm text-muted-foreground">Manage learning resources for this course</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Course Material</DialogTitle>
              <DialogDescription>Add a new learning resource</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Grammar Rules PDF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the material..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material_type">Material Type</Label>
                <Select
                  value={formData.material_type}
                  onValueChange={(value) => setFormData({ ...formData, material_type: value })}
                >
                  <SelectTrigger id="material_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="link">External Link</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.material_type === "link" ? (
                <div className="space-y-2">
                  <Label htmlFor="external_url">External URL</Label>
                  <Input
                    id="external_url"
                    type="url"
                    value={formData.external_url}
                    onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="file_url">File URL</Label>
                  <Input
                    id="file_url"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="/uploads/file.pdf or full URL"
                  />
                </div>
              )}
              {(formData.material_type === "video" || formData.material_type === "audio") && (
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="60"
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="required" className="text-sm font-normal">
                  Required material (students must access)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title.trim()}>
                Add Material
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No materials yet"
          description="Add your first learning resource to help students learn"
        />
      ) : (
        <div className="grid gap-4">
          {materials.map((material) => (
            <Card key={material.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">{getMaterialIcon(material.material_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{material.title}</h4>
                        {material.is_required && (
                          <Badge variant="default" className="text-xs">
                            Required
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {material.material_type}
                        </Badge>
                      </div>
                      {material.description && (
                        <p className="text-sm text-muted-foreground mb-2">{material.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {material.duration_minutes && (
                          <span>Duration: {material.duration_minutes} min</span>
                        )}
                        {material.file_size && <span>Size: {formatFileSize(material.file_size)}</span>}
                      </div>
                      <div className="flex gap-2 mt-3">
                        {material.external_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={material.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Link
                            </a>
                          </Button>
                        )}
                        {material.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="mr-2 h-4 w-4" />
                              View File
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(material)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Material</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this material? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(material.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>Update material information</DialogDescription>
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-material_type">Material Type</Label>
              <Select
                value={formData.material_type}
                onValueChange={(value) => setFormData({ ...formData, material_type: value })}
              >
                <SelectTrigger id="edit-material_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.material_type === "link" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-external_url">External URL</Label>
                <Input
                  id="edit-external_url"
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-file_url">File URL</Label>
                <Input
                  id="edit-file_url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                />
              </div>
            )}
            {(formData.material_type === "video" || formData.material_type === "audio") && (
              <div className="space-y-2">
                <Label htmlFor="edit-duration_minutes">Duration (minutes)</Label>
                <Input
                  id="edit-duration_minutes"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-required" className="text-sm font-normal">
                Required
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.title.trim()}>
              Update Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}




