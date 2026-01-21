"use client"

import { useState, useEffect } from "react"
import type { User } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Users, Copy, Check, Plus, Edit, CheckCircle2, DollarSign, Clock } from "lucide-react"
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

interface StudentsManagementProps {
  onStatsChange?: () => void
  isMainTeacher?: boolean
}

interface StudentPaymentInfo {
  group_id: string
  group_name: string
  monthly_payment_amount: number
  payment_due_date: string
  last_payment_date: string | null
  payment_status: string
  course_start_date: string
}

export function StudentsManagement({ onStatsChange, isMainTeacher = false }: StudentsManagementProps) {
  const [students, setStudents] = useState<User[]>([])
  const [studentAccessCodes, setStudentAccessCodes] = useState<Record<string, string>>({})
  const [studentPayments, setStudentPayments] = useState<Record<string, StudentPaymentInfo[]>>({})
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<User | null>(null)
  const [editingStudentGroups, setEditingStudentGroups] = useState<Array<{ id: string; name: string; payment_amount: number | null }>>([])

  // Add student form
  const [addFormData, setAddFormData] = useState({
    email: "",
    phone_number: "",
  })

  // Edit student form
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    age: "",
    english_level: "",
    certificate_type: "" as "IELTS" | "CEFR" | "",
  })

  // Payment amounts for each group (for editing)
  const [groupPaymentAmounts, setGroupPaymentAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    const supabase = createClient()
    
    // Load registered students
    const { data: studentsData, error: studentsError } = await supabase
      .from("users")
      .select("*")
      .eq("role", "student")
      .order("full_name")

    if (studentsError) {
      console.error("Error loading students:", studentsError)
      toast.error("Failed to load students", {
        description: studentsError.message || "Please try again",
      })
    }

    // Load pending students (added by main teacher but not yet registered)
    const { data: pendingStudents, error: pendingError } = await supabase
      .from("pending_students")
      .select("*")
      .order("created_at", { ascending: false })

    if (pendingError) {
      // Properly serialize error for logging
      const errorObj = pendingError as any
      const errorDetails = {
        message: errorObj.message || pendingError.message || String(pendingError) || "",
        code: errorObj.code || "",
        details: errorObj.details || "",
        hint: errorObj.hint || "",
        status: errorObj.status || errorObj.statusCode || "",
        name: errorObj.name || pendingError.name || "",
      }
      console.error("Error loading pending students:", errorDetails)
      // Don't show toast for pending students errors - it's not critical
      // The UI will just show registered students only
    }

    // Combine registered students with pending students (as User objects for display)
    const allStudents: User[] = []
    
    if (studentsData) {
      allStudents.push(...studentsData)
    }
    
    if (pendingStudents) {
      // Convert pending students to User-like objects for display
      // Use a prefix to identify pending students
      const pendingAsUsers = pendingStudents.map((p: any) => ({
        id: `pending_${p.id}`, // Prefix to identify as pending
        email: p.email,
        full_name: "Pending Registration",
        role: "student" as const,
        phone_number: p.phone_number,
        has_phone: true,
        created_at: p.created_at,
        updated_at: p.created_at,
        _isPending: true, // Internal flag
        _pendingId: p.id, // Store actual pending_students ID
      }))
      allStudents.push(...pendingAsUsers)
    }

    setStudents(allStudents)

    // Load access codes for registered students only
    const codesMap: Record<string, string> = {}
    if (studentsData) {
      for (const student of studentsData) {
        const { data: accessData } = await supabase
          .from("parent_student")
          .select("access_code")
          .eq("student_id", student.id)
          .single()
        if (accessData) {
          codesMap[student.id] = accessData.access_code
        }
      }
    }
    setStudentAccessCodes(codesMap)

    // Load payment information for all students
    if (studentsData && studentsData.length > 0) {
      const paymentsMap: Record<string, StudentPaymentInfo[]> = {}
      
      for (const student of studentsData) {
        const { data: groupStudents } = await supabase
          .from("group_students")
          .select(`
            *,
            group:group_id(id, name)
          `)
          .eq("student_id", student.id)
          .not("monthly_payment_amount", "is", null)

        if (groupStudents) {
          paymentsMap[student.id] = groupStudents.map((gs: any) => ({
            group_id: gs.group_id,
            group_name: gs.group?.name || "Unknown Group",
            monthly_payment_amount: gs.monthly_payment_amount,
            payment_due_date: gs.payment_due_date,
            last_payment_date: gs.last_payment_date,
            payment_status: gs.payment_status || "pending",
            course_start_date: gs.course_start_date,
          }))
        }
      }
      
      setStudentPayments(paymentsMap)
    }
  }

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddStudent = async () => {
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

    // Get current user ID for the API
    const supabaseClient = createClient()
    const { data: { user: authUser } } = await supabaseClient.auth.getUser()

    // Call API to create student
    try {
      const response = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": authUser?.id || "",
        },
        body: JSON.stringify({
          email: addFormData.email,
          phone_number: formattedPhone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to create student",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Student added successfully. They will complete registration when they log in.",
      })

      setIsAddOpen(false)
      setAddFormData({ email: "", phone_number: "" })
      loadStudents()
      if (onStatsChange) onStatsChange()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "destructive",
      })
    }
  }

  const handleEditStudent = async (student: User) => {
    // Check if student is pending
    const isPending = (student as any)._isPending || student.id.startsWith("pending_")
    
    setEditingStudent(student)
    setEditFormData({
      full_name: student.full_name || "",
      email: student.email,
      phone_number: student.phone_number || "",
      age: student.age?.toString() || "",
      english_level: student.english_level || "",
      certificate_type: (student.certificate_type as "IELTS" | "CEFR") || "",
    })

    // Load payment amounts and group names for this student's groups
    if (!isPending && student.id && !student.id.startsWith("pending_")) {
      const supabase = createClient()
      const { data: groupStudents } = await supabase
        .from("group_students")
        .select(`
          group_id,
          monthly_payment_amount,
          group:group_id(id, name)
        `)
        .eq("student_id", student.id)

      if (groupStudents) {
        const paymentMap: Record<string, string> = {}
        const groupsList: Array<{ id: string; name: string; payment_amount: number | null }> = []
        
        groupStudents.forEach((gs: any) => {
          const groupId = gs.group_id
          const groupName = gs.group?.name || "Unknown Group"
          const paymentAmount = gs.monthly_payment_amount || null
          
          paymentMap[groupId] = paymentAmount ? paymentAmount.toString() : ""
          groupsList.push({
            id: groupId,
            name: groupName,
            payment_amount: paymentAmount,
          })
        })
        
        setGroupPaymentAmounts(paymentMap)
        setEditingStudentGroups(groupsList)
      } else {
        setGroupPaymentAmounts({})
        setEditingStudentGroups([])
      }
    } else {
      setGroupPaymentAmounts({})
      setEditingStudentGroups([])
    }

    setIsEditOpen(true)
  }

  const handleMarkPaymentReceived = async (studentId: string, groupId: string, courseStartDate?: string, lastPaymentDate?: string) => {
    if (!isMainTeacher) {
      toast.error("Access Denied", {
        description: "Only main teacher can mark payments as received",
      })
      return
    }

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    
    // Calculate next payment due date based on course_start_date or last_payment_date
    // Use the same day of month for next payment
    let nextDueDate = new Date()
    if (lastPaymentDate) {
      // If student has paid before, use last payment date day
      const lastPayment = new Date(lastPaymentDate)
      const dayOfMonth = lastPayment.getDate()
      nextDueDate.setDate(dayOfMonth)
      if (nextDueDate <= new Date()) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1)
      }
    } else if (courseStartDate) {
      // Use course start date day
      const courseStart = new Date(courseStartDate)
      const dayOfMonth = courseStart.getDate()
      nextDueDate.setDate(dayOfMonth)
      if (nextDueDate <= new Date()) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1)
      }
    } else {
      // Fallback: next month same day
      nextDueDate.setMonth(nextDueDate.getMonth() + 1)
    }
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

    const { error } = await supabase
      .from("group_students")
      .update({
        payment_status: "paid",
        last_payment_date: today,
        payment_due_date: nextDueDateStr,
      })
      .eq("student_id", studentId)
      .eq("group_id", groupId)

    if (error) {
      toast.error("Failed to mark payment as received", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("Payment marked as received", {
      description: `Next payment due: ${nextDueDate.toLocaleDateString()}`,
    })
    loadStudents()
    if (onStatsChange) onStatsChange()
  }

  // Check if payment is due for a student
  // Payment is due when:
  // 1. It's been a month since last payment (or course start date)
  // 2. Today is the payment day (same day of month as course_start_date or last_payment_date)
  // 3. Payment is overdue
  const isPaymentDue = (payment: StudentPaymentInfo) => {
    if (payment.payment_status === "paid") {
      return false // Already paid, button should not appear
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day
    const todayDay = today.getDate()
    
    // Determine payment day based on last_payment_date or course_start_date
    let paymentDay: number
    let referenceDate: Date | null = null
    
    if (payment.last_payment_date) {
      referenceDate = new Date(payment.last_payment_date)
      referenceDate.setHours(0, 0, 0, 0)
      paymentDay = referenceDate.getDate()
    } else if (payment.course_start_date) {
      referenceDate = new Date(payment.course_start_date)
      referenceDate.setHours(0, 0, 0, 0)
      paymentDay = referenceDate.getDate()
    } else {
      return false // No payment day set
    }

    // Check if payment is overdue
    let isOverdue = false
    if (payment.payment_due_date) {
      const dueDate = new Date(payment.payment_due_date)
      dueDate.setHours(0, 0, 0, 0)
      isOverdue = dueDate < today
    }

    // Payment is due if:
    // 1. Today is the payment day (same day of month as reference date)
    // 2. Payment is overdue
    // 3. It's been at least a month since the reference date
    if (isOverdue || payment.payment_status === "overdue") {
      return true
    }

    // Check if today is the payment day
    if (todayDay === paymentDay) {
      // Also check if it's been at least a month since reference date
      if (referenceDate) {
        const monthsSinceReference = (today.getFullYear() - referenceDate.getFullYear()) * 12 + 
                                     (today.getMonth() - referenceDate.getMonth())
        return monthsSinceReference >= 1
      }
      return true
    }

    return false
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return

    if (!isMainTeacher) {
      toast({
        title: "Access Denied",
        description: "Only main teacher can edit student details",
        variant: "destructive",
      })
      return
    }

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

    // Check if student is pending
    const isPending = (editingStudent as any)._isPending || editingStudent.id.startsWith("pending_")
    const pendingId = (editingStudent as any)._pendingId || editingStudent.id.replace("pending_", "")
    
    if (isPending) {
      // Update pending_students table
      const { error } = await supabase
        .from("pending_students")
        .update({
          email: editFormData.email,
          phone_number: formattedPhone,
        })
        .eq("id", pendingId) // Use pending_students ID

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update pending student: " + error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Pending student updated successfully",
        })
        setIsEditOpen(false)
        setEditingStudent(null)
        loadStudents()
        if (onStatsChange) onStatsChange()
      }
    } else {
      // Update users table for registered students
      const updateData: any = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        phone_number: formattedPhone || null,
        has_phone: !!formattedPhone,
      }
      
      // Add student-specific fields if they exist
      if (editFormData.age) {
        updateData.age = parseInt(editFormData.age)
      }
      if (editFormData.english_level) {
        updateData.english_level = editFormData.english_level
      }
      if (editFormData.certificate_type) {
        updateData.certificate_type = editFormData.certificate_type
      }
      
      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", editingStudent.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update student: " + error.message,
          variant: "destructive",
        })
      } else {
        // Update payment amounts for each group (single batch operation)
        if (isMainTeacher && Object.keys(groupPaymentAmounts).length > 0) {
          const updates = Object.entries(groupPaymentAmounts).map(([groupId, paymentAmount]) => {
            const amount = paymentAmount?.trim() ? parseFloat(paymentAmount) : null
            return supabase
              .from("group_students")
              .update({ monthly_payment_amount: amount })
              .eq("student_id", editingStudent.id)
              .eq("group_id", groupId)
          })
          await Promise.all(updates)
        }

        toast({
          title: "Success",
          description: "Student updated successfully",
        })
        setIsEditOpen(false)
        setEditingStudent(null)
        setGroupPaymentAmounts({})
        setEditingStudentGroups([])
        loadStudents()
        if (onStatsChange) onStatsChange()
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Students Management</h2>
          <p className="text-muted-foreground">View students and their parent access codes</p>
        </div>
        {isMainTeacher && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>
                  Enter student email and phone number. Student will complete registration when they log in.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="add-email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="student@example.com"
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
                  <p className="text-xs text-muted-foreground">
                    Format: +998XXXXXXXXX or 9XXXXXXXXX
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStudent}>Add Student</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search students by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>Student information and parent linking codes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Parent Access Code</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {searchTerm ? "No students found" : "No students registered yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const accessCode = studentAccessCodes[student.id]
                  const isPending = student.full_name === "Pending Registration"
                  const payments = studentPayments[student.id] || []
                  const hasPayments = payments.length > 0
                  
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {student.full_name}
                          {isPending && (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.phone_number || "-"}
                      </TableCell>
                      <TableCell>
                        {hasPayments ? (
                          <div className="space-y-1">
                            {payments.map((payment) => (
                              <div key={payment.group_id} className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{payment.group_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {payment.monthly_payment_amount.toLocaleString()} UZS
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge
                                      variant={
                                        payment.payment_status === "paid"
                                          ? "default"
                                          : payment.payment_status === "overdue"
                                            ? "destructive"
                                            : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {payment.payment_status}
                                    </Badge>
                                    {isMainTeacher && payment.payment_status !== "paid" && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs"
                                          >
                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                            Mark Paid
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Mark Payment as Received</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to mark this payment as received? This will set the payment status to 'paid' and calculate the next due date.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleMarkPaymentReceived(student.id, payment.group_id)}
                                            >
                                              Mark Paid
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No payments</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {accessCode ? (
                          <Badge variant="outline" className="font-mono">
                            {accessCode}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">No code</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isMainTeacher && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStudent(student)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              {/* Show "Mark Payment Received" button when payment is due */}
                              {hasPayments && payments.some(p => isPaymentDue(p) && p.payment_status !== "paid") && (
                                payments
                                  .filter(p => isPaymentDue(p) && p.payment_status !== "paid")
                                  .map((payment) => (
                                    <Button
                                      key={payment.group_id}
                                      variant="default"
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleMarkPaymentReceived(
                                        student.id,
                                        payment.group_id,
                                        payment.course_start_date,
                                        payment.last_payment_date || undefined
                                      )}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Mark Payment Received
                                    </Button>
                                  ))
                              )}
                            </>
                          )}
                          {accessCode && (
                            <Button variant="ghost" size="sm" onClick={() => copyAccessCode(accessCode)}>
                              {copiedCode === accessCode ? (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Code
                                </>
                              )}
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

      {/* Edit Student Dialog */}
      {isMainTeacher && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update student information</DialogDescription>
            </DialogHeader>
            {editingStudent && (
              <div className="space-y-4">
                {!((editingStudent as any)._isPending || editingStudent.id.startsWith("pending_")) && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        value={editFormData.full_name}
                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        placeholder="Student full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-age">Age</Label>
                      <Input
                        id="edit-age"
                        type="number"
                        min="5"
                        max="100"
                        value={editFormData.age}
                        onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                        placeholder="Student age"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-level">English Level</Label>
                      <Input
                        id="edit-level"
                        value={editFormData.english_level}
                        onChange={(e) => setEditFormData({ ...editFormData, english_level: e.target.value })}
                        placeholder="e.g., Beginner, Intermediate, Advanced"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-certificate">Certificate Type</Label>
                      <Select
                        value={editFormData.certificate_type}
                        onValueChange={(value) => setEditFormData({ ...editFormData, certificate_type: value as "IELTS" | "CEFR" })}
                      >
                        <SelectTrigger id="edit-certificate">
                          <SelectValue placeholder="Select certificate type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IELTS">IELTS</SelectItem>
                          <SelectItem value="CEFR">CEFR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    placeholder="+998901234567 or 901234567"
                    value={editFormData.phone_number}
                    onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: +998XXXXXXXXX or 9XXXXXXXXX
                  </p>
                </div>

                {/* Payment amounts for each group - only for main teacher */}
                {isMainTeacher && !((editingStudent as any)._isPending || editingStudent.id.startsWith("pending_")) && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label className="text-base font-semibold">Monthly Payment Amounts by Group</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Set or update monthly payment amounts for each group this student is enrolled in
                      </p>
                    </div>
                    {editingStudentGroups.length > 0 ? (
                      editingStudentGroups.map((group) => (
                        <div key={group.id} className="space-y-2">
                          <Label htmlFor={`payment-${group.id}`}>
                            {group.name} <span className="text-muted-foreground text-xs">(UZS)</span>
                          </Label>
                          <Input
                            id={`payment-${group.id}`}
                            type="number"
                            placeholder="e.g., 500000"
                            value={groupPaymentAmounts[group.id] || ""}
                            onChange={(e) => {
                              setGroupPaymentAmounts({
                                ...groupPaymentAmounts,
                                [group.id]: e.target.value,
                              })
                            }}
                            min="0"
                            step="1000"
                          />
                          {group.payment_amount && (
                            <p className="text-xs text-muted-foreground">
                              Current: {group.payment_amount.toLocaleString()} UZS
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">
                        This student is not enrolled in any groups yet. Add them to a group first to set payment amounts.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStudent}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
