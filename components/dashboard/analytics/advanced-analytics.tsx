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
    gradeDistribution: [] as Array<{ name: string; value: number; color: string }>,
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
        toast.info("No students in this group yet")
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
        toast.error("Failed to load grades data", {
          description: gradesData.error.message || "Please try again",
        })
      }
      if (attendanceData.error) {
        console.error("Error loading attendance:", attendanceData.error)
        toast.error("Failed to load attendance data", {
          description: attendanceData.error.message || "Please try again",
        })
      }
      if (assignmentsData.error) {
        console.error("Error loading assignments:", assignmentsData.error)
        toast.error("Failed to load assignments data", {
          description: assignmentsData.error.message || "Please try again",
        })
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

      // Process grade distribution - maintain consistent order and colors
      const gradeRanges = [
        { name: "90-100", min: 90, max: 100, color: "#0088FE" }, // Blue
        { name: "80-89", min: 80, max: 89, color: "#00C49F" }, // Green
        { name: "70-79", min: 70, max: 79, color: "#FFBB28" }, // Yellow/Orange
        { name: "60-69", min: 60, max: 69, color: "#FF8042" }, // Orange/Red
        { name: "Below 60", min: 0, max: 59, color: "#8884d8" }, // Purple
      ]

      const gradeDistribution = gradeRanges.map((range) => {
        const count =
          gradesData.data?.filter(
            (g) => Number(g.score) >= range.min && Number(g.score) <= range.max
          ).length || 0
        return { name: range.name, value: count, color: range.color }
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
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
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
              {analytics.studentPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart 
                    data={analytics.studentPerformance}
                    margin={{ top: 20, right: 30, left: 20, bottom: 150 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={150}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'average') return [`${value.toFixed(1)}%`, 'Average Grade']
                        return [value, 'Assignments Completed']
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="average" fill="#0088FE" name="Average Grade" />
                    <Bar dataKey="assignments" fill="#00C49F" name="Assignments Completed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No student performance data available</p>
                  <p className="text-sm mt-2">Grades will appear here once students complete assignments</p>
                </div>
              )}
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
              {analytics.gradeDistribution.some(g => g.value > 0) ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.gradeDistribution.filter(g => g.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => {
                          if (percent < 0.05) return '' // Hide labels for very small slices
                          return `${name}: ${(percent * 100).toFixed(0)}%`
                        }}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.gradeDistribution.filter(g => g.value > 0).map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color || COLORS[0]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value} assignment${value !== 1 ? 's' : ''}`}
                        labelFormatter={(name) => `Grade Range: ${name}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
                    {analytics.gradeDistribution.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: entry.color || COLORS[0] }}
                        />
                        <div className="text-sm">
                          <div className="font-medium">{entry.name}</div>
                          <div className="text-muted-foreground">{entry.value} assignment{entry.value !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No grade distribution data available</p>
                  <p className="text-sm mt-2">Grades will appear here once assignments are graded</p>
                </div>
              )}
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
                    margin={{ top: 20, right: 30, left: 20, bottom: 150 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="assignment" 
                      angle={-45} 
                      textAnchor="end" 
                      height={150}
                      interval={0}
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number) => `${value}%`}
                      labelFormatter={(label) => `Assignment: ${label}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="percentage" fill="#8884d8" name="Completion %">
                      {analytics.assignmentCompletion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
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




