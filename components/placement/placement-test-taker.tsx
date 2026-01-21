"use client"

import { useState, useEffect } from "react"
import type { PlacementTest, PlacementTestQuestion, PlacementTestResult, PlacementTestAnswer } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingState } from "@/components/ui/loading-state"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PlacementTestTakerProps {
  test: PlacementTest
  studentId: string
  onComplete?: (result: PlacementTestResult) => void
}

export function PlacementTestTaker({ test, studentId, onComplete }: PlacementTestTakerProps) {
  const [questions, setQuestions] = useState<PlacementTestQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<PlacementTestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [test.id])

  useEffect(() => {
    if (test.duration_minutes && timeRemaining !== null) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(timer)
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [test.duration_minutes, timeRemaining])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("placement_test_questions")
        .select("*")
        .eq("test_id", test.id)
        .order("order_index", { ascending: true })

      if (error) {
        console.error("Error loading questions:", error)
        toast.error("Failed to load test questions", {
          description: error.message || "Please try again",
        })
        setLoading(false)
        return
      }

      setQuestions(data || [])
      
      // Initialize timer
      if (test.duration_minutes) {
        setTimeRemaining(test.duration_minutes * 60)
      }

      // Check for existing result
      const { data: existingResult } = await supabase
        .from("placement_test_results")
        .select("*")
        .eq("test_id", test.id)
        .eq("student_id", studentId)
        .single()

      if (existingResult && !existingResult.is_completed) {
        // Load existing answers
        const { data: existingAnswers, error: answersError } = await supabase
          .from("placement_test_answers")
          .select("*")
          .eq("result_id", existingResult.id)

        if (answersError) {
          console.error("Error loading existing answers:", answersError)
        }

        const answersMap: Record<string, string> = {}
        existingAnswers?.forEach((answer) => {
          answersMap[answer.question_id] = answer.student_answer || ""
        })

        setAnswers(answersMap)
        setResult(existingResult)
      } else if (!existingResult) {
        // Create new result
        const { data: newResult, error: createError } = await supabase
          .from("placement_test_results")
          .insert({
            test_id: test.id,
            student_id: studentId,
            score: 0,
            total_points: (data || []).reduce((sum, q) => sum + q.points, 0),
            earned_points: 0,
            is_completed: false,
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating result:", createError)
          toast.error("Failed to initialize test", {
            description: createError.message || "Please try again",
          })
          setLoading(false)
          return
        }

        setResult(newResult)
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    })
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleAutoSubmit = async () => {
    if (submitting) return
    await submitTest(true)
  }

  const submitTest = async (autoSubmit = false) => {
    if (!result) return

    setSubmitting(true)
    try {
      const supabase = createClient()

      // Calculate score
      let earnedPoints = 0
      const answerPromises: Promise<any>[] = []

      for (const question of questions) {
        const studentAnswer = answers[question.id] || ""
        const isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
        const pointsEarned = isCorrect ? question.points : 0
        earnedPoints += pointsEarned

        // Save or update answer
        const { data: existingAnswer } = await supabase
          .from("placement_test_answers")
          .select("id")
          .eq("result_id", result.id)
          .eq("question_id", question.id)
          .single()

        if (existingAnswer) {
          answerPromises.push(
            supabase
              .from("placement_test_answers")
              .update({
                student_answer: studentAnswer,
                is_correct: isCorrect,
                points_earned: pointsEarned,
              })
              .eq("id", existingAnswer.id)
          )
        } else {
          answerPromises.push(
            supabase.from("placement_test_answers").insert({
              result_id: result.id,
              question_id: question.id,
              student_answer: studentAnswer,
              is_correct: isCorrect,
              points_earned: pointsEarned,
            })
          )
        }
      }

      await Promise.all(answerPromises)

      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

      // Determine recommended level based on score
      let recommendedLevel = "beginner"
      if (score >= 90) recommendedLevel = "advanced"
      else if (score >= 75) recommendedLevel = "upper-intermediate"
      else if (score >= 60) recommendedLevel = "intermediate"
      else if (score >= 40) recommendedLevel = "elementary"

      const timeTaken = test.duration_minutes && timeRemaining !== null
        ? test.duration_minutes * 60 - timeRemaining
        : null

      // Update result
      const { data: updatedResult, error: updateError } = await supabase
        .from("placement_test_results")
        .update({
          score,
          earned_points: earnedPoints,
          recommended_level: recommendedLevel,
          time_taken_minutes: timeTaken ? Math.floor(timeTaken / 60) : null,
          completed_at: new Date().toISOString(),
          is_completed: true,
        })
        .eq("id", result.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating result:", updateError)
        toast.error("Failed to submit test", {
          description: updateError.message || "Please try again",
        })
        setSubmitting(false)
        return
      }

      setResult(updatedResult)
      setShowResults(true)

      if (onComplete) {
        onComplete(updatedResult)
      }

      if (!autoSubmit) {
        toast.success("Test submitted successfully")
      } else {
        toast.info("Test automatically submitted", {
          description: "Time limit reached",
        })
      }
    } catch (error) {
      console.error("Unexpected error submitting test:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return <LoadingState message="Loading test..." />
  }

  if (showResults && result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>{test.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Score</div>
              <div className="text-2xl font-bold">{result.score.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Points</div>
              <div className="text-2xl font-bold">
                {result.earned_points.toFixed(1)} / {result.total_points.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Recommended Level</div>
              <div className="text-2xl font-bold capitalize">{result.recommended_level || "N/A"}</div>
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Placement Recommendation</AlertTitle>
            <AlertDescription>
              Based on your score, we recommend starting at the{" "}
              <strong>{result.recommended_level || "beginner"}</strong> level.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No questions available for this test</p>
        </CardContent>
      </Card>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).filter((key) => answers[key]).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{test.name}</CardTitle>
            <CardDescription>
              Question {currentQuestionIndex + 1} of {questions.length}
            </CardDescription>
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">{currentQuestion.question_text}</Label>
            {currentQuestion.explanation && (
              <p className="text-sm text-muted-foreground mt-1">{currentQuestion.explanation}</p>
            )}
          </div>

          {currentQuestion.question_type === "multiple_choice" && currentQuestion.options && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.question_type === "true_false" && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">
                  False
                </Label>
              </div>
            </RadioGroup>
          )}

          {(currentQuestion.question_type === "fill_blank" || currentQuestion.question_type === "essay") && (
            <Textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder={
                currentQuestion.question_type === "fill_blank"
                  ? "Enter your answer"
                  : "Write your answer here"
              }
              rows={currentQuestion.question_type === "essay" ? 6 : 3}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>
            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={() => submitTest()} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Test"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



