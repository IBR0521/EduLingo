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
import { Plus, Edit, Trash2, GripVertical, BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"

interface Module {
  id: string
  title: string
  description: string | null
  order_index: number
  is_published: boolean
}

interface ModuleManagerProps {
  groupId: string
  teacherId: string
}

export function ModuleManager({ groupId, teacherId }: ModuleManagerProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_published: false,
  })

  useEffect(() => {
    loadModules()
  }, [groupId])

  const loadModules = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("group_id", groupId)
        .order("order_index", { ascending: true })

      if (error) {
        console.error("Error loading modules:", error)
        toast.error("Failed to load modules", {
          description: error.message || "Please try again",
        })
        setLoading(false)
        return
      }

      setModules(data || [])
    } catch (error) {
      console.error("Error loading modules:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) return

    try {
      const supabase = createClient()
      const maxOrder = modules.length > 0 ? Math.max(...modules.map((m) => m.order_index)) : -1

      const { error } = await supabase.from("course_modules").insert({
        group_id: groupId,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        order_index: maxOrder + 1,
        is_published: formData.is_published,
        created_by: teacherId,
      })

      if (error) {
        console.error("Error creating module:", error)
        toast.error("Failed to create module", {
          description: error.message || "Please try again",
        })
        return
      }

      toast.success("Module created successfully")
      setIsCreateOpen(false)
      setFormData({ title: "", description: "", is_published: false })
      loadModules()
    } catch (error) {
      console.error("Error creating module:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleEdit = (module: Module) => {
    setEditingModule(module)
    setFormData({
      title: module.title,
      description: module.description || "",
      is_published: module.is_published,
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingModule || !formData.title.trim()) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("course_modules")
        .update({
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          is_published: formData.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingModule.id)

      if (error) {
        console.error("Error updating module:", error)
        toast.error("Failed to update module", {
          description: error.message || "Please try again",
        })
        return
      }

      toast.success("Module updated successfully")
      setIsEditOpen(false)
      setEditingModule(null)
      setFormData({ title: "", description: "", is_published: false })
      loadModules()
    } catch (error) {
      console.error("Error updating module:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleDelete = async (moduleId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("course_modules").delete().eq("id", moduleId)

      if (error) {
        console.error("Error deleting module:", error)
        toast.error("Failed to delete module", {
          description: error.message || "Please try again",
        })
        return
      }

      toast.success("Module deleted successfully")
      loadModules()
    } catch (error) {
      console.error("Error deleting module:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  if (loading) {
    return <LoadingState message="Loading modules..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Course Modules</h3>
          <p className="text-sm text-muted-foreground">Organize your course into structured modules</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Module</DialogTitle>
              <DialogDescription>Add a new module to organize course content</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Module Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Introduction to Grammar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what students will learn..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="published" className="text-sm font-normal">
                  Publish immediately (visible to students)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title.trim()}>
                Create Module
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {modules.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No modules yet"
          description="Create your first module to start organizing course content"
        />
      ) : (
        <div className="grid gap-4">
          {modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>{module.title}</CardTitle>
                      {module.is_published ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Published
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Draft
                        </span>
                      )}
                    </div>
                    {module.description && (
                      <CardDescription className="mt-2">{module.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(module)}>
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
                          <AlertDialogTitle>Delete Module</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this module? All lessons and materials will also be deleted. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(module.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>Update module information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Module Title</Label>
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-published" className="text-sm font-normal">
                Published
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.title.trim()}>
              Update Module
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}




