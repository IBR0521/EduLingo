"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Award } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { calculateLevel } from "@/lib/gamification"

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  points: number
  level: number
  streak: number
}

interface LeaderboardProps {
  groupId: string
}

export function Leaderboard({ groupId }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [groupId])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Get all students in the group
      const { data: groupStudents } = await supabase
        .from("group_students")
        .select("student_id")
        .eq("group_id", groupId)

      if (!groupStudents || groupStudents.length === 0) {
        setLeaderboard([])
        return
      }

      const studentIds = groupStudents.map((gs) => gs.student_id)

      // Get progress for all students
      const { data: progress, error } = await supabase
        .from("user_progress")
        .select("user_id, total_points, current_level, current_streak")
        .in("user_id", studentIds)
        .order("total_points", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error fetching leaderboard:", error)
        setLeaderboard([])
        return
      }

      if (!progress || progress.length === 0) {
        setLeaderboard([])
        return
      }

      // Get user names
      const userIds = progress.map((p) => p.user_id)
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", userIds)

      // Combine data
      const leaderboardData = progress.map((p, index) => {
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

      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error("Error loading leaderboard:", error)
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
    return null
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-50 border-yellow-200"
    if (rank === 2) return "bg-gray-50 border-gray-200"
    if (rank === 3) return "bg-amber-50 border-amber-200"
    return ""
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Top performers in this group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Top performers in this group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No rankings yet. Start earning points to appear on the leaderboard!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
        <CardDescription>Top performers in this group</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`flex items-center justify-between p-3 rounded-lg border ${getRankColor(entry.rank)}`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background font-bold">
                  {getRankIcon(entry.rank) || <span className="text-sm">{entry.rank}</span>}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{entry.userName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    Level {entry.level}
                    {entry.streak > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        🔥 {entry.streak} day streak
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{entry.points}</div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

