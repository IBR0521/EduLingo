"use client"

import { useState, useEffect } from "react"
import type { User, Group } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { UserCog, Plus, Edit, CheckCircle2, Clock, DollarSign } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface TeachersManagementProps {
  onStatsChange?: () => void
  isMainTeacher?: boolean
}

export function TeachersManagement({ onStatsChange, isMainTeacher = true }: TeachersManagementProps) {
  const [teachers, setTeachers] = useState<User[]>([])
  const [teacherGroups, setTeacherGroups] = useState<Record<string, Group[]>>({})
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [addFormData, setAddFormData] = useState({
    email: "",
    phone_number: "",
  })

  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    age: "",
    ielts_score: "",
    etk: "",
    salary_amount: "",
  })

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    const supabase = createClient()
    const { data: teachersData } = await supabase.from("users").select("*").eq("role", "teacher").order("full_name")

    if (teachersData) {
      setTeachers(teachersData)

      // Load groups for each teacher
      const groupsMap: Record<string, Group[]> = {}
      for (const teacher of teachersData) {
        const { data: groups } = await supabase.from("groups").select("*").eq("teacher_id", teacher.id)
        groupsMap[teacher.id] = groups || []
      }
      setTeacherGroups(groupsMap)
    }
  }

  const handleAddTeacher = async () => {
    if (!addFormData.email || !addFormData.phone_number) {
      toast({
        title: "Error",
        description: "Email and phone number are required",
        variant: "destructive",
      })
      return
    }

    // Format phone number
    let formattedPhone = addFormData.phone_number.trim().replace(/[\s\-\(\)]/g, "")
    if (formattedPhone.startsWith("9") && formattedPhone.length === 9) {
      formattedPhone = `+998${formattedPhone}`
    } else if (formattedPhone.startsWith("998") && formattedPhone.length === 12) {
      formattedPhone = `+${formattedPhone}`
    } else if (!formattedPhone.startsWith("+998")) {
      formattedPhone = `+998${formattedPhone}`
    }

    const supabase = createClient()

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", addFormData.email)
      .single()

    if (existingUser) {
      toast({
        title: "Error",
        description: "A user with this email already exists",
        variant: "destructive",
      })
      return
    }

    // Create pending teacher entry (similar to pending students)
    const { error } = await supabase.from("pending_teachers").insert({
      email: addFormData.email,
      phone_number: formattedPhone,
    })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add teacher: " + error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Teacher added. They will complete registration when they log in.",
      })
      setIsAddOpen(false)
      setAddFormData({ email: "", phone_number: "" })
      loadTeachers()
      if (onStatsChange) onStatsChange()
    }
  }

  const handleEditTeacher = (teacher: User) => {
    setEditingTeacher(teacher)
    setEditFormData({
      full_name: teacher.full_name,
      email: teacher.email,
      phone_number: teacher.phone_number || "",
      age: teacher.age?.toString() || "",
      ielts_score: teacher.ielts_score?.toString() || "",
      etk: teacher.etk || "",
      salary_amount: teacher.salary_amount?.toString() || "",
    })
    setIsEditOpen(true)
  }

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return

    const supabase = createClient()

    // Format phone number
    let formattedPhone = editFormData.phone_number.trim().replace(/[\s\-\(\)]/g, "")
    if (formattedPhone.startsWith("9") && formattedPhone.length === 9) {
      formattedPhone = `+998${formattedPhone}`
    } else if (formattedPhone.startsWith("998") && formattedPhone.length === 12) {
      formattedPhone = `+${formattedPhone}`
    } else if (!formattedPhone.startsWith("+998")) {
      formattedPhone = `+998${formattedPhone}`
    }

    const updateData: any = {
      full_name: editFormData.full_name,
      email: editFormData.email,
      phone_number: formattedPhone,
      ielts_score: editFormData.ielts_score ? parseFloat(editFormData.ielts_score) : null,
      etk: editFormData.etk || null,
    }

    // Only include age if the column exists (will be added by SQL script)
    // If column doesn't exist, Supabase will ignore unknown fields in some cases,
    // but to be safe, we'll try without it first if there's an error
    if (editFormData.age) {
      updateData.age = parseInt(editFormData.age)
    }

    // Only main teacher can edit salary amounts
    if (isMainTeacher) {
      updateData.salary_amount = editFormData.salary_amount ? parseFloat(editFormData.salary_amount) : null
      
      // If salary amount is set and teacher doesn't have employment_start_date, set it
      if (updateData.salary_amount && !editingTeacher.employment_start_date) {
        updateData.employment_start_date = new Date().toISOString().split('T')[0]
      }
    }

    let { error } = await supabase.from("users").update(updateData).eq("id", editingTeacher.id)

    // If error is about missing 'age' column, try without it
    if (error && error.message?.includes("age") && error.message?.includes("column")) {
      console.warn("age column not found, updating without it")
      const updateDataWithoutAge = { ...updateData }
      delete updateDataWithoutAge.age
      const retryResult = await supabase.from("users").update(updateDataWithoutAge).eq("id", editingTeacher.id)
      error = retryResult.error
      
      if (!error) {
        toast({
          title: "Warning",
          description: "Teacher updated, but 'age' column is missing. Please run FIX_NOW.sql in Supabase SQL Editor.",
          variant: "default",
        })
        setIsEditOpen(false)
        setEditingTeacher(null)
        loadTeachers()
        if (onStatsChange) onStatsChange()
        return
      }
    }

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update teacher: " + (error.message || "Unknown error") + ". Please run FIX_NOW.sql in Supabase SQL Editor.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Teacher updated successfully",
      })
      setIsEditOpen(false)
      setEditingTeacher(null)
      loadTeachers()
      if (onStatsChange) onStatsChange()
    }
  }

  // Check if salary is due for a teacher
  const isSalaryDue = (teacher: User) => {
    if (teacher.salary_status === "paid") {
      return false // Already paid, button should not appear
    }

    if (!teacher.employment_start_date && !teacher.last_salary_date) {
      return false // No start date set
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDay = today.getDate()

    // Determine salary day based on last_salary_date or employment_start_date
    let salaryDay: number
    let referenceDate: Date | null = null

    if (teacher.last_salary_date) {
      referenceDate = new Date(teacher.last_salary_date)
      referenceDate.setHours(0, 0, 0, 0)
      salaryDay = referenceDate.getDate()
    } else if (teacher.employment_start_date) {
      referenceDate = new Date(teacher.employment_start_date)
      referenceDate.setHours(0, 0, 0, 0)
      salaryDay = referenceDate.getDate()
    } else {
      return false
    }

    // Check if payment is overdue
    let isOverdue = false
    if (teacher.salary_due_date) {
      const dueDate = new Date(teacher.salary_due_date)
      dueDate.setHours(0, 0, 0, 0)
      isOverdue = dueDate < today
    }

    if (isOverdue || teacher.salary_status === "overdue") {
      return true
    }

    // Payment is due if today is the salary day
    if (todayDay === salaryDay) {
      // Also check if it's been at least a month since reference date
      if (referenceDate) {
        const monthsSinceReference =
          (today.getFullYear() - referenceDate.getFullYear()) * 12 + (today.getMonth() - referenceDate.getMonth())
        return monthsSinceReference >= 1
      }
      return true
    }

    return false
  }

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teachers Management</h2>
          <p className="text-muted-foreground">View and manage teachers, their details, and salaries</p>
        </div>
        {isMainTeacher && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Teacher
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Teacher</DialogTitle>
              <DialogDescription>Enter teacher email and phone number. Teacher will complete registration when they log in.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input
                  id="add-phone"
                  type="tel"
                  placeholder="+998901234567 or 901234567"
                  value={addFormData.phone_number}
                  onChange={(e) => setAddFormData({ ...addFormData, phone_number: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Format: +998XXXXXXXXX or 9XXXXXXXXX</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTeacher}>Add Teacher</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search teachers by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>Teacher information, group assignments, and salary status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>IELTS / ETK</TableHead>
                <TableHead>Salary Status</TableHead>
                <TableHead>Assigned Groups</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {searchTerm ? "No teachers found" : "No teachers registered yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => {
                  const groups = teacherGroups[teacher.id] || []
                  const salaryDue = isSalaryDue(teacher)
                  return (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                          {teacher.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                      <TableCell className="text-muted-foreground">{teacher.phone_number || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {teacher.ielts_score && (
                            <div className="text-sm">IELTS: {teacher.ielts_score}</div>
                          )}
                          {teacher.etk && <div className="text-xs text-muted-foreground">{teacher.etk}</div>}
                          {!teacher.ielts_score && !teacher.etk && <span className="text-sm text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {teacher.salary_amount ? (
                            <>
                              <div className="text-sm font-medium">{teacher.salary_amount.toLocaleString()} UZS</div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    teacher.salary_status === "paid"
                                      ? "default"
                                      : teacher.salary_status === "overdue"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {teacher.salary_status || "pending"}
                                </Badge>
                                {salaryDue && (
                                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                    <Clock className="mr-1 h-3 w-3" />
                                    Salary Due
                                  </Badge>
                                )}
                              </div>
                              {teacher.salary_due_date && (
                                <p className="text-xs text-muted-foreground">
                                  Due: {new Date(teacher.salary_due_date).toLocaleDateString()}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not set</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {groups.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {groups.map((group) => (
                              <Badge key={group.id} variant="secondary">
                                {group.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No groups assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isMainTeacher && (
                            <Button variant="ghost" size="sm" onClick={() => handleEditTeacher(teacher)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          )}
                          {/* Show "Mark Salary Received" button when salary is due - only for main teacher */}
                          {isMainTeacher && salaryDue && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={async () => {
                                const supabase = createClient()
                                const today = new Date().toISOString().split('T')[0]

                                // Calculate next salary due date
                                let nextDueDate = new Date()
                                if (teacher.last_salary_date) {
                                  const lastSalary = new Date(teacher.last_salary_date)
                                  const dayOfMonth = lastSalary.getDate()
                                  nextDueDate.setDate(dayOfMonth)
                                  if (nextDueDate <= new Date()) {
                                    nextDueDate.setMonth(nextDueDate.getMonth() + 1)
                                  }
                                } else if (teacher.employment_start_date) {
                                  const employmentStart = new Date(teacher.employment_start_date)
                                  const dayOfMonth = employmentStart.getDate()
                                  nextDueDate.setDate(dayOfMonth)
                                  if (nextDueDate <= new Date()) {
                                    nextDueDate.setMonth(nextDueDate.getMonth() + 1)
                                  }
                                } else {
                                  nextDueDate.setMonth(nextDueDate.getMonth() + 1)
                                }
                                const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

                                const { error } = await supabase
                                  .from("users")
                                  .update({
                                    salary_status: "paid",
                                    last_salary_date: today,
                                    salary_due_date: nextDueDateStr,
                                  })
                                  .eq("id", teacher.id)

                                if (error) {
                                  toast.error("Failed to mark salary as received", {
                                    description: error.message || "Please try again",
                                  })
                                } else {
                                  toast.success("Salary marked as received", {
                                    description: `Next salary due: ${nextDueDate.toLocaleDateString()}`,
                                  })
                                  loadTeachers()
                                  if (onStatsChange) onStatsChange()
                                }
                              }}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark Salary Received
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>Update teacher information and salary details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-fullName"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editFormData.phone_number}
                onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-age">Age</Label>
                <Input
                  id="edit-age"
                  type="number"
                  value={editFormData.age}
                  onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                  min="18"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ielts">IELTS Score</Label>
                <Input
                  id="edit-ielts"
                  type="number"
                  value={editFormData.ielts_score}
                  onChange={(e) => setEditFormData({ ...editFormData, ielts_score: e.target.value })}
                  min="0"
                  max="9"
                  step="0.5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-etk">ETK (English Teaching Knowledge)</Label>
              <Input
                id="edit-etk"
                value={editFormData.etk}
                onChange={(e) => setEditFormData({ ...editFormData, etk: e.target.value })}
                placeholder="e.g., TEFL, TESOL, CELTA"
              />
            </div>
            {isMainTeacher && (
              <div className="space-y-2">
                <Label htmlFor="edit-salary">Monthly Salary Amount (UZS) <span className="text-destructive">*</span></Label>
                <Input
                  id="edit-salary"
                  type="number"
                  value={editFormData.salary_amount}
                  onChange={(e) => setEditFormData({ ...editFormData, salary_amount: e.target.value })}
                  placeholder="e.g., 5000000"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-muted-foreground">Set the monthly salary amount for this teacher. Only main teacher can edit salary amounts.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeacher}>Update Teacher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
