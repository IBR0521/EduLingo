"use client"

import { useState, useEffect } from "react"
import type { Rubric, RubricCriterion, Assignment } from "@/lib/types"
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
import { Plus, Edit, Trash2, FileText, AlertCircle, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface RubricManagerProps {
  assignmentId?: string
  courseId?: string
  currentUserId: string
  onRubricSelected?: (rubricId: string) => void
}

export function RubricManager({ assignmentId, courseId, currentUserId, onRubricSelected }: RubricManagerProps) {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_template: false,
    is_public: false,
  })
  const [criteria, setCriteria] = useState<Omit<RubricCriterion, "id" | "rubric_id" | "created_at" | "updated_at">[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadRubrics()
  }, [assignmentId, courseId])

  const getErrorMessage = (err: any): string => {
    if (err instanceof Error) {
      return err.message
    }
    if (err && typeof err === 'object' && 'message' in err) {
      return String(err.message)
    }
    return "An unknown error occurred."
  }

  const loadRubrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      let query = supabase.from("rubrics").select("*")

      if (assignmentId) {
        query = query.eq("assignment_id", assignmentId)
      } else if (courseId) {
        query = query.eq("course_id", courseId)
      } else {
        query = query.or(`is_template.eq.true,is_public.eq.true,created_by.eq.${currentUserId}`)
      }

      const { data, error: rubricsError } = await query.order("created_at", { ascending: false })

      if (rubricsError) {
        console.error("Error loading rubrics:", rubricsError)
        setError(`Error loading rubrics: ${getErrorMessage(rubricsError)}`)
        return
      }

      // Load criteria for each rubric
      const rubricsWithCriteria = await Promise.all(
        (data || []).map(async (rubric) => {
          const { data: criteriaData } = await supabase
            .from("rubric_criteria")
            .select("*")
            .eq("rubric_id", rubric.id)
            .order("order_index", { ascending: true })

          return {
            ...rubric,
            criteria: criteriaData || [],
          }
        }),
      )

      setRubrics(rubricsWithCriteria)
    } catch (err) {
      console.error("Unexpected error loading rubrics:", err)
      setError(`An unexpected error occurred: ${getErrorMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Rubric name is required",
        variant: "destructive",
      })
      return
    }

    if (criteria.length === 0) {
      toast({
        title: "Error",
        description: "At least one criterion is required",
        variant: "destructive",
      })
      return
    }

    try {
      const supabase = createClient()
      const { data: newRubric, error: rubricError } = await supabase
        .from("rubrics")
        .insert({
          name: formData.name,
          description: formData.description || null,
          assignment_id: assignmentId || null,
          course_id: courseId || null,
          created_by: currentUserId,
          is_template: formData.is_template,
          is_public: formData.is_public,
        })
        .select()
        .single()

      if (rubricError || !newRubric) {
        console.error("Error creating rubric:", rubricError)
        toast({
          title: "Error",
          description: `Failed to create rubric: ${getErrorMessage(rubricError)}`,
          variant: "destructive",
        })
        return
      }

      // Create criteria
      const criteriaToInsert = criteria.map((criterion, index) => ({
        rubric_id: newRubric.id,
        name: criterion.name,
        description: criterion.description || null,
        max_points: criterion.max_points,
        order_index: index,
      }))

      const { error: criteriaError } = await supabase.from("rubric_criteria").insert(criteriaToInsert)

      if (criteriaError) {
        console.error("Error creating criteria:", criteriaError)
        toast({
          title: "Error",
          description: `Failed to create criteria: ${getErrorMessage(criteriaError)}`,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Rubric created successfully",
      })

      setFormData({ name: "", description: "", is_template: false, is_public: false })
      setCriteria([])
      setIsCreateOpen(false)
      loadRubrics()

      if (onRubricSelected) {
        onRubricSelected(newRubric.id)
      }
    } catch (err) {
      console.error("Unexpected error creating rubric:", err)
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${getErrorMessage(err)}`,
        variant: "destructive",
      })
    }
  }

  const handleAddCriterion = () => {
    setCriteria([
      ...criteria,
      {
        name: "",
        description: "",
        max_points: 10,
        order_index: criteria.length,
      },
    ])
  }

  const handleUpdateCriterion = (index: number, field: string, value: any) => {
    const updated = [...criteria]
    updated[index] = { ...updated[index], [field]: value }
    setCriteria(updated)
  }

  const handleRemoveCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index))
  }

  const handleDelete = async (rubricId: string) => {
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase.from("rubrics").delete().eq("id", rubricId)

      if (deleteError) {
        console.error("Error deleting rubric:", deleteError)
        toast.error("Failed to delete rubric", {
          description: getErrorMessage(deleteError) || "Please try again",
        })
        return
      }

      toast.success("Rubric deleted successfully")
      loadRubrics()
    } catch (err) {
      console.error("Unexpected error deleting rubric:", err)
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${getErrorMessage(err)}`,
        variant: "destructive",
      })
    }
  }

  const totalPoints = criteria.reduce((sum, c) => sum + c.max_points, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rubrics</h2>
          <p className="text-muted-foreground">Create and manage grading rubrics</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Rubric
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Rubric</DialogTitle>
              <DialogDescription>Define criteria and point values for grading</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rubric-name">Rubric Name *</Label>
                <Input
                  id="rubric-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Essay Grading Rubric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rubric-description">Description</Label>
                <Textarea
                  id="rubric-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rubric description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-template"
                    checked={formData.is_template}
                    onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is-template">Save as Template</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is-public">Make Public</Label>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>Criteria</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCriterion}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Criterion
                  </Button>
                </div>
                {criteria.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No criteria yet. Click "Add Criterion" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {criteria.map((criterion, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder="Criterion name (e.g., Grammar, Content, Structure)"
                                  value={criterion.name}
                                  onChange={(e) => handleUpdateCriterion(index, "name", e.target.value)}
                                />
                                <Textarea
                                  placeholder="Description (optional)"
                                  value={criterion.description || ""}
                                  onChange={(e) => handleUpdateCriterion(index, "description", e.target.value)}
                                  rows={2}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-24">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="Points"
                                    value={criterion.max_points}
                                    onChange={(e) =>
                                      handleUpdateCriterion(index, "max_points", parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveCriterion(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="text-right text-sm font-semibold">
                      Total Points: {totalPoints.toFixed(1)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Rubric</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <LoadingState message="Loading rubrics..." />
      ) : rubrics.length === 0 && !error ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No rubrics found"
          description="Create your first rubric to get started"
          action={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Rubric
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rubrics.map((rubric) => {
            const rubricTotalPoints = (rubric.criteria || []).reduce((sum, c) => sum + c.max_points, 0)
            return (
              <Card key={rubric.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{rubric.name}</CardTitle>
                      {rubric.description && (
                        <CardDescription className="mt-1">{rubric.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {rubric.is_template && <Badge variant="secondary">Template</Badge>}
                      {rubric.is_public && <Badge variant="outline">Public</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {rubric.criteria?.length || 0} criteria • {rubricTotalPoints.toFixed(1)} total points
                    </div>
                    {rubric.criteria && rubric.criteria.length > 0 && (
                      <div className="space-y-2">
                        {rubric.criteria.map((criterion) => (
                          <div key={criterion.id} className="flex items-center justify-between text-sm">
                            <span>{criterion.name}</span>
                            <Badge variant="outline">{criterion.max_points} pts</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => {
                          if (onRubricSelected) {
                            onRubricSelected(rubric.id)
                          }
                        }}
                      >
                        Use Rubric
                      </Button>
                      {rubric.created_by === currentUserId && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rubric</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this rubric? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rubric.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}



