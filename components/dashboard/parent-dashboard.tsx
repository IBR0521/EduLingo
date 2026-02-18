"use client"

import { useState, useEffect } from "react"
import type { User, Group, Assignment, Schedule, Grade, Attendance } from "@/lib/types"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Calendar, ClipboardList, TrendingUp, UserPlus, Users, AlertCircle, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { handleDatabaseError } from "@/lib/error-handler"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton-loader"
import { EmptyState } from "@/components/ui/empty-state"

interface ParentDashboardProps {
  user: User
}

interface LinkedStudent extends User {
  groups?: Group[]
  stats?: {
    averageGrade: number
    attendanceRate: number
    totalAssignments: number
  }
}

export function ParentDashboard({ user }: ParentDashboardProps) {
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [accessCode, setAccessCode] = useState("")
  const [linkError, setLinkError] = useState("")
  const [linkSuccess, setLinkSuccess] = useState(false)

  // Student details
  const [upcomingClasses, setUpcomingClasses] = useState<(Schedule & { group?: Group })[]>([])
  const [assignments, setAssignments] = useState<(Assignment & { group?: Group })[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const toast = useToastNotification()

  useEffect(() => {
    loadLinkedStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedStudent) {
      loadStudentDetails(selectedStudent.id)
    }
  }, [selectedStudent])

  const loadLinkedStudents = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()

      const { data, error: linkError } = await supabase
        .from("parent_student")
        .select(
          `
          student:student_id(*)
        `,
        )
        .eq("parent_id", user.id)
        .eq("is_linked", true)

      if (linkError) {
        const errorInfo = handleDatabaseError(linkError, "Failed to load linked students")
        setError(errorInfo.message)
        toast.showError(errorInfo.message)
        setLoading(false)
        return
      }

      if (data) {
      interface ParentStudentLink {
        student: User
      }
      const students = data.map((item: ParentStudentLink) => item.student).filter(Boolean)

      // Load stats for each student
      const studentsWithStats = await Promise.all(
        students.map(async (student: User) => {
          const stats = await loadStudentStats(student.id)
          const groups = await loadStudentGroups(student.id)
          return { ...student, stats, groups }
        }),
      )

      setLinkedStudents(studentsWithStats)

        if (studentsWithStats.length > 0 && !selectedStudent) {
          setSelectedStudent(studentsWithStats[0])
        }
      }
    } catch (error) {
      const errorInfo = handleDatabaseError(error, "Failed to load linked students")
      setError(errorInfo.message)
      toast.showError(errorInfo.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStudentStats = async (studentId: string) => {
    const supabase = createClient()

    // Load grades with error handling
    const { data: gradesData, error: gradesError } = await supabase
      .from("grades")
      .select("score")
      .eq("student_id", studentId)

    if (gradesError) {
      console.error("Error loading grades:", gradesError)
    }

    const averageGrade =
      gradesData && gradesData.length > 0
        ? gradesData.reduce((sum, grade) => sum + grade.score, 0) / gradesData.length
        : 0

    // Load attendance - count present, late, and excused as attended
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("status")
      .eq("student_id", studentId)

    if (attendanceError) {
      console.error("Error loading attendance:", attendanceError)
    }

    const attendanceRate =
      attendanceData && attendanceData.length > 0
        ? (attendanceData.filter((a) => a.status === "present" || a.status === "late" || a.status === "excused").length / attendanceData.length) * 100
        : 0

    // Load assignments - get groups student is enrolled in, then count assignments
    const { data: groupEnrollments, error: enrollmentsError } = await supabase
      .from("group_students")
      .select("group_id")
      .eq("student_id", studentId)

    if (enrollmentsError) {
      console.error("Error loading group enrollments:", enrollmentsError)
    }

    let totalAssignments = 0
    if (groupEnrollments && groupEnrollments.length > 0) {
      const groupIds = groupEnrollments.map((ge) => ge.group_id)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id")
        .in("group_id", groupIds)
      
      if (assignmentsError) {
        console.error("Error loading assignments:", assignmentsError)
      } else {
        totalAssignments = assignmentsData?.length || 0
      }
    }

    return {
      averageGrade,
      attendanceRate,
      totalAssignments,
    }
  }

  const loadStudentGroups = async (studentId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("group_students")
      .select(
        `
        group:group_id(*)
      `,
      )
      .eq("student_id", studentId)

    if (data) {
      interface GroupStudentLink {
        group: Group
      }
      return data.map((item: GroupStudentLink) => item.group).filter(Boolean)
    }
    return []
  }

  const loadStudentDetails = async (studentId: string) => {
    setDetailsLoading(true)
    try {
    const supabase = createClient()

    // Load groups for this student
    const { data: groupData } = await supabase
      .from("group_students")
      .select(
        `
        group:group_id(*)
      `,
      )
      .eq("student_id", studentId)

    const groupIds = groupData?.map((item: { group: Group }) => item.group.id) || []

    if (groupIds.length > 0) {
      // Load upcoming classes
      const now = new Date().toISOString()
      const { data: scheduleData } = await supabase
        .from("schedule")
        .select(
          `
          *,
          group:group_id(*)
        `,
        )
        .in("group_id", groupIds)
        .gte("date", now)
        .order("date", { ascending: true })
        .limit(5)

      if (scheduleData) {
        setUpcomingClasses(scheduleData)
      }

      // Load assignments
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(
          `
          *,
          group:group_id(*)
        `,
        )
        .in("group_id", groupIds)
        .order("due_date", { ascending: true })

      if (assignmentsData) {
        setAssignments(assignmentsData)
      }
    }

    // Load grades
    const { data: gradesData } = await supabase
      .from("grades")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (gradesData) {
      setGrades(gradesData)
    }

    // Load attendance
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })

    if (attendanceData) {
      setAttendance(attendanceData)
    }
  }

  const handleLinkStudent = async () => {
    // Clear previous errors
    setLinkError("")
    setLinkSuccess(false)
    
    if (!accessCode.trim()) {
      setLinkError("Please enter an access code")
      return
    }

    // Validate access code format (8 characters)
    const trimmedCode = accessCode.trim().toUpperCase()
    if (trimmedCode.length !== 8) {
      setLinkError("Access code must be exactly 8 characters")
      return
    }

    try {
      const supabase = createClient()

      // Find student with this access code
      console.log("🔍 Searching for access code:", trimmedCode)
      
      const { data: studentData, error: findError } = await supabase
        .from("parent_student")
        .select(
          `
          id,
          student_id,
          parent_id,
          is_linked,
          student:student_id(*)
        `,
        )
        .eq("access_code", trimmedCode)
        .single()

      // Log detailed error information
      if (findError) {
        const errorInfo = {
          message: findError.message,
          code: findError.code,
          details: findError.details,
          hint: findError.hint,
          status: (findError as any).status || (findError as any).statusCode,
        }
        console.error("❌ Error finding student with access code:")
        console.error("Error Info:", errorInfo)
        console.error("Access Code:", accessCode.toUpperCase())
        console.error("Parent ID:", user.id)
        
        // Check if it's an RLS policy issue
        const status = errorInfo.status
        if (status === 406 || findError.message?.includes("permission denied") || findError.message?.includes("row-level security")) {
          console.error("⚠️ RLS policy is blocking parent_student read by access_code")
          console.error("💡 Solution: Add a policy that allows parents to read parent_student by access_code")
          setLinkError("Database security error. Please contact support or check RLS policies.")
          return
        }
      }

      if (findError) {
        // Handle specific error codes
        if (findError.code === "PGRST116") {
          setLinkError("Invalid access code. Please check the code and try again.")
          return
        }
        console.error("❌ Error finding student:", findError)
        setLinkError("Invalid access code or student already linked")
        return
      }

      if (!studentData) {
        console.error("❌ Student data is null")
        setLinkError("Invalid access code. Please check the code and try again.")
        return
      }

      // Check if already linked
      if (studentData.is_linked) {
        if (studentData.parent_id === user.id) {
          setLinkError("This student is already linked to your account")
        } else {
          setLinkError("This student is already linked to another parent account")
        }
        return
      }

      console.log("✅ Student found:", studentData)

      // Update to link the student
      console.log("🔗 Linking student to parent:", { 
        parentId: user.id, 
        studentId: studentData.student_id,
        accessCode: trimmedCode,
        recordId: studentData.id
      })
      
      const { error: updateError } = await supabase
        .from("parent_student")
        .update({
          parent_id: user.id,
          is_linked: true,
        })
        .eq("id", studentData.id)

      if (updateError) {
        const errorInfo = {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          status: (updateError as any).status || (updateError as any).statusCode,
        }
        console.error("❌ Error linking student:")
        console.error("Error Info:", errorInfo)
        console.error("Parent ID:", user.id)
        console.error("Student ID:", studentData.student_id)
        console.error("Record ID:", studentData.id)
        console.error("Access Code:", trimmedCode)
        
        // Check if it's an RLS policy issue
        const status = errorInfo.status
        if (status === 406 || updateError.message?.includes("permission denied") || updateError.message?.includes("row-level security")) {
          console.error("⚠️ RLS policy is blocking parent_student update")
          console.error("💡 Solution: Run 'scripts/17_fix_parent_student_read_policy.sql' in Supabase SQL Editor")
          setLinkError("Database security error. Please contact support or check RLS policies.")
          return
        }
        
        // Check for unique constraint violation (parent already linked to this student)
        if (errorInfo.code === "23505" || updateError.message?.includes("duplicate") || updateError.message?.includes("unique constraint")) {
          setLinkError("This student is already linked to your account or another parent.")
          return
        }
        
        setLinkError(`Failed to link student: ${errorInfo.message || "Unknown error"}`)
        return
      }

      console.log("✅ Student linked successfully")

      setLinkSuccess(true)
      setLinkError("")
      setAccessCode("")
      
      // Reload linked students immediately
      await loadLinkedStudents()
      
      setTimeout(() => {
        setIsLinkOpen(false)
        setLinkSuccess(false)
      }, 1500)
    } catch {
      setLinkError("An unexpected error occurred. Please try again.")
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 75) return "text-blue-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  // Use state to track if component is mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate || !isMounted) return false
    return new Date(dueDate) < new Date()
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <Skeleton variant="text" className="h-8 w-64 mb-2" />
            <Skeleton variant="text" className="h-4 w-96" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Parent Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Monitor your child's progress and performance</p>
          </div>
          <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Link Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Student Account</DialogTitle>
                <DialogDescription>
                  Enter the access code provided by your child to link their account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {linkError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{linkError}</AlertDescription>
                  </Alert>
                )}
                {linkSuccess && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>Student account linked successfully!</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <Input
                    id="accessCode"
                    placeholder="Enter 8-character code"
                    value={accessCode}
                    onChange={(e) => {
                      // Only allow alphanumeric characters and limit to 8
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                      setAccessCode(value)
                      setLinkError("")
                      setLinkSuccess(false)
                    }}
                    maxLength={8}
                    pattern="[A-Z0-9]{8}"
                    disabled={linkSuccess}
                  />
                  <p className="text-xs text-muted-foreground">Ask your child for their unique access code</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLinkOpen(false)} disabled={linkSuccess}>
                  Cancel
                </Button>
                <Button onClick={handleLinkStudent} disabled={!accessCode.trim() || linkSuccess}>
                  Link Student
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {linkedStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Students Linked"
            description="Link your child's account using their access code to see their progress"
            action={
              <Button onClick={() => setIsLinkOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Link Student Account
              </Button>
            }
          />
        ) : (
          <>
            {linkedStudents.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Student</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {linkedStudents.map((student) => (
                      <Button
                        key={student.id}
                        variant={selectedStudent?.id === student.id ? "default" : "outline"}
                        onClick={() => setSelectedStudent(student)}
                      >
                        {student.full_name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedStudent && (
              <>
                {detailsLoading && (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                )}
                {!detailsLoading && (
                  <>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{selectedStudent.stats?.averageGrade.toFixed(1) || 0}%</div>
                      <Progress value={selectedStudent.stats?.averageGrade || 0} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{selectedStudent.stats?.attendanceRate.toFixed(0) || 0}%</div>
                      <Progress value={selectedStudent.stats?.attendanceRate || 0} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Enrolled Groups</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">{selectedStudent.groups?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Active classes</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Classes</CardTitle>
                      <CardDescription>Next scheduled sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {upcomingClasses.length === 0 ? (
                        <EmptyState
                          icon={Calendar}
                          title="No upcoming classes"
                          description="No scheduled classes at the moment"
                        />
                      ) : (
                        <div className="space-y-3">
                          {upcomingClasses.map((schedule) => (
                            <div key={schedule.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium">{schedule.subject}</p>
                                <p className="text-xs text-muted-foreground">
                                  {schedule.group?.name} • {format(new Date(schedule.date), "PPp")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Homework & Assignments</CardTitle>
                      <CardDescription>Pending and completed work</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {assignments.length === 0 ? (
                        <EmptyState
                          icon={ClipboardList}
                          title="No assignments"
                          description="No assignments at the moment"
                        />
                      ) : (
                        <div className="space-y-3">
                          {assignments.slice(0, 5).map((assignment) => (
                            <div key={assignment.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                              <ClipboardList className="h-4 w-4 mt-1 text-muted-foreground" />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{assignment.title}</p>
                                  {assignment.due_date && isOverdue(assignment.due_date) && (
                                    <Badge variant="destructive" className="text-xs">
                                      Overdue
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {assignment.group?.name} •{" "}
                                  {assignment.due_date ? format(new Date(assignment.due_date), "PP") : "No due date"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Grades</CardTitle>
                      <CardDescription>Latest assessment scores</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {grades.length === 0 ? (
                        <EmptyState
                          icon={TrendingUp}
                          title="No grades yet"
                          description="Grades will appear here once recorded"
                        />
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grades.map((grade) => (
                              <TableRow key={grade.id}>
                                <TableCell className="font-medium">{grade.category}</TableCell>
                                <TableCell>
                                  <span className={`font-bold ${getScoreColor(grade.score)}`}>{grade.score}%</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(grade.created_at), "PP")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance History</CardTitle>
                      <CardDescription>Recent attendance records</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {attendance.length === 0 ? (
                        <EmptyState
                          icon={CheckCircle}
                          title="No attendance records"
                          description="Attendance records will appear here"
                        />
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendance.slice(0, 5).map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="text-muted-foreground">
                                  {format(new Date(record.created_at), "PP")}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      record.status === "present"
                                        ? "default"
                                        : record.status === "late"
                                          ? "secondary"
                                          : record.status === "excused"
                                            ? "outline"
                                            : "destructive"
                                    }
                                  >
                                    {record.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Enrolled Groups</CardTitle>
                    <CardDescription>Classes {selectedStudent.full_name} is attending</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedStudent.groups || selectedStudent.groups.length === 0 ? (
                      <EmptyState
                        icon={BookOpen}
                        title="Not enrolled in any groups"
                        description="Student is not currently enrolled in any classes"
                      />
                    ) : (
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedStudent.groups.map((group) => (
                          <Card key={group.id}>
                            <CardHeader>
                              <CardTitle className="text-base">{group.name}</CardTitle>
                              <CardDescription className="text-xs line-clamp-2">
                                {group.description || "No description"}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <BookOpen className="h-4 w-4" />
                                <span>Teacher: {group.teacher?.full_name || "Not assigned"}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
