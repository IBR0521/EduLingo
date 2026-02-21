"use client"

import { createClient } from "@/lib/supabase/client"
import { POINTS, BADGES, calculateLevel } from "@/lib/gamification"

/**
 * Client-side function to award points
 */
export async function awardPointsClient({
  userId,
  points,
  source,
  sourceId,
  description,
}: {
  userId: string
  points: number
  source: string
  sourceId?: string
  description?: string
}) {
  try {
    const supabase = createClient()

    // Record points in history
    await supabase.from("points_history").insert({
      user_id: userId,
      points,
      source,
      source_id: sourceId,
      description,
    })

    // Get or create user progress
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

      await supabase
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

      // Check for badges (simplified client-side check)
      await checkBadgesClient(userId, newPoints, newStreak)
    } else {
      // Create new progress record
      await supabase.from("user_progress").insert({
        user_id: userId,
        total_points: points,
        current_level: 1,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Error awarding points:", error)
    return { success: false, error }
  }
}

/**
 * Simplified badge checking on client side
 */
async function checkBadgesClient(userId: string, totalPoints: number, streak: number) {
  try {
    const supabase = createClient()

    // Get earned badges
    const { data: earnedBadges } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId)

    const earnedBadgeIds = earnedBadges?.map((b) => b.badge_id) || []
    const badgesToAward: string[] = []

    // Check streak badges
    if (streak >= 7 && !earnedBadgeIds.includes("week_warrior")) {
      badgesToAward.push("week_warrior")
    }
    if (streak >= 30 && !earnedBadgeIds.includes("month_master")) {
      badgesToAward.push("month_master")
    }

    // Award badges
    if (badgesToAward.length > 0) {
      const badgeInserts = badgesToAward.map((badgeId) => ({
        user_id: userId,
        badge_id: badgeId,
      }))

      await supabase.from("user_badges").insert(badgeInserts)

      // Create notifications
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
 * Get user progress (client-side)
 */
export async function getUserProgressClient(userId: string) {
  try {
    const supabase = createClient()

    const { data: progress, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
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
 * Get user badges (client-side)
 */
export async function getUserBadgesClient(userId: string) {
  try {
    const supabase = createClient()

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









