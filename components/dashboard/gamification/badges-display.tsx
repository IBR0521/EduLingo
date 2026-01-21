"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Lock } from "lucide-react"
import { BADGES } from "@/lib/gamification"
import { getUserBadgesClient } from "@/lib/gamification-client"

interface BadgesDisplayProps {
  userId: string
}

export function BadgesDisplay({ userId }: BadgesDisplayProps) {
  const [earnedBadges, setEarnedBadges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBadges()
  }, [userId])

  const loadBadges = async () => {
    setLoading(true)
    try {
      const badges = await getUserBadgesClient(userId)
      setEarnedBadges(badges.map((b) => b.badge_id))
    } catch (error) {
      console.error("Error loading badges:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Badges & Achievements</CardTitle>
          <CardDescription>Your earned achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const earnedCount = earnedBadges.length
  const totalCount = BADGES.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Badges & Achievements
        </CardTitle>
        <CardDescription>
          {earnedCount} of {totalCount} badges earned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BADGES.map((badge) => {
            const isEarned = earnedBadges.includes(badge.id)
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                  isEarned
                    ? "border-primary bg-primary/5 hover:bg-primary/10"
                    : "border-muted bg-muted/30 opacity-60"
                }`}
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <div className="text-center">
                  <div className={`font-semibold text-sm mb-1 ${isEarned ? "" : "text-muted-foreground"}`}>
                    {badge.name}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{badge.requirement}</div>
                  {isEarned ? (
                    <Badge variant="default" className="text-xs">
                      Earned
                    </Badge>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Locked
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

