"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Zap, Flame } from "lucide-react"
import { getLevelName, getPointsToNextLevel, calculateLevel } from "@/lib/gamification"

interface ProgressBadgeProps {
  points: number
  level: number
  streak?: number
  showProgress?: boolean
}

export function ProgressBadge({ points, level, streak = 0, showProgress = true }: ProgressBadgeProps) {
  const currentLevel = calculateLevel(points)
  const levelName = getLevelName(currentLevel)
  const pointsToNext = getPointsToNextLevel(points)
  const nextLevel = currentLevel + 1
  const currentLevelData = calculateLevel(points)
  const nextLevelPoints = currentLevel < 8 ? (currentLevel + 1) * 100 : 0
  const progressPercent = currentLevel < 8 
    ? ((points % (nextLevelPoints - (currentLevel * 100))) / (nextLevelPoints - (currentLevel * 100))) * 100 
    : 100

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <div>
          <div className="text-sm font-semibold">Level {currentLevel}</div>
          <div className="text-xs text-muted-foreground">{levelName}</div>
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">{points} points</span>
          {pointsToNext > 0 && (
            <span className="text-muted-foreground">{pointsToNext} to Level {nextLevel}</span>
          )}
        </div>
        {showProgress && pointsToNext > 0 && (
          <Progress value={Math.min(progressPercent, 100)} className="h-2" />
        )}
      </div>

      {streak > 0 && (
        <div className="flex items-center gap-1">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold">{streak}</span>
        </div>
      )}
    </div>
  )
}









