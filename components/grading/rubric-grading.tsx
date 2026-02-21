"use client"

import { useState, useEffect } from "react"
import type { Rubric, RubricCriterion, RubricGrade, User, Assignment } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, CheckCircle, AlertCircle, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingState } from "@/components/ui/loading-state"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

interface RubricGradingProps {
  assignment: Assignment
  student: User
  rubric: Rubric
  currentUserId: string
  onGradeSaved?: () => void
}

export function RubricGrading({ assignment, student, rubric, currentUserId, onGradeSaved }: RubricGradingProps) {
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadExistingGrades()
  }, [assignment.id, student.id, rubric.id])

  const loadExistingGrades = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: gradesError } = await supabase
        .from("rubric_grades")
        .select("*")
        .eq("assignment_id", assignment.id)
        .eq("student_id", student.id)
        .eq("rubric_id", rubric.id)

      if (gradesError) {
        console.error("Error loading grades:", gradesError)
        setError(gradesError.message)
        return
      }

      // Initialize grades map
      const gradesMap: Record<string, { points: number; feedback: string }> = {}
      if (data) {
        data.forEach((grade) => {
          gradesMap[grade.criterion_id] = {
            points: grade.points_awarded,
            feedback: grade.feedback || "",
          }
        })
      }

      // Initialize empty grades for criteria that don't have grades yet
      rubric.criteria?.forEach((criterion) => {
        if (!gradesMap[criterion.id]) {
          gradesMap[criterion.id] = { points: 0, feedback: "" }
        }
      })

      setGrades(gradesMap)
    } catch (err) {
      console.error("Unexpected error loading grades:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGradeChange = (criterionId: string, points: number) => {
    const criterion = rubric.criteria?.find((c) => c.id === criterionId)
    if (!criterion) return

    // Ensure points don't exceed max
    const clampedPoints = Math.max(0, Math.min(points, criterion.max_points))
    setGrades({
      ...grades,
      [criterionId]: {
        ...grades[criterionId],
        points: clampedPoints,
      },
    })
  }

  const handleFeedbackChange = (criterionId: string, feedback: string) => {
    setGrades({
      ...grades,
      [criterionId]: {
        ...grades[criterionId],
        feedback,
      },
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()

      // Save or update grades for each criterion
      const savePromises = Object.entries(grades).map(async ([criterionId, gradeData]) => {
        // Check if grade already exists
        const { data: existing } = await supabase
          .from("rubric_grades")
          .select("id")
          .eq("assignment_id", assignment.id)
          .eq("student_id", student.id)
          .eq("criterion_id", criterionId)
          .single()

        if (existing) {
          // Update existing grade
          return supabase
            .from("rubric_grades")
            .update({
              points_awarded: gradeData.points,
              feedback: gradeData.feedback || null,
              graded_by: currentUserId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
        } else {
          // Insert new grade
          return supabase.from("rubric_grades").insert({
            rubric_id: rubric.id,
            student_id: student.id,
            assignment_id: assignment.id,
            criterion_id: criterionId,
            points_awarded: gradeData.points,
            feedback: gradeData.feedback || null,
            graded_by: currentUserId,
          })
        }
      })

      const results = await Promise.all(savePromises)
      const errors = results.filter((r) => r.error)

      if (errors.length > 0) {
        console.error("Errors saving grades:", errors)
        toast({
          title: "Error",
          description: "Some grades could not be saved",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Grades saved successfully",
      })

      if (onGradeSaved) {
        onGradeSaved()
      }
    } catch (err) {
      console.error("Unexpected error saving grades:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const calculateTotalPoints = () => {
    return Object.values(grades).reduce((sum, grade) => sum + grade.points, 0)
  }

  const calculateMaxPoints = () => {
    return (rubric.criteria || []).reduce((sum, criterion) => sum + criterion.max_points, 0)
  }

  const calculatePercentage = () => {
    const max = calculateMaxPoints()
    if (max === 0) return 0
    return (calculateTotalPoints() / max) * 100
  }

  if (loading) {
    return <LoadingState message="Loading grades..." />
  }

  const totalPoints = calculateTotalPoints()
  const maxPoints = calculateMaxPoints()
  const percentage = calculatePercentage()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Grade: {student.full_name}</CardTitle>
            <CardDescription>
              {assignment.title} • Using rubric: {rubric.name}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{totalPoints.toFixed(1)} / {maxPoints.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {rubric.criteria?.map((criterion) => {
            const grade = grades[criterion.id] || { points: 0, feedback: "" }
            const percentageForCriterion = criterion.max_points > 0 
              ? (grade.points / criterion.max_points) * 100 
              : 0

            return (
              <Card key={criterion.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{criterion.name}</CardTitle>
                      {criterion.description && (
                        <CardDescription className="mt-1">{criterion.description}</CardDescription>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {grade.points.toFixed(1)} / {criterion.max_points.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentageForCriterion.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`points-${criterion.id}`}>
                      Points (0 - {criterion.max_points})
                    </Label>
                    <Input
                      id={`points-${criterion.id}`}
                      type="number"
                      min="0"
                      max={criterion.max_points}
                      step="0.5"
                      value={grade.points}
                      onChange={(e) => handleGradeChange(criterion.id, parseFloat(e.target.value) || 0)}
                    />
                    <Progress value={percentageForCriterion} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`feedback-${criterion.id}`}>Feedback</Label>
                    <Textarea
                      id={`feedback-${criterion.id}`}
                      placeholder="Add feedback for this criterion..."
                      value={grade.feedback}
                      onChange={(e) => handleFeedbackChange(criterion.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={loadExistingGrades}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="mr-2">Saving...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Grades
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}








