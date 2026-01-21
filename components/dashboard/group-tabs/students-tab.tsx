"use client"

import { useState, useEffect } from "react"
import type { User } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Search, CheckCircle2, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { toast as sonnerToast } from "sonner"

interface StudentsTabProps {
  groupId: string
  students: User[]
  onUpdate: () => void
  isMainTeacher?: boolean
}

interface GroupStudentWithPayment {
  id: string
  group_id: string
  student_id: string
  enrolled_at: string
  monthly_payment_amount?: number
  payment_due_date?: string
  last_payment_date?: string
  payment_status?: string
  course_start_date?: string
}

export function StudentsTab({ groupId, students, onUpdate, isMainTeacher = false }: StudentsTabProps) {
  const { toast } = useToast()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<User[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [monthlyPaymentAmount, setMonthlyPaymentAmount] = useState("")
  const [studentPayments, setStudentPayments] = useState<Record<string, GroupStudentWithPayment>>({})

  useEffect(() => {
    loadStudentPayments()
  }, [groupId, students])

  const loadStudentPayments = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("group_students")
        .select("*")
        .eq("group_id", groupId)

      if (error) {
        console.error("Error loading student payments:", error)
        sonnerToast.error("Failed to load payment data", {
          description: error.message || "Please try again",
        })
        return
      }

      if (data) {
        const paymentsMap: Record<string, GroupStudentWithPayment> = {}
        data.forEach((gs: any) => {
          paymentsMap[gs.student_id] = {
            id: gs.id,
            group_id: gs.group_id,
            student_id: gs.student_id,
            enrolled_at: gs.enrolled_at,
            monthly_payment_amount: gs.monthly_payment_amount,
            payment_due_date: gs.payment_due_date,
            last_payment_date: gs.last_payment_date,
            payment_status: gs.payment_status || (gs.monthly_payment_amount ? "pending" : null),
            course_start_date: gs.course_start_date,
          }
        })
        setStudentPayments(paymentsMap)
      }
    } catch (err) {
      console.error("Unexpected error loading student payments:", err)
      sonnerToast.error("Failed to load payment data", {
        description: "An unexpected error occurred. Please try again.",
      })
    }
  }

  const loadAvailableStudents = async () => {
    const supabase = createClient()
    const { data: allStudents } = await supabase.from("users").select("*").eq("role", "student")

    if (allStudents) {
      // Filter out students already in this group
      const studentIds = new Set(students.map((s) => s.id))
      const available = allStudents.filter((s) => !studentIds.has(s.id))
      setAvailableStudents(available)
    }
  }

  const handleAddStudent = async () => {
    try {
      if (!isMainTeacher) {
        toast({
          title: "Permission Denied",
          description: "Only main teacher can add students to groups.",
          variant: "destructive",
        })
        return
      }
      
      if (!selectedStudentId) {
        toast({
          title: "Error",
          description: "Please select a student to add.",
          variant: "destructive",
        })
        return
      }

      // Check if student is already in this group
      const isAlreadyInGroup = students.some(s => s.id === selectedStudentId)
      if (isAlreadyInGroup) {
        toast({
          title: "Student Already in Group",
          description: "This student is already enrolled in this group.",
          variant: "default",
        })
        return
      }

      const supabase = createClient()
      if (!supabase) {
        toast({
          title: "Error",
          description: "Failed to connect to database. Please refresh the page.",
          variant: "destructive",
        })
        return
      }
      
      const paymentAmount = monthlyPaymentAmount ? parseFloat(monthlyPaymentAmount) : null
      
      // Validate payment amount if provided
      if (monthlyPaymentAmount && (isNaN(paymentAmount!) || paymentAmount! <= 0)) {
        toast({
          title: "Invalid Payment Amount",
          description: "Please enter a valid payment amount greater than 0.",
          variant: "destructive",
        })
        return
      }
    
      // Prepare data for single insert operation
      // Start with required fields only
      const insertData: any = {
        group_id: groupId,
        student_id: selectedStudentId,
      }

      // Add optional fields only if columns exist (will be handled by error detection)
      // We'll try to add course_start_date, but if it fails, we'll handle it gracefully
      const today = new Date()
      const courseStartDate = today.toISOString().split('T')[0]
      insertData.course_start_date = courseStartDate

      // Add payment fields only if amount is provided
      if (paymentAmount && paymentAmount > 0) {
        const paymentDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of current month
        const dueDateStr = paymentDueDate.toISOString().split('T')[0]
        insertData.monthly_payment_amount = paymentAmount
        insertData.payment_due_date = dueDateStr
        insertData.payment_status = "pending"
      }

      // Single database operation
      const { data: insertedData, error } = await supabase
        .from("group_students")
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // Extract error properties directly (Supabase errors may not serialize properly)
        const errorObj = error as any
        const errorMsg = errorObj.message || error.message || String(error) || ""
        const errorCode = errorObj.code || ""
        const errorDetails = errorObj.details || ""
        const errorHint = errorObj.hint || ""
        const errorStatus = errorObj.status || errorObj.statusCode || errorObj.status_code || ""
        
        // Build serialized error object with all available properties
        const serializedError = {
          message: errorMsg,
          code: errorCode,
          details: errorDetails,
          hint: errorHint,
          status: errorStatus,
          // Try to get additional properties
          name: errorObj.name || error.name || "",
          stack: errorObj.stack || "",
          // Log the raw error object properties
          rawError: {
            keys: Object.keys(errorObj),
            hasMessage: !!errorMsg,
            hasCode: !!errorCode,
            errorType: typeof error,
            errorString: String(error),
          },
        }
        
        // Always log the error with all available information
        console.error("Full error details:", {
          ...serializedError,
          originalError: error,
        })
        
        // Check for duplicate key error (most common)
        const isDuplicate = errorCode === "23505" ||
                           errorMsg.toLowerCase().includes("duplicate key") ||
                           errorMsg.toLowerCase().includes("unique constraint") ||
                           errorMsg.toLowerCase().includes("already exists")
        
        // VERY SPECIFIC check for missing column errors ONLY
        // Check for schema cache errors (Supabase specific)
        const isSchemaCacheError = errorMsg.includes("schema cache") ||
                                  errorMsg.includes("Could not find") ||
                                  errorMsg.includes("column of") ||
                                  errorMsg.includes("in the schema cache")
        
        // Check for PostgreSQL undefined_column errors
        const isPostgresMissingColumn = (
          errorCode === "42703" && // PostgreSQL undefined_column error code
          (
            errorMsg.includes("does not exist") ||
            errorDetails.includes("monthly_payment_amount") ||
            errorDetails.includes("payment_due_date") ||
            errorDetails.includes("course_start_date") ||
            errorDetails.includes("payment_status")
          )
        )
        
        // Check for column name in error message
        const isColumnInError = (
          errorMsg.includes("column") &&
          errorMsg.includes("does not exist") &&
          (
            errorMsg.includes("monthly_payment_amount") ||
            errorMsg.includes("payment_due_date") ||
            errorMsg.includes("course_start_date") ||
            errorMsg.includes("payment_status")
          )
        )
        
        const isMissingColumn = isSchemaCacheError || isPostgresMissingColumn || isColumnInError
        
        // Check for RLS policy errors
        const isRLSError = errorStatus === 406 ||
                          errorCode === "42501" ||
                          errorMsg.includes("row-level security") ||
                          errorMsg.includes("new row violates row-level security") ||
                          errorMsg.includes("permission denied") ||
                          errorHint?.includes("RLS")

        if (isDuplicate) {
          toast({
            title: "Student Already in Group",
            description: "This student is already enrolled in this group.",
            variant: "default",
          })
        } else if (isMissingColumn) {
          // Check if it's specifically course_start_date
          const isCourseStartDateError = errorMsg.includes("course_start_date")
          
          toast({
            title: "Database Schema Issue",
            description: isCourseStartDateError 
              ? "The 'course_start_date' column is missing. Please run QUICK_FIX_COURSE_START_DATE.sql in Supabase SQL Editor, or run DEFINITIVE_FIX.sql for all payment columns."
              : "Payment columns are missing. Please run DEFINITIVE_FIX.sql in Supabase SQL Editor to enable payment features.",
            variant: "destructive",
            duration: 12000,
          })
          console.error("Database schema error:", serializedError)
          console.error("QUICK FIX: Run QUICK_FIX_COURSE_START_DATE.sql in Supabase SQL Editor")
        } else if (isRLSError) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to add students to this group. Please check your role and group assignments.",
            variant: "destructive",
            duration: 8000,
          })
          console.error("RLS policy error:", serializedError)
        } else {
          // Generic error - show actual error message
          // Build a comprehensive error message
          let displayMessage = errorMsg
          if (!displayMessage && errorCode) {
            displayMessage = `Error code: ${errorCode}`
          }
          if (!displayMessage && errorDetails) {
            displayMessage = errorDetails
          }
          if (!displayMessage && errorHint) {
            displayMessage = errorHint
          }
          if (!displayMessage) {
            displayMessage = "Failed to add student. Please check the browser console for details."
          }
          
          toast({
            title: "Error Adding Student",
            description: displayMessage,
            variant: "destructive",
            duration: 8000,
          })
          
          // Always log full error details for debugging
          console.error("Error adding student - Full details:", serializedError)
          console.error("Error adding student - Raw error object:", error)
        }
        return
      }

      // Success
      setIsAddOpen(false)
      setSelectedStudentId("")
      setMonthlyPaymentAmount("")
      
      toast({
        title: "Student Added",
        description: paymentAmount && paymentAmount > 0 
          ? "Student added with payment information." 
          : "Student added successfully.",
        variant: "default",
      })

      // Reload data
      loadStudentPayments()
      onUpdate()
    } catch (err: any) {
      console.error("Unexpected error:", err)
      toast({
        title: "Error",
        description: err?.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleMarkPaymentReceived = async (studentId: string) => {
    if (!isMainTeacher) {
      toast({
        title: "Permission Denied",
        description: "Only main teacher can mark payments as received.",
        variant: "destructive",
      })
      return
    }

    const payment = studentPayments[studentId]
    if (!payment) {
      toast({
        title: "Error",
        description: "No payment information found for this student.",
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const nextDueDate = new Date(today.getFullYear(), today.getMonth() + 2, 0) // Last day of next month
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

    const { error } = await supabase
      .from("group_students")
      .update({
        payment_status: "paid",
        last_payment_date: todayStr,
        payment_due_date: nextDueDateStr,
      })
      .eq("student_id", studentId)
      .eq("group_id", groupId)

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark payment as received.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Payment marked as received.",
      })
      loadStudentPayments()
      onUpdate()
    }
  }

  const handleRemoveStudent = async (studentId: string) => {
    if (!isMainTeacher) {
      toast({
        title: "Permission Denied",
        description: "Only main teacher can remove students from groups.",
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("group_students")
      .delete()
      .eq("group_id", groupId)
      .eq("student_id", studentId)

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove student.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Student removed from group.",
      })
      onUpdate()
    }
  }

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Students in Group</CardTitle>
            <CardDescription>Manage students enrolled in this group</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadStudentPayments()
                onUpdate()
              }}
              title="Refresh payment data"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {isMainTeacher && (
          <Dialog
            open={isAddOpen}
            onOpenChange={(open) => {
              setIsAddOpen(open)
              if (open) loadAvailableStudents()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student to Group</DialogTitle>
                <DialogDescription>Select a student to enroll in this group</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No available students</div>
                      ) : (
                        availableStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.full_name} ({student.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentAmount">Monthly Payment Amount (UZS)</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        placeholder="e.g., 500000"
                        value={monthlyPaymentAmount}
                        onChange={(e) => setMonthlyPaymentAmount(e.target.value)}
                        min="0"
                        step="1000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional. Set the monthly payment amount for this student in this group. Only main teacher can set payment amounts.
                      </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStudent} disabled={!selectedStudentId}>
                  Add Student
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Email</TableHead>
                <TableHead>Monthly Payment</TableHead>
                <TableHead>Payment Status</TableHead>
                {isMainTeacher && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                  <TableCell colSpan={isMainTeacher ? 5 : 4} className="text-center text-muted-foreground">
                  {searchTerm ? "No students found" : "No students in this group"}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => {
                const payment = studentPayments[student.id]
                const paymentAmount = payment?.monthly_payment_amount
                const paymentStatus = payment?.payment_status || null
                const dueDate = payment?.payment_due_date
                
                return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{student.email}</TableCell>
                    <TableCell>
                      {paymentAmount ? (
                        <span className="font-medium">{paymentAmount.toLocaleString()} UZS</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {paymentStatus ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                              paymentStatus === "overdue" ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            }`}>
                              {paymentStatus}
                            </span>
                            {isMainTeacher && paymentStatus !== "paid" && dueDate && (() => {
                              // Only show "Mark Paid" button when payment is actually due (at end of month)
                              const today = new Date()
                              today.setHours(0, 0, 0, 0)
                              const due = new Date(dueDate)
                              due.setHours(0, 0, 0, 0)
                              // Payment is due if today is the last day of the month or the due date has passed
                              const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                              const isDue = today >= lastDayOfMonth || today >= due
                              return isDue ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleMarkPaymentReceived(student.id)}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Mark Paid
                                </Button>
                              ) : null
                            })()}
                          </div>
                        ) : paymentAmount ? (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                        {dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  <TableCell className="text-right">
                      {isMainTeacher && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                      )}
                  </TableCell>
                </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
