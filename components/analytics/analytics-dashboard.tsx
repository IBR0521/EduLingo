"use client"

import { useState, useEffect } from "react"
import type { User, Group, StudentPerformanceMetrics, StudentEngagementScore, AtRiskStudent } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Activity,
  Download
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingState } from "@/components/ui/loading-state"
import { useToast } from "@/hooks/use-toast"

interface AnalyticsDashboardProps {
  currentUserId: string
  userRole: "main_teacher" | "teacher"
  groupId?: string
}

export function AnalyticsDashboard({ currentUserId, userRole, groupId }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string>(groupId || "")
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "semester">("month")
  const [groups, setGroups] = useState<Group[]>([])
  const [performanceData, setPerformanceData] = useState<StudentPerformanceMetrics[]>([])
  const [engagementData, setEngagementData] = useState<StudentEngagementScore[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([])
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    averageGrade: 0,
    averageAttendance: 0,
    averageEngagement: 0,
    atRiskCount: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadAnalytics()
    }
  }, [selectedGroup, selectedPeriod])

  const loadGroups = async () => {
    try {
      const supabase = createClient()
      let query = supabase.from("groups").select("*")

      if (userRole === "teacher") {
        query = query.eq("teacher_id", currentUserId)
      }

      const { data } = await query.order("created_at", { ascending: false })

      if (data) {
        setGroups(data)
        if (data.length > 0 && !selectedGroup) {
          setSelectedGroup(data[0].id)
        }
      }
    } catch (error) {
      console.error("Error loading groups:", error)
    }
  }

  const loadAnalytics = async () => {
    if (!selectedGroup) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Calculate date range based on selected period
      const now = new Date()
      let startDate = new Date()
      if (selectedPeriod === "week") {
        startDate.setDate(now.getDate() - 7)
      } else if (selectedPeriod === "month") {
        startDate.setMonth(now.getMonth() - 1)
      } else {
        startDate.setMonth(now.getMonth() - 6)
      }

      // Get students in group
      const students = await getGroupStudents(selectedGroup)
      const studentIds = students.map((s) => s.id)

      if (studentIds.length === 0) {
        setSummaryStats({
          totalStudents: 0,
          averageGrade: 0,
          averageAttendance: 0,
          averageEngagement: 0,
          atRiskCount: 0,
        })
        setPerformanceData([])
        setEngagementData([])
        setAtRiskStudents([])
        setLoading(false)
        return
      }

      // Load real data from actual tables (not pre-calculated metrics)
      const [gradesData, attendanceData, assignmentsData] = await Promise.all([
        supabase
          .from("grades")
          .select("*")
          .eq("group_id", selectedGroup)
          .gte("created_at", startDate.toISOString()),
        supabase
          .from("attendance")
          .select("*, schedule:schedule_id(date)")
          .in("student_id", studentIds)
          .gte("created_at", startDate.toISOString()),
        supabase
          .from("assignments")
          .select("*")
          .eq("group_id", selectedGroup)
          .gte("created_at", startDate.toISOString()),
      ])

      // Calculate performance metrics from real data
      const performanceMetrics: StudentPerformanceMetrics[] = []
      const engagementScores: StudentEngagementScore[] = []
      const atRiskList: AtRiskStudent[] = []

      // Group data by date for performance metrics
      const gradesByDate: Record<string, { grades: number[]; students: Set<string> }> = {}
      const attendanceByDate: Record<string, { present: number; total: number }> = {}

      gradesData.data?.forEach((grade) => {
        const date = new Date(grade.created_at).toISOString().split("T")[0]
        if (!gradesByDate[date]) {
          gradesByDate[date] = { grades: [], students: new Set() }
        }
        gradesByDate[date].grades.push(Number(grade.score))
        gradesByDate[date].students.add(grade.student_id)
      })

      attendanceData.data?.forEach((att) => {
        if (att.schedule?.date) {
          const date = new Date(att.schedule.date).toISOString().split("T")[0]
          if (!attendanceByDate[date]) {
            attendanceByDate[date] = { present: 0, total: 0 }
          }
          attendanceByDate[date].total++
          if (att.status === "present" || att.status === "late" || att.status === "excused") {
            attendanceByDate[date].present++
          }
        }
      })

      // Create performance metrics from calculated data
      Object.entries(gradesByDate).forEach(([date, data]) => {
        const avgGrade = data.grades.length > 0
          ? data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length
          : 0

        const attendance = attendanceByDate[date]
        const attendanceRate = attendance && attendance.total > 0
          ? (attendance.present / attendance.total) * 100
          : 0

        performanceMetrics.push({
          id: `temp-${date}`,
          student_id: studentIds[0], // Aggregate metric
          group_id: selectedGroup,
          metric_date: date,
          average_grade: avgGrade,
          attendance_rate: attendanceRate,
          assignment_completion_rate: 0,
          participation_score: 0,
          time_on_task_minutes: 0,
          assignments_submitted: 0,
          assignments_total: assignmentsData.data?.length || 0,
          classes_attended: attendance?.present || 0,
          classes_total: attendance?.total || 0,
          created_at: date,
          updated_at: date,
        })
      })

      // Calculate engagement scores (simplified)
      students.forEach((student) => {
        const studentGrades = gradesData.data?.filter((g) => g.student_id === student.id) || []
        const studentAttendance = attendanceData.data?.filter((a) => a.student_id === student.id) || []
        const presentCount = studentAttendance.filter(
          (a) => a.status === "present" || a.status === "late" || a.status === "excused"
        ).length

        const avgGrade = studentGrades.length > 0
          ? studentGrades.reduce((sum, g) => sum + Number(g.score), 0) / studentGrades.length
          : 0

        const attendanceRate = studentAttendance.length > 0
          ? (presentCount / studentAttendance.length) * 100
          : 0

        // Simple engagement score: average of grade and attendance
        const overallScore = (avgGrade + attendanceRate) / 2

        engagementScores.push({
          id: `temp-${student.id}`,
          student_id: student.id,
          group_id: selectedGroup,
          score_date: now.toISOString().split("T")[0],
          overall_score: overallScore,
          login_frequency: 0,
          assignment_engagement: (studentGrades.length / (assignmentsData.data?.length || 1)) * 100,
          participation_engagement: attendanceRate,
          communication_engagement: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })

        // Identify at-risk students
        if (avgGrade < 60 || attendanceRate < 70) {
          let riskLevel: "low" | "medium" | "high" | "critical" = "low"
          if (avgGrade < 40 || attendanceRate < 50) {
            riskLevel = "critical"
          } else if (avgGrade < 50 || attendanceRate < 60) {
            riskLevel = "high"
          } else if (avgGrade < 60 || attendanceRate < 70) {
            riskLevel = "medium"
          }

          atRiskList.push({
            id: `temp-${student.id}`,
            student_id: student.id,
            group_id: selectedGroup,
            risk_level: riskLevel,
            risk_factors: {
              low_grade: avgGrade < 60,
              low_attendance: attendanceRate < 70,
            },
            predicted_outcome: avgGrade < 40 ? "likely_to_fail" : "needs_support",
            confidence_score: 75,
            flagged_at: now.toISOString(),
            resolved_at: null,
            notes: `Average grade: ${avgGrade.toFixed(1)}%, Attendance: ${attendanceRate.toFixed(1)}%`,
            flagged_by: null,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            student: student,
          })
        }
      })

      // Calculate summary statistics
      const allGrades = gradesData.data?.map((g) => Number(g.score)) || []
      const avgGrade = allGrades.length > 0
        ? allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length
        : 0

      const allAttendance = attendanceData.data || []
      const presentCount = allAttendance.filter(
        (a) => a.status === "present" || a.status === "late" || a.status === "excused"
      ).length
      const avgAttendance = allAttendance.length > 0
        ? (presentCount / allAttendance.length) * 100
        : 0

      const avgEngagement = engagementScores.length > 0
        ? engagementScores.reduce((sum, e) => sum + (e.overall_score || 0), 0) / engagementScores.length
        : 0

      setPerformanceData(performanceMetrics)
      setEngagementData(engagementScores)
      setAtRiskStudents(atRiskList)
      setSummaryStats({
        totalStudents: students.length,
        averageGrade: avgGrade,
        averageAttendance: avgAttendance,
        averageEngagement: avgEngagement,
        atRiskCount: atRiskList.length,
      })
    } catch (error) {
      console.error("Error loading analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getGroupStudents = async (groupId: string): Promise<User[]> => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("group_students")
        .select("student:student_id(*)")
        .eq("group_id", groupId)

      return (data || []).map((item: any) => item.student).filter(Boolean)
    } catch (error) {
      console.error("Error loading students:", error)
      return []
    }
  }

  const calculateTrend = (data: number[]): "up" | "down" | "stable" => {
    if (data.length < 2) return "stable"
    const first = data.slice(0, Math.floor(data.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(data.length / 2)
    const second = data.slice(Math.floor(data.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(data.length / 2)
    if (second > first + 2) return "up"
    if (second < first - 2) return "down"
    return "stable"
  }

  const preparePerformanceChartData = () => {
    const grouped = performanceData.reduce((acc, metric) => {
      const date = metric.metric_date
      if (!acc[date]) {
        acc[date] = { date, grade: 0, attendance: 0, count: 0 }
      }
      acc[date].grade += metric.average_grade || 0
      acc[date].attendance += metric.attendance_rate || 0
      acc[date].count += 1
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped).map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      "Average Grade": item.count > 0 ? (item.grade / item.count).toFixed(1) : 0,
      "Attendance Rate": item.count > 0 ? (item.attendance / item.count).toFixed(1) : 0,
    }))
  }

  const prepareEngagementChartData = () => {
    const grouped = engagementData.reduce((acc, score) => {
      const date = score.score_date
      if (!acc[date]) {
        acc[date] = { date, score: 0, count: 0 }
      }
      acc[date].score += score.overall_score || 0
      acc[date].count += 1
      return acc
    }, {} as Record<string, any>)

    return Object.values(grouped).map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      "Engagement Score": item.count > 0 ? (item.score / item.count).toFixed(1) : 0,
    }))
  }

  const prepareRiskDistributionData = () => {
    const distribution = atRiskStudents.reduce((acc, student) => {
      acc[student.risk_level] = (acc[student.risk_level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return [
      { name: "Low Risk", value: distribution.low || 0, color: "#22c55e" },
      { name: "Medium Risk", value: distribution.medium || 0, color: "#eab308" },
      { name: "High Risk", value: distribution.high || 0, color: "#f97316" },
      { name: "Critical", value: distribution.critical || 0, color: "#ef4444" },
    ].filter(item => item.value > 0)
  }

  const COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"]

  if (loading && !selectedGroup) {
    return <LoadingState message="Loading analytics..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive insights and predictive analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="semester">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedGroup ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please select a group to view analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalStudents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Grade</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.averageGrade.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.averageAttendance.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.averageEngagement.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{summaryStats.atRiskCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="risk">At-Risk Students</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>Average grades and attendance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={preparePerformanceChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Average Grade" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="Attendance Rate" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      No performance data available for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Trends</CardTitle>
                  <CardDescription>Student engagement scores over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {engagementData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareEngagementChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Engagement Score" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      No engagement data available for this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>At-Risk Students</CardTitle>
                  <CardDescription>Students identified as at risk based on performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  {atRiskStudents.length > 0 ? (
                    <div className="space-y-4">
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={prepareRiskDistributionData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {prepareRiskDistributionData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {atRiskStudents.map((student) => (
                          <Alert key={student.id} variant={student.risk_level === "critical" ? "destructive" : "default"}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>
                              {(student.student as any)?.full_name || "Unknown Student"}
                              <Badge className="ml-2" variant={
                                student.risk_level === "critical" ? "destructive" :
                                student.risk_level === "high" ? "destructive" :
                                student.risk_level === "medium" ? "default" : "secondary"
                              }>
                                {student.risk_level.toUpperCase()}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription>
                              {student.notes || "No additional notes"}
                              {student.confidence_score && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (Confidence: {student.confidence_score.toFixed(0)}%)
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      No at-risk students identified
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}



