"use client"

import { useState, useEffect } from "react"
import type { User, Group, Assignment, Schedule, Grade, Attendance, Participation } from "@/lib/types"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Calendar, ClipboardList, TrendingUp, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { AssignmentFiles } from "@/components/student/assignment-files"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProgressBadge } from "@/components/ui/progress-badge"
import { calculateLevel, calculateStreak } from "@/lib/gamification"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { BadgesDisplay } from "@/components/dashboard/gamification/badges-display"
import { getUserProgressClient } from "@/lib/gamification-client"
import { LearningPathViewer } from "@/components/dashboard/learning-path/learning-path-viewer"
import { handleDatabaseError } from "@/lib/error-handler"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-loader"
import { EmptyState } from "@/components/ui/empty-state"

interface StudentDashboardProps {
  user: User
}

interface GroupWithDetails extends Group {
  teacher?: User
}

export function StudentDashboard({ user }: StudentDashboardProps) {
  const [groups, setGroups] = useState<GroupWithDetails[]>([])
  const [upcomingClasses, setUpcomingClasses] = useState<(Schedule & { group?: Group })[]>([])
  const [assignments, setAssignments] = useState<(Assignment & { group?: Group })[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [participation, setParticipation] = useState<Participation[]>([])
  const [accessCode, setAccessCode] = useState<string>("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false)
  const [stats, setStats] = useState({
    averageGrade: 0,
    attendanceRate: 0,
    completedAssignments: 0,
    totalAssignments: 0,
  })
  const [gamification, setGamification] = useState({
    points: 0,
    level: 1,
    streak: 0,
  })
  const [gradeTrendData, setGradeTrendData] = useState<Array<{ date: string; grade: number }>>([])
  const [attendanceChartData, setAttendanceChartData] = useState<Array<{ month: string; present: number; absent: number }>>([])
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const toast = useToastNotification()

  useEffect(() => {
    setIsMounted(true)
    loadStudentData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const loadStudentData = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()

      // Load groups and access code in parallel
      const [groupResponse, accessCodeResponse] = await Promise.all([
        supabase
          .from("group_students")
          .select(
            `
            group:group_id(
              *,
              teacher:teacher_id(*)
            )
          `,
          )
          .eq("student_id", user.id),
        supabase
          .from("parent_student")
          .select("access_code")
          .eq("student_id", user.id)
          .single(),
      ])

      if (groupResponse.error) {
        const errorInfo = handleDatabaseError(groupResponse.error, "Failed to load groups")
        console.error("Error loading groups:", groupResponse.error)
        setError(errorInfo.message)
        toast.showError(errorInfo.message)
        // Don't return early - try to continue with what we have
      }

      const groupData = groupResponse.data || []
      let accessCodeData = accessCodeResponse.data

      // If access code doesn't exist, create it
      if (accessCodeResponse.error) {
        if (accessCodeResponse.error.code === "PGRST116") {
          // No access code found - create one
          console.log("No access code found for student. Creating one...")
          
          // Generate unique access code
          let accessCode: string
          let isUnique = false
          let attempts = 0
          const maxAttempts = 10

          while (!isUnique && attempts < maxAttempts) {
            // Use crypto.randomUUID() for better uniqueness, then take first 8 chars and uppercase
            const uuid = crypto.randomUUID().replace(/-/g, '').toUpperCase()
            accessCode = uuid.substring(0, 8)
            // Check if code already exists
            const { data: existing } = await supabase
              .from("parent_student")
              .select("id")
              .eq("access_code", accessCode)
              .single()

            if (!existing) {
              isUnique = true
            } else {
              attempts++
            }
          }

          if (isUnique && accessCode!) {
            const { data: newAccessCodeData, error: insertError } = await supabase
              .from("parent_student")
              .insert({
                student_id: user.id,
                access_code: accessCode,
                is_linked: false,
              })
              .select("access_code")
              .single()

            if (newAccessCodeData && !insertError) {
              accessCodeData = newAccessCodeData
              console.log("Access code created successfully:", accessCode)
            } else if (insertError) {
              const errorInfo = {
                message: insertError.message,
                code: insertError.code,
                status: (insertError as any)?.status,
              }
              console.error("Failed to create access code:", errorInfo)
              
              // Check if it's an RLS error
              if (errorInfo.status === 406 || insertError.message?.includes("permission denied") || insertError.message?.includes("row-level security")) {
                console.error("RLS policy is blocking parent_student insert. Please run 'scripts/16_add_parent_student_insert_policy.sql' in Supabase SQL Editor.")
              }
            }
          } else {
            console.error("Failed to generate unique access code after", maxAttempts, "attempts")
          }
        } else {
          // Other errors should be logged
          const errorInfo = {
            message: accessCodeResponse.error.message,
            code: accessCodeResponse.error.code,
            details: accessCodeResponse.error.details,
            hint: accessCodeResponse.error.hint,
            status: (accessCodeResponse.error as any).status || (accessCodeResponse.error as any).statusCode,
            name: (accessCodeResponse.error as any).name,
            keys: Object.keys(accessCodeResponse.error),
          }
          console.error("Error loading access code:", errorInfo)
          
          // Try to stringify for better logging
          try {
            const errorString = JSON.stringify(accessCodeResponse.error, Object.getOwnPropertyNames(accessCodeResponse.error), 2)
            console.error("Error details (JSON):", errorString)
          } catch (e) {
            try {
              console.error("Error (stringified):", String(accessCodeResponse.error))
            } catch (e2) {
              console.error("Error object keys:", Object.keys(accessCodeResponse.error))
            }
          }
          
          // Check if it's an RLS error
          const status = errorInfo.status
          if (status === 406 || errorInfo.message?.includes("permission denied") || errorInfo.message?.includes("row-level security")) {
            console.warn("RLS policy issue with parent_student table. Make sure RLS policies are set up correctly.")
          }
        }
      }

      if (accessCodeData) {
        setAccessCode(accessCodeData.access_code)
      }

      if (groupData) {
        const enrolledGroups = groupData.map((item: any) => item.group).filter(Boolean)
        setGroups(enrolledGroups)

        const groupIds = enrolledGroups.map((g: Group) => g.id)

        // Load all student data in parallel
        const now = new Date().toISOString()
        const [scheduleResponse, assignmentResponse, gradesResponse, attendanceResponse, participationResponse] =
          await Promise.all([
            groupIds.length > 0
              ? supabase
                  .from("schedule")
                  .select("*, group:group_id(*)")
                  .in("group_id", groupIds)
                  .gte("date", now)
                  .order("date", { ascending: true })
                  .limit(5)
              : Promise.resolve({ data: null }),
            groupIds.length > 0
              ? supabase
                  .from("assignments")
                  .select("*, group:group_id(*)")
                  .in("group_id", groupIds)
                  .order("due_date", { ascending: true })
              : Promise.resolve({ data: null }),
            supabase.from("grades").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
            supabase
              .from("attendance")
              .select("*")
              .eq("student_id", user.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("participation")
              .select("*")
              .eq("student_id", user.id)
              .order("created_at", { ascending: false }),
          ])

        if (scheduleResponse.error) {
          console.error("Error loading schedule:", scheduleResponse.error)
        } else if (scheduleResponse.data) {
          setUpcomingClasses(scheduleResponse.data)
        }

        if (assignmentResponse.error) {
          console.error("Error loading assignments:", assignmentResponse.error)
        } else if (assignmentResponse.data) {
          setAssignments(assignmentResponse.data)
        }

        if (gradesResponse.error) {
          console.error("Error loading grades:", gradesResponse.error)
        } else if (gradesResponse.data && gradesResponse.data.length > 0) {
          setGrades(gradesResponse.data)
          const average =
            gradesResponse.data.reduce((acc, grade) => acc + grade.score, 0) / gradesResponse.data.length
          setStats((prev) => ({ ...prev, averageGrade: Number(average.toFixed(1)) }))
        }

        if (attendanceResponse.error) {
          console.error("Error loading attendance:", attendanceResponse.error)
        } else if (attendanceResponse.data && attendanceResponse.data.length > 0) {
          setAttendance(attendanceResponse.data)
          const presentCount = attendanceResponse.data.filter(
            (a) => a.status === "present" || a.status === "late",
          ).length
          const rate = (presentCount / attendanceResponse.data.length) * 100
          setStats((prev) => ({ ...prev, attendanceRate: Number(rate.toFixed(1)) }))
          
          // Prepare attendance data for chart (group by month)
          const attendanceByMonth: Record<string, { present: number; absent: number }> = {}
          attendanceResponse.data.forEach((record) => {
            const month = format(new Date(record.created_at), "MMM yyyy")
            if (!attendanceByMonth[month]) {
              attendanceByMonth[month] = { present: 0, absent: 0 }
            }
            if (record.status === "present" || record.status === "late" || record.status === "excused") {
              attendanceByMonth[month].present++
            } else {
              attendanceByMonth[month].absent++
            }
          })
          
          const chartData = Object.entries(attendanceByMonth)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
          setAttendanceChartData(chartData)
        }

        if (participationResponse.error) {
          console.error("Error loading participation:", participationResponse.error)
        } else if (participationResponse.data) {
          setParticipation(participationResponse.data)
        }

        // Load gamification progress from database
        const progress = await getUserProgressClient(user.id)
        if (progress) {
          setGamification({
            points: progress.total_points || 0,
            level: progress.current_level || 1,
            streak: progress.current_streak || 0,
          })
        } else {
          // Fallback calculation if no progress record exists
          const totalPoints = 
            (gradesResponse.data?.length || 0) * 10 +
            (attendanceResponse.data?.filter(a => a.status === "present" || a.status === "late").length || 0) * 5 +
            (assignmentResponse.data?.length || 0) * 10
          
          const level = calculateLevel(totalPoints)
          const streak = 0
          
          setGamification({
            points: totalPoints,
            level,
            streak,
          })
        }
      }
    } catch (error) {
      const errorInfo = handleDatabaseError(error, "Failed to load student data")
      console.error("Error loading student data:", error)
      setError(errorInfo.message)
      toast.showError(errorInfo.message)
    } finally {
      setLoading(false)
    }
  }

  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleViewFiles = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setIsFilesDialogOpen(true)
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="space-y-6">
          <div>
            <Skeleton variant="text" className="h-8 w-64 mb-2" />
            <Skeleton variant="text" className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonTable />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View your progress, assignments, and upcoming classes</p>
        </div>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Gamification Progress */}
        <ProgressBadge 
          points={gamification.points} 
          level={gamification.level} 
          streak={gamification.streak}
        />

        {/* Stats Overview */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{grades.length > 0 ? stats.averageGrade : "-"}</div>
              <Progress value={stats.averageGrade} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendance.length > 0 ? `${stats.attendanceRate}%` : "-"}</div>
              <Progress value={stats.attendanceRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Groups</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups.length}</div>
              <p className="text-xs text-muted-foreground">Enrolled classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
              <p className="text-xs text-muted-foreground">Active assignments</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Classes</CardTitle>
              <CardDescription>Your next scheduled lessons</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingClasses.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming classes"
                  description="You don't have any scheduled classes at the moment"
                />
              ) : (
                <div className="space-y-4">
                  {upcomingClasses.map((schedule) => (
                    <div key={schedule.id} className="flex items-start justify-between border-l-4 border-primary pl-4">
                      <div className="space-y-1">
                        <p className="font-medium">{schedule.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.group ? schedule.group.name : "Unknown Group"}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(new Date(schedule.date), "PPp")}</p>
                      </div>
                      <Badge variant="outline">{schedule.duration_minutes} min</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Homework & Assignments</CardTitle>
              <CardDescription>What you need to complete</CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No assignments"
                  description="You don't have any assignments at the moment"
                />
              ) : (
                <div className="space-y-4">
                  {assignments.slice(0, 5).map((assignment) => {
                    // Calculate overdue status only on client to prevent hydration mismatch
                    const isOverdue = isMounted && assignment.due_date 
                      ? new Date(assignment.due_date) < new Date()
                      : false
                    return (
                      <div key={assignment.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <p className="font-medium">{assignment.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.group ? assignment.group.name : "Unknown Group"}
                            </p>
                            {assignment.due_date && (
                              <p className="text-xs text-muted-foreground">
                                Due: {format(new Date(assignment.due_date), "PPp")}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isOverdue ? (
                              <Badge variant="destructive">Overdue</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleViewFiles(assignment)}>
                              View Files
                            </Button>
                          </div>
                        </div>
                        {assignment.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{assignment.description}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grades & Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Grades</CardTitle>
            <CardDescription>Your academic performance</CardDescription>
          </CardHeader>
          <CardContent>
            {grades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No grades recorded yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.slice(0, 10).map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.category}</TableCell>
                      <TableCell>
                        <span
                          className={`text-lg font-bold ${
                            grade.score >= 70
                              ? "text-green-600"
                              : grade.score >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {grade.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{grade.notes || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(grade.created_at), "PP")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Parent Access Code */}
        <Card>
          <CardHeader>
            <CardTitle>Parent Access Code</CardTitle>
            <CardDescription>Share this code with your parent to link their account</CardDescription>
          </CardHeader>
          <CardContent>
            {accessCode ? (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="rounded-lg border bg-muted p-4">
                    <p className="text-center text-2xl font-mono font-bold tracking-wider">{accessCode}</p>
                  </div>
                </div>
                <Button onClick={copyAccessCode} variant="outline">
                  {copiedCode ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">No access code available</p>
            )}
          </CardContent>
        </Card>

        {/* My Groups */}
        <Card>
          <CardHeader>
            <CardTitle>My Groups</CardTitle>
            <CardDescription>Classes you're enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Not enrolled in any groups</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map((group) => (
                  <Card key={group.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>{group.description || "No description"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {group.teacher && (
                        <p className="text-sm text-muted-foreground">Teacher: {group.teacher.full_name}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog for viewing assignment files */}
        <Dialog open={isFilesDialogOpen} onOpenChange={setIsFilesDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedAssignment?.title}</DialogTitle>
              <DialogDescription>{selectedAssignment?.description || "No description"}</DialogDescription>
            </DialogHeader>
            {selectedAssignment && <AssignmentFiles assignmentId={selectedAssignment.id} studentId={user.id} />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
