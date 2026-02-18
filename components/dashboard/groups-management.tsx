"use client"

import { useState, useEffect } from "react"
import type { Group, User } from "@/lib/types"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Users, BookOpen, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { GroupDetail } from "@/components/dashboard/group-detail"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
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

interface GroupsManagementProps {
  isMainTeacher: boolean
  currentUserId: string
  onStatsChange?: () => void
}

export function GroupsManagement({ isMainTeacher, currentUserId, onStatsChange }: GroupsManagementProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    teacher_id: "default",
  })

  useEffect(() => {
    loadGroups()
    if (isMainTeacher) {
      loadTeachers()
    }
  }, [isMainTeacher, currentUserId])

  const loadGroups = async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from("groups")
      .select(`
        *,
        teacher:teacher_id(id, full_name, email)
      `)
    
    // If not main teacher, only load groups assigned to this teacher
    if (!isMainTeacher) {
      query = query.eq("teacher_id", currentUserId)
    }
    
    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading groups:", error)
      toast.error("Failed to load groups", {
        description: error.message || "Please try again",
      })
      setLoading(false)
      return
    }

    if (data) {
      setGroups(data)
    }
    setLoading(false)
  }

  const loadTeachers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("users").select("*").eq("role", "teacher").order("full_name")

      if (error) {
        console.error("Error loading teachers:", error)
        return
      }

      if (data) {
        setTeachers(data)
      }
    } catch (error) {
      console.error("Error loading teachers:", error)
    }
  }

  const handleCreate = async () => {
    // Validate form
    if (!formData.name.trim()) {
      toast.error("Group name is required")
      return
    }

    if (formData.name.trim().length < 3) {
      toast.error("Group name must be at least 3 characters")
      return
    }

    if (formData.description && formData.description.length > 500) {
      toast.error("Description must be less than 500 characters")
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("groups").insert({
      name: formData.name.trim(),
      description: formData.description?.trim() || null,
      teacher_id: formData.teacher_id === "default" ? null : formData.teacher_id,
      created_by: currentUserId,
    })

    if (error) {
      console.error("Error creating group:", error)
      toast.error("Failed to create group", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("Group created successfully")
    setIsCreateOpen(false)
    setFormData({ name: "", description: "", teacher_id: "default" })
    loadGroups()
    onStatsChange?.()
  }

  const handleUpdate = async () => {
    if (!editingGroup) return

    if (!formData.name.trim()) {
      toast.error("Group name is required")
      return
    }

    const supabase = createClient()
    // Teachers can only update name and description, not teacher assignment
    const updateData: { name: string; description: string; teacher_id?: string | null } = {
      name: formData.name,
      description: formData.description,
    }
    
    // Only main teachers can change teacher assignment
    if (isMainTeacher) {
      updateData.teacher_id = formData.teacher_id === "default" ? null : formData.teacher_id
    }

    const { error } = await supabase
      .from("groups")
      .update(updateData)
      .eq("id", editingGroup.id)

    if (error) {
      console.error("Error updating group:", error)
      toast.error("Failed to update group", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("Group updated successfully")
    setIsEditOpen(false)
    setEditingGroup(null)
    setFormData({ name: "", description: "", teacher_id: "default" })
    loadGroups()
    onStatsChange?.()
  }

  const handleDelete = async (groupId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("groups").delete().eq("id", groupId)

    if (error) {
      console.error("Error deleting group:", error)
      toast.error("Failed to delete group", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("Group deleted successfully")
    loadGroups()
    onStatsChange?.()
  }

  const openEdit = (group: Group) => {
    // Teachers can only edit groups assigned to them
    if (!isMainTeacher && group.teacher_id !== currentUserId) {
      return
    }
    
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || "",
      teacher_id: group.teacher_id || "default",
    })
    setIsEditOpen(true)
  }

  // If a group is selected, show group details
  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedGroup(null)}>
          ← Back to Groups
        </Button>
        <GroupDetail group={selectedGroup} teacherId={currentUserId} onUpdate={loadGroups} isMainTeacher={isMainTeacher} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{isMainTeacher ? "Groups Management" : "My Groups"}</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isMainTeacher ? "Create and manage class groups" : "Manage your assigned groups"}
          </p>
        </div>
        {isMainTeacher && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>Add a new class group to the platform</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Advanced English A1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the group"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher">Assign Teacher</Label>
                  <Select
                    value={formData.teacher_id}
                    onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                  >
                    <SelectTrigger id="teacher">
                      <SelectValue placeholder="Select a teacher (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">No teacher assigned</SelectItem> {/* Updated value prop */}
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.name}>
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">All Groups</CardTitle>
              <CardDescription className="text-sm">Manage and organize class groups</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading groups..." />
          ) : (() => {
            // Filter groups based on search query
            const filteredGroups = groups.filter(
              (group) =>
                group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (group.teacher && group.teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
            )

            // Paginate
            const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)
            const startIndex = (currentPage - 1) * itemsPerPage
            const paginatedGroups = filteredGroups.slice(startIndex, startIndex + itemsPerPage)

            return filteredGroups.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={searchQuery ? "No groups found" : "No groups yet"}
                description={searchQuery ? "Try adjusting your search query" : "Create your first group to start organizing classes"}
              />
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Group Name</TableHead>
                          <TableHead className="min-w-[200px] hidden sm:table-cell">Description</TableHead>
                          <TableHead className="min-w-[150px]">Teacher</TableHead>
                          <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedGroups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="text-muted-foreground hidden sm:table-cell">{group.description || "No description"}</TableCell>
                            <TableCell>
                              {group.teacher ? (
                                <span className="text-sm">{group.teacher.full_name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not assigned</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedGroup(group)}
                              className="mr-1 sm:mr-2"
                            >
                              <Users className="mr-1 sm:mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Manage</span>
                            </Button>
                            {/* Teachers can edit their own groups, main teachers can edit all */}
                            {isMainTeacher || group.teacher_id === currentUserId ? (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(group)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {/* Only main teachers can delete groups */}
                                {isMainTeacher && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{group.name}"? This will also delete all students, assignments, and related data. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(group.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (currentPage > 1) setCurrentPage(currentPage - 1)
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setCurrentPage(page)
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Group Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            {/* Only main teachers can reassign teachers */}
            {isMainTeacher && (
              <div className="space-y-2">
                <Label htmlFor="edit-teacher">Assign Teacher</Label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                >
                  <SelectTrigger id="edit-teacher">
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">No teacher assigned</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
