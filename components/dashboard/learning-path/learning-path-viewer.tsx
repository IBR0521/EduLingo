"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Lock, PlayCircle, BookOpen, Clock, FileText, Video, Link as LinkIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { toast } from "sonner"

interface Module {
  id: string
  title: string
  description: string | null
  order_index: number
  is_published: boolean
  lessons?: Lesson[]
  progress?: ModuleProgress
}

interface Lesson {
  id: string
  title: string
  description: string | null
  order_index: number
  estimated_duration_minutes: number
  is_published: boolean
  progress?: LessonProgress
  materials?: Material[]
}

interface Material {
  id: string
  title: string
  description: string | null
  material_type: string
  file_url: string | null
  external_url: string | null
  duration_minutes: number | null
  is_required: boolean
}

interface ModuleProgress {
  completed_lessons: number
  total_lessons: number
  progress_percentage: number
}

interface LessonProgress {
  status: string
  progress_percentage: number
  completed_at: string | null
}

interface LearningPathViewerProps {
  groupId: string
  studentId: string
}

export function LearningPathViewer({ groupId, studentId }: LearningPathViewerProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  useEffect(() => {
    loadLearningPath()
  }, [groupId, studentId])

  const loadLearningPath = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Load modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .eq("group_id", groupId)
        .eq("is_published", true)
        .order("order_index", { ascending: true })

      if (modulesError) {
        console.error("Error loading modules:", modulesError)
        return
      }

      if (!modulesData || modulesData.length === 0) {
        setModules([])
        return
      }

      // Load lessons for each module
      const modulesWithLessons = await Promise.all(
        modulesData.map(async (module) => {
          const { data: lessonsData } = await supabase
            .from("lessons")
            .select("*")
            .eq("module_id", module.id)
            .eq("is_published", true)
            .order("order_index", { ascending: true })

          // Load student progress for lessons
          const lessonIds = lessonsData?.map((l) => l.id) || []
          let progressData: any[] = []
          if (lessonIds.length > 0) {
            const { data } = await supabase
              .from("student_progress")
              .select("*")
              .eq("student_id", studentId)
              .in("lesson_id", lessonIds)

            progressData = data || []
          }

          // Load materials for each lesson
          const lessonsWithMaterials = await Promise.all(
            (lessonsData || []).map(async (lesson) => {
              const { data: materialsData } = await supabase
                .from("course_materials")
                .select("*")
                .eq("lesson_id", lesson.id)
                .order("order_index", { ascending: true })

              const lessonProgress = progressData.find((p) => p.lesson_id === lesson.id)

              return {
                ...lesson,
                materials: materialsData || [],
                progress: lessonProgress
                  ? {
                      status: lessonProgress.status,
                      progress_percentage: lessonProgress.progress_percentage || 0,
                      completed_at: lessonProgress.completed_at,
                    }
                  : undefined,
              }
            })
          )

          // Calculate module progress
          const completedLessons = lessonsWithMaterials.filter(
            (l) => l.progress?.status === "completed"
          ).length
          const totalLessons = lessonsWithMaterials.length
          const moduleProgress = {
            completed_lessons: completedLessons,
            total_lessons: totalLessons,
            progress_percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          }

          return {
            ...module,
            lessons: lessonsWithMaterials,
            progress: moduleProgress,
          }
        })
      )

      setModules(modulesWithLessons)
      if (modulesWithLessons.length > 0 && !selectedModule) {
        setSelectedModule(modulesWithLessons[0].id)
      }
    } catch (error) {
      console.error("Error loading learning path:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartLesson = async (lessonId: string) => {
    try {
      const supabase = createClient()

      // Check if progress exists
      const { data: existing } = await supabase
        .from("student_progress")
        .select("*")
        .eq("student_id", studentId)
        .eq("lesson_id", lessonId)
        .single()

      if (existing) {
        // Update to in_progress
        await supabase
          .from("student_progress")
          .update({
            status: "in_progress",
            last_accessed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        // Create new progress
        await supabase.from("student_progress").insert({
          student_id: studentId,
          lesson_id: lessonId,
          status: "in_progress",
          progress_percentage: 0,
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })
      }

      loadLearningPath()
    } catch (error) {
      console.error("Error starting lesson:", error)
    }
  }

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      const supabase = createClient()

      const { data: existing, error: fetchError } = await supabase
        .from("student_progress")
        .select("*")
        .eq("student_id", studentId)
        .eq("lesson_id", lessonId)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows found, which is OK
        console.error("Error fetching progress:", fetchError)
        toast.error("Failed to check lesson progress", {
          description: fetchError.message || "Please try again",
        })
        return
      }

      const updateData = {
        status: "completed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("student_progress")
          .update(updateData)
          .eq("id", existing.id)

        if (updateError) {
          console.error("Error updating progress:", updateError)
          toast.error("Failed to mark lesson as complete", {
            description: updateError.message || "Please try again",
          })
          return
        }
      } else {
        const { error: insertError } = await supabase.from("student_progress").insert({
          student_id: studentId,
          lesson_id: lessonId,
          ...updateData,
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })

        if (insertError) {
          console.error("Error creating progress:", insertError)
          toast.error("Failed to mark lesson as complete", {
            description: insertError.message || "Please try again",
          })
          return
        }
      }

      toast.success("Lesson completed!", {
        description: "Your progress has been saved.",
      })
      loadLearningPath()
    } catch (error) {
      console.error("Unexpected error completing lesson:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "link":
        return <LinkIcon className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return <LoadingState message="Loading learning path..." />
  }

  if (modules.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-12 w-12" />}
        title="No learning path available"
        description="Your teacher hasn't set up a learning path for this course yet."
      />
    )
  }

  const currentModule = modules.find((m) => m.id === selectedModule) || modules[0]

  return (
    <div className="space-y-6">
      {/* Module Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {modules.map((module) => (
          <Button
            key={module.id}
            variant={selectedModule === module.id ? "default" : "outline"}
            onClick={() => setSelectedModule(module.id)}
            className="whitespace-nowrap"
          >
            {module.title}
            {module.progress && (
              <Badge variant="secondary" className="ml-2">
                {module.progress.completed_lessons}/{module.progress.total_lessons}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Current Module */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{currentModule.title}</CardTitle>
              {currentModule.description && (
                <CardDescription className="mt-2">{currentModule.description}</CardDescription>
              )}
            </div>
            {currentModule.progress && (
              <div className="text-right">
                <div className="text-sm font-semibold">{currentModule.progress.progress_percentage}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            )}
          </div>
          {currentModule.progress && (
            <Progress value={currentModule.progress.progress_percentage} className="mt-4" />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentModule.lessons && currentModule.lessons.length > 0 ? (
              currentModule.lessons.map((lesson, index) => {
                const isCompleted = lesson.progress?.status === "completed"
                const isInProgress = lesson.progress?.status === "in_progress"
                const isLocked = lesson.progress?.status === "locked" || false

                return (
                  <Card key={lesson.id} className={isCompleted ? "border-green-200 bg-green-50/50" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : isLocked ? (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <PlayCircle className="h-5 w-5 text-primary" />
                            )}
                            <h3 className="font-semibold text-lg">{lesson.title}</h3>
                            {isCompleted && <Badge variant="default">Completed</Badge>}
                            {isInProgress && <Badge variant="secondary">In Progress</Badge>}
                          </div>
                          {lesson.description && (
                            <p className="text-sm text-muted-foreground mb-3">{lesson.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {lesson.estimated_duration_minutes} min
                            </div>
                            {lesson.progress && (
                              <div>Progress: {lesson.progress.progress_percentage}%</div>
                            )}
                          </div>
                          {lesson.progress && lesson.progress.progress_percentage > 0 && (
                            <Progress value={lesson.progress.progress_percentage} className="mb-4" />
                          )}

                          {/* Materials */}
                          {lesson.materials && lesson.materials.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <div className="text-sm font-semibold">Materials:</div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {lesson.materials.map((material) => (
                                  <div
                                    key={material.id}
                                    className="flex items-center gap-2 p-2 rounded border bg-background"
                                  >
                                    {getMaterialIcon(material.material_type)}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{material.title}</div>
                                      {material.description && (
                                        <div className="text-xs text-muted-foreground truncate">
                                          {material.description}
                                        </div>
                                      )}
                                    </div>
                                    {material.external_url && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="shrink-0"
                                      >
                                        <a href={material.external_url} target="_blank" rel="noopener noreferrer">
                                          Open
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-4">
                            {!isLocked && !isCompleted && (
                              <Button
                                onClick={() => handleStartLesson(lesson.id)}
                                variant={isInProgress ? "outline" : "default"}
                              >
                                {isInProgress ? "Continue" : "Start Lesson"}
                              </Button>
                            )}
                            {isInProgress && (
                              <Button onClick={() => handleCompleteLesson(lesson.id)} variant="default">
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No lessons in this module yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




