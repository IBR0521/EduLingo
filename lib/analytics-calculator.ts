// Analytics Calculator Utility
// Functions to calculate and update analytics metrics

import { createClient } from "@/lib/supabase/client"

export interface AnalyticsCalculationResult {
  averageGrade: number
  assignmentCompletionRate: number
  attendanceRate: number
  participationScore: number
  timeOnTaskMinutes: number
  assignmentsSubmitted: number
  assignmentsTotal: number
  classesAttended: number
  classesTotal: number
}

export async function calculateStudentPerformance(
  studentId: string,
  groupId: string,
  courseId?: string
): Promise<AnalyticsCalculationResult> {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  // Calculate average grade
  const { data: grades } = await supabase
    .from("grades")
    .select("score")
    .eq("student_id", studentId)
    .eq("group_id", groupId)

  const averageGrade = grades && grades.length > 0
    ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length
    : 0

  // Calculate assignment completion
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id")
    .eq("group_id", groupId)

  const { data: submittedAssignments } = await supabase
    .from("grades")
    .select("assignment_id")
    .eq("student_id", studentId)
    .eq("group_id", groupId)
    .not("assignment_id", "is", null)

  const assignmentsTotal = assignments?.length || 0
  const assignmentsSubmitted = submittedAssignments?.length || 0
  const assignmentCompletionRate = assignmentsTotal > 0
    ? (assignmentsSubmitted / assignmentsTotal) * 100
    : 0

  // Calculate attendance
  const { data: attendance } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", studentId)

  const classesTotal = attendance?.length || 0
  const classesAttended = attendance?.filter(a => 
    a.status === "present" || a.status === "late" || a.status === "excused"
  ).length || 0
  const attendanceRate = classesTotal > 0
    ? (classesAttended / classesTotal) * 100
    : 0

  // Calculate participation score
  const { data: participation } = await supabase
    .from("participation")
    .select("score")
    .eq("student_id", studentId)
    .eq("group_id", groupId)

  const participationScore = participation && participation.length > 0
    ? participation.reduce((sum, p) => sum + p.score, 0) / participation.length
    : 0

  // Calculate time on task (estimate based on course progress if available)
  let timeOnTaskMinutes = 0
  if (courseId) {
    const { data: progress } = await supabase
      .from("student_course_progress")
      .select("time_spent_minutes")
      .eq("student_id", studentId)
      .eq("course_id", courseId)

    timeOnTaskMinutes = progress?.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0) || 0
  }

  return {
    averageGrade,
    assignmentCompletionRate,
    attendanceRate,
    participationScore,
    timeOnTaskMinutes,
    assignmentsSubmitted,
    assignmentsTotal,
    classesAttended,
    classesTotal,
  }
}

export async function calculateEngagementScore(
  studentId: string,
  groupId: string
): Promise<number> {
  const supabase = createClient()

  // Calculate login frequency based on recent activity
  // Use message activity, assignment submissions, and attendance as proxy for engagement
  const { data: recentActivity } = await supabase
    .from("messages")
    .select("id, created_at")
    .or(`sender_id.eq.${studentId},recipient_id.eq.${studentId}`)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

  const { data: recentSubmissions } = await supabase
    .from("grades")
    .select("created_at")
    .eq("student_id", studentId)
    .eq("group_id", groupId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const { data: recentAttendance } = await supabase
    .from("attendance")
    .select("created_at")
    .eq("student_id", studentId)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  // Count unique days with activity
  const activityDays = new Set()
  recentActivity?.forEach((a) => activityDays.add(a.created_at.split("T")[0]))
  recentSubmissions?.forEach((s) => activityDays.add(s.created_at.split("T")[0]))
  recentAttendance?.forEach((a) => activityDays.add(a.created_at.split("T")[0]))

  const loginFrequency = Math.min(1, activityDays.size / 30) // Normalize to 0-1 scale

  // Calculate assignment engagement
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id")
    .eq("group_id", groupId)

  const { data: submittedAssignments } = await supabase
    .from("grades")
    .select("assignment_id")
    .eq("student_id", studentId)
    .eq("group_id", groupId)
    .not("assignment_id", "is", null)

  const assignmentEngagement = assignments && assignments.length > 0
    ? (submittedAssignments?.length || 0) / assignments.length * 100
    : 0

  // Calculate participation engagement
  const { data: participation } = await supabase
    .from("participation")
    .select("score")
    .eq("student_id", studentId)
    .eq("group_id", groupId)

  const participationEngagement = participation && participation.length > 0
    ? participation.reduce((sum, p) => sum + p.score, 0) / participation.length
    : 0

  // Calculate communication engagement (messages sent/received)
  const { data: messages } = await supabase
    .from("messages")
    .select("id")
    .or(`sender_id.eq.${studentId},recipient_id.eq.${studentId}`)

  const communicationEngagement = messages ? Math.min(messages.length * 2, 100) : 0

  // Weighted overall score
  const overallScore = (
    assignmentEngagement * 0.4 +
    participationEngagement * 0.4 +
    communicationEngagement * 0.2
  )

  return Math.min(100, Math.max(0, overallScore))
}

export async function identifyAtRiskStudents(
  groupId: string
): Promise<Array<{ studentId: string; riskLevel: string; factors: string[]; confidence: number }>> {
  const supabase = createClient()

  // Get all students in the group
  const { data: groupStudents } = await supabase
    .from("group_students")
    .select("student_id")
    .eq("group_id", groupId)

  if (!groupStudents) return []

  const atRiskStudents = []

  for (const { student_id } of groupStudents) {
    const performance = await calculateStudentPerformance(student_id, groupId)
    const engagement = await calculateEngagementScore(student_id, groupId)

    const factors: string[] = []
    let riskScore = 0

    // Check various risk factors
    if (performance.averageGrade < 60) {
      factors.push("Low grades")
      riskScore += 30
    }
    if (performance.attendanceRate < 70) {
      factors.push("Poor attendance")
      riskScore += 25
    }
    if (performance.assignmentCompletionRate < 50) {
      factors.push("Missing assignments")
      riskScore += 20
    }
    if (engagement < 50) {
      factors.push("Low engagement")
      riskScore += 15
    }
    if (performance.participationScore < 50) {
      factors.push("Low participation")
      riskScore += 10
    }

    if (riskScore > 0) {
      let riskLevel = "low"
      if (riskScore >= 70) riskLevel = "critical"
      else if (riskScore >= 50) riskLevel = "high"
      else if (riskScore >= 30) riskLevel = "medium"

      atRiskStudents.push({
        studentId: student_id,
        riskLevel,
        factors,
        confidence: Math.min(100, riskScore + 10), // Add base confidence
      })
    }
  }

  return atRiskStudents
}

export async function updatePerformanceMetrics(
  studentId: string,
  groupId: string,
  courseId?: string
): Promise<void> {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const performance = await calculateStudentPerformance(studentId, groupId, courseId)

  // Upsert performance metrics
  await supabase
    .from("student_performance_metrics")
    .upsert({
      student_id: studentId,
      group_id: groupId,
      course_id: courseId || null,
      metric_date: today,
      average_grade: performance.averageGrade,
      assignment_completion_rate: performance.assignmentCompletionRate,
      attendance_rate: performance.attendanceRate,
      participation_score: performance.participationScore,
      time_on_task_minutes: performance.timeOnTaskMinutes,
      assignments_submitted: performance.assignmentsSubmitted,
      assignments_total: performance.assignmentsTotal,
      classes_attended: performance.classesAttended,
      classes_total: performance.classesTotal,
    }, {
      onConflict: "student_id,group_id,course_id,metric_date"
    })
}

export async function updateEngagementScores(
  studentId: string,
  groupId: string
): Promise<void> {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const engagement = await calculateEngagementScore(studentId, groupId)

  // Upsert engagement score
  await supabase
    .from("student_engagement_scores")
    .upsert({
      student_id: studentId,
      group_id: groupId,
      score_date: today,
      overall_score: engagement,
    }, {
      onConflict: "student_id,group_id,score_date"
    })
}



