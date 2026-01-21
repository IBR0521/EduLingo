"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { TrendingUp, Users, BookOpen, Award, Calendar } from "lucide-react"
import { LoadingState } from "@/components/ui/loading-state"
import { toast } from "sonner"

interface AdvancedAnalyticsProps {
  groupId: string
  teacherId: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

export function AdvancedAnalytics({ groupId, teacherId }: AdvancedAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState({
    studentPerformance: [] as Array<{ name: string; average: number; assignments: number }>,
    gradeDistribution: [] as Array<{ name: string; value: number }>,
    attendanceTrend: [] as Array<{ date: string; present: number; absent: number }>,
    assignmentCompletion: [] as Array<{ assignment: string; completed: number; total: number; percentage: number }>,
    skillMastery: [] as Array<{ skill: string; average: number }>,
  })

  useEffect(() => {
    loadAnalytics()
  }, [groupId])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Get all students in group
      const { data: groupStudents, error: groupStudentsError } = await supabase
        .from("group_students")
        .select("student_id")
        .eq("group_id", groupId)

      if (groupStudentsError) {
        console.error("Error loading group students:", groupStudentsError)
        toast.error("Failed to load group students", {
          description: groupStudentsError.message || "Please try again",
        })
        setLoading(false)
        return
      }

      if (!groupStudents || groupStudents.length === 0) {
        setLoading(false)
        return
      }

      const studentIds = groupStudents.map((gs) => gs.student_id)

      // Load all data in parallel
      const [gradesData, attendanceData, assignmentsData, studentsData] = await Promise.all([
        supabase.from("grades").select("*").eq("group_id", groupId),
        supabase
          .from("attendance")
          .select("*, schedule:schedule_id(*, date)")
          .in("student_id", studentIds)
          .order("created_at", { ascending: true }),
        supabase.from("assignments").select("*").eq("group_id", groupId),
        supabase.from("users").select("id, full_name").in("id", studentIds),
      ])

      // Check for errors in parallel queries
      if (gradesData.error) {
        console.error("Error loading grades:", gradesData.error)
      }
      if (attendanceData.error) {
        console.error("Error loading attendance:", attendanceData.error)
      }
      if (assignmentsData.error) {
        console.error("Error loading assignments:", assignmentsData.error)
      }
      if (studentsData.error) {
        console.error("Error loading students:", studentsData.error)
        toast.error("Failed to load student data", {
          description: studentsData.error.message || "Please try again",
        })
        setLoading(false)
        return
      }

      // Process student performance
      const studentPerformance = studentsData.data?.map((student) => {
        const studentGrades = gradesData.data?.filter((g) => g.student_id === student.id) || []
        const average =
          studentGrades.length > 0
            ? studentGrades.reduce((sum, g) => sum + Number(g.score), 0) / studentGrades.length
            : 0
        return {
          name: student.full_name,
          average: Math.round(average * 10) / 10,
          assignments: studentGrades.length,
        }
      }) || []

      // Process grade distribution
      const gradeRanges = [
        { name: "90-100", min: 90, max: 100 },
        { name: "80-89", min: 80, max: 89 },
        { name: "70-79", min: 70, max: 79 },
        { name: "60-69", min: 60, max: 69 },
        { name: "Below 60", min: 0, max: 59 },
      ]

      const gradeDistribution = gradeRanges.map((range) => {
        const count =
          gradesData.data?.filter(
            (g) => Number(g.score) >= range.min && Number(g.score) <= range.max
          ).length || 0
        return { name: range.name, value: count }
      })

      // Process attendance trend (last 30 days)
      const attendanceByDate: Record<string, { present: number; absent: number }> = {}
      attendanceData.data?.forEach((record) => {
        if (record.schedule && record.schedule.date) {
          const date = format(new Date(record.schedule.date), "MMM dd")
          if (!attendanceByDate[date]) {
            attendanceByDate[date] = { present: 0, absent: 0 }
          }
          if (record.status === "present" || record.status === "late" || record.status === "excused") {
            attendanceByDate[date].present++
          } else {
            attendanceByDate[date].absent++
          }
        }
      })

      const attendanceTrend = Object.entries(attendanceByDate)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30) // Last 30 days

      // Process assignment completion
      const assignmentCompletion = assignmentsData.data?.map((assignment) => {
        const files = gradesData.data?.filter((g) => g.assignment_id === assignment.id) || []
        const completed = files.length
        const total = studentIds.length
        return {
          assignment: assignment.title,
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        }
      }) || []

      setAnalytics({
        studentPerformance: studentPerformance.sort((a, b) => b.average - a.average),
        gradeDistribution,
        attendanceTrend,
        assignmentCompletion,
        skillMastery: [], // Would need learning objectives data
      })
    } catch (error) {
      console.error("Error loading analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState message="Loading analytics..." />
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Student Performance</TabsTrigger>
          <TabsTrigger value="grades">Grade Distribution</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Trends</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Student Performance Overview</CardTitle>
              <CardDescription>Average grades and assignment completion by student</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart 
                  data={analytics.studentPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="average" fill="#0088FE" name="Average Grade" />
                  <Bar dataKey="assignments" fill="#00C49F" name="Assignments Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Distribution of grades across all assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={analytics.gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>Attendance patterns over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.attendanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#00C49F" name="Present" />
                    <Line type="monotone" dataKey="absent" stroke="#FF8042" name="Absent" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No attendance data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Completion Rates</CardTitle>
              <CardDescription>Percentage of students who completed each assignment</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.assignmentCompletion.length > 0 ? (
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart 
                    data={analytics.assignmentCompletion}
                    margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="assignment" 
                      angle={-45} 
                      textAnchor="end" 
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="percentage" fill="#8884d8" name="Completion %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No assignment data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}




