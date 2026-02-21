"use server"

import { createClient } from "@/lib/supabase/server"
import { POINTS, BADGES, calculateLevel } from "@/lib/gamification"

export interface AwardPointsParams {
  userId: string
  points: number
  source: string
  sourceId?: string
  description?: string
}

/**
 * Award points to a user and update their progress
 */
export async function awardPoints({ userId, points, source, sourceId, description }: AwardPointsParams) {
  try {
    const supabase = await createClient()

    // Record points in history
    const { error: historyError } = await supabase.from("points_history").insert({
      user_id: userId,
      points,
      source,
      source_id: sourceId,
      description,
    })

    if (historyError) {
      console.error("Error recording points history:", historyError)
    }

    // Update or create user progress
    const { data: existingProgress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .single()

    const today = new Date().toISOString().split("T")[0]

    if (existingProgress) {
      // Calculate streak
      let newStreak = existingProgress.current_streak || 0
      const lastActivity = existingProgress.last_activity_date
        ? new Date(existingProgress.last_activity_date).toISOString().split("T")[0]
        : null

      if (lastActivity) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split("T")[0]

        if (lastActivity === yesterdayStr || lastActivity === today) {
          newStreak = (existingProgress.current_streak || 0) + 1
        } else {
          newStreak = 1
        }
      } else {
        newStreak = 1
      }

      const newPoints = (existingProgress.total_points || 0) + points
      const newLevel = calculateLevel(newPoints)
      const longestStreak = Math.max(newStreak, existingProgress.longest_streak || 0)

      const { error: updateError } = await supabase
        .from("user_progress")
        .update({
          total_points: newPoints,
          current_level: newLevel,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (updateError) {
        console.error("Error updating user progress:", updateError)
        return { success: false, error: updateError }
      }
    } else {
      // Create new progress record
      const { error: createError } = await supabase.from("user_progress").insert({
        user_id: userId,
        total_points: points,
        current_level: 1,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      })

      if (createError) {
        console.error("Error creating user progress:", createError)
        return { success: false, error: createError }
      }
    }

    // Check for badge achievements
    await checkAndAwardBadges(userId)

    return { success: true }
  } catch (error) {
    console.error("Error awarding points:", error)
    return { success: false, error }
  }
}

/**
 * Check if user qualifies for any badges and award them
 */
async function checkAndAwardBadges(userId: string) {
  try {
    const supabase = await createClient()

    // Get user progress and activity data
    const [progressResult, badgesResult, assignmentsResult, attendanceResult, gradesResult] = await Promise.all([
      supabase.from("user_progress").select("*").eq("user_id", userId).single(),
      supabase.from("user_badges").select("badge_id").eq("user_id", userId),
      supabase
        .from("files")
        .select("id, created_at, assignment_id")
        .eq("uploaded_by", userId),
      supabase
        .from("attendance")
        .select("id, status, created_at")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("grades").select("score").eq("student_id", userId),
    ])

    const progress = progressResult.data
    const earnedBadges = badgesResult.data?.map((b) => b.badge_id) || []
    const assignments = assignmentsResult.data || []
    const attendance = attendanceResult.data || []
    const grades = gradesResult.data || []

    if (!progress) return

    // Check each badge
    const badgesToAward: string[] = []

    // First assignment badge
    if (assignments.length >= 1 && !earnedBadges.includes("first_assignment")) {
      badgesToAward.push("first_assignment")
    }

    // Perfect attendance badge (10 consecutive)
    if (attendance.length >= 10) {
      const last10 = attendance.slice(0, 10)
      const allPresent = last10.every((a) => a.status === "present" || a.status === "late")
      if (allPresent && !earnedBadges.includes("perfect_attendance")) {
        badgesToAward.push("perfect_attendance")
      }
    }

    // Top student badge (90% average)
    if (grades.length > 0) {
      const average = grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length
      if (average >= 90 && !earnedBadges.includes("top_student")) {
        badgesToAward.push("top_student")
      }
    }

    // Week warrior badge (7 day streak)
    if (progress.current_streak >= 7 && !earnedBadges.includes("week_warrior")) {
      badgesToAward.push("week_warrior")
    }

    // Month master badge (30 day streak)
    if (progress.current_streak >= 30 && !earnedBadges.includes("month_master")) {
      badgesToAward.push("month_master")
    }

    // Assignment king badge (50 assignments)
    if (assignments.length >= 50 && !earnedBadges.includes("assignment_king")) {
      badgesToAward.push("assignment_king")
    }

    // Award badges
    if (badgesToAward.length > 0) {
      const badgeInserts = badgesToAward.map((badgeId) => ({
        user_id: userId,
        badge_id: badgeId,
      }))

      await supabase.from("user_badges").insert(badgeInserts)

      // Create notifications for new badges
      const badgeNotifications = badgesToAward.map((badgeId) => {
        const badge = BADGES.find((b) => b.id === badgeId)
        return {
          user_id: userId,
          title: "New Badge Earned!",
          message: `Congratulations! You earned the "${badge?.name}" badge: ${badge?.description}`,
          type: "achievement",
        }
      })

      await supabase.from("notifications").insert(badgeNotifications)
    }
  } catch (error) {
    console.error("Error checking badges:", error)
  }
}

/**
 * Get user progress data
 */
export async function getUserProgress(userId: string) {
  try {
    const supabase = await createClient()

    const { data: progress, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" which is okay for new users
      console.error("Error fetching user progress:", error)
      return null
    }

    return progress
  } catch (error) {
    console.error("Error getting user progress:", error)
    return null
  }
}

/**
 * Get user badges
 */
export async function getUserBadges(userId: string) {
  try {
    const supabase = await createClient()

    const { data: badges, error } = await supabase
      .from("user_badges")
      .select("badge_id, earned_at")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false })

    if (error) {
      console.error("Error fetching user badges:", error)
      return []
    }

    return badges || []
  } catch (error) {
    console.error("Error getting user badges:", error)
    return []
  }
}

/**
 * Get leaderboard for a group
 */
export async function getGroupLeaderboard(groupId: string, limit: number = 10) {
  try {
    const supabase = await createClient()

    // Get all students in the group
    const { data: groupStudents } = await supabase
      .from("group_students")
      .select("student_id")
      .eq("group_id", groupId)

    if (!groupStudents || groupStudents.length === 0) {
      return []
    }

    const studentIds = groupStudents.map((gs) => gs.student_id)

    // Get progress for all students
    const { data: progress, error } = await supabase
      .from("user_progress")
      .select("user_id, total_points, current_level, current_streak")
      .in("user_id", studentIds)
      .order("total_points", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching leaderboard:", error)
      return []
    }

    // Get user names
    const userIds = progress?.map((p) => p.user_id) || []
    if (userIds.length === 0) return []

    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", userIds)

    // Combine data
    const leaderboard = progress?.map((p, index) => {
      const user = users?.find((u) => u.id === p.user_id)
      return {
        rank: index + 1,
        userId: p.user_id,
        userName: user?.full_name || "Unknown",
        points: p.total_points || 0,
        level: p.current_level || 1,
        streak: p.current_streak || 0,
      }
    })

    return leaderboard || []
  } catch (error) {
    console.error("Error getting leaderboard:", error)
    return []
  }
}









