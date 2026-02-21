// Gamification system for the platform

export interface UserProgress {
  userId: string
  totalPoints: number
  currentLevel: number
  badges: string[]
  streak: number
  lastActivityDate: string | null
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement: string
}

export const BADGES: Badge[] = [
  { id: "first_assignment", name: "First Steps", description: "Complete your first assignment", icon: "🎯", requirement: "Complete 1 assignment" },
  { id: "perfect_attendance", name: "Perfect Attendance", description: "Attend 10 classes without missing", icon: "⭐", requirement: "10 consecutive classes" },
  { id: "top_student", name: "Top Student", description: "Achieve 90% average grade", icon: "🏆", requirement: "90% average grade" },
  { id: "week_warrior", name: "Week Warrior", description: "7-day activity streak", icon: "🔥", requirement: "7 day streak" },
  { id: "month_master", name: "Month Master", description: "30-day activity streak", icon: "💎", requirement: "30 day streak" },
  { id: "assignment_king", name: "Assignment King", description: "Complete 50 assignments", icon: "👑", requirement: "50 assignments" },
  { id: "early_bird", name: "Early Bird", description: "Submit 10 assignments early", icon: "🐦", requirement: "10 early submissions" },
  { id: "helper", name: "Helper", description: "Help 5 classmates", icon: "🤝", requirement: "Help 5 classmates" },
]

export const POINTS = {
  ASSIGNMENT_COMPLETE: 10,
  ASSIGNMENT_EARLY: 5,
  CLASS_ATTEND: 5,
  PERFECT_ATTENDANCE: 20,
  GRADE_90_PLUS: 15,
  GRADE_80_PLUS: 10,
  DAILY_LOGIN: 2,
  STREAK_BONUS: 5,
}

export const LEVELS = [
  { level: 1, pointsRequired: 0, name: "Beginner" },
  { level: 2, pointsRequired: 100, name: "Learner" },
  { level: 3, pointsRequired: 250, name: "Student" },
  { level: 4, pointsRequired: 500, name: "Scholar" },
  { level: 5, pointsRequired: 1000, name: "Expert" },
  { level: 6, pointsRequired: 2000, name: "Master" },
  { level: 7, pointsRequired: 3500, name: "Grandmaster" },
  { level: 8, pointsRequired: 5000, name: "Legend" },
]

export function calculateLevel(totalPoints: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].pointsRequired) {
      return LEVELS[i].level
    }
  }
  return 1
}

export function getLevelName(level: number): string {
  const levelData = LEVELS.find((l) => l.level === level)
  return levelData?.name || "Beginner"
}

export function getPointsToNextLevel(currentPoints: number): number {
  const currentLevel = calculateLevel(currentPoints)
  if (currentLevel >= LEVELS.length) {
    return 0 // Max level
  }
  const nextLevel = LEVELS[currentLevel]
  return nextLevel.pointsRequired - currentPoints
}

export function calculateStreak(lastActivityDate: string | null, currentDate: Date = new Date()): number {
  if (!lastActivityDate) return 0
  
  const lastDate = new Date(lastActivityDate)
  const today = new Date(currentDate)
  today.setHours(0, 0, 0, 0)
  lastDate.setHours(0, 0, 0, 0)
  
  const diffTime = today.getTime() - lastDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // If last activity was yesterday, continue streak
  if (diffDays === 1) return 1
  // If last activity was today, maintain current streak (would need to be passed)
  if (diffDays === 0) return 1
  // Otherwise, streak is broken
  return 0
}









