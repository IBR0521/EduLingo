"use client"

import { useState, useEffect } from "react"
import type { User, Grade } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Eye, TrendingUp, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { LoadingState } from "@/components/ui/loading-state"
import { format } from "date-fns"
import { handleDatabaseError } from "@/lib/error-handler"
import { SkeletonTable } from "@/components/ui/skeleton-loader"
import { EmptyState } from "@/components/ui/empty-state"

interface GradesTabProps {
  groupId: string
  students: User[]
  teacherId: string
}

export function GradesTab({ groupId, students, teacherId }: GradesTabProps) {
  const [grades, setGrades] = useState<Record<string, Grade[]>>({})
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)
  const [formData, setFormData] = useState({
    category: "",
    score: "",
    notes: "",
    assignment_id: "",
  })

  useEffect(() => {
    loadData()
  }, [students, groupId])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Load assignments for linking
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, title")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })

      if (assignmentsError) {
        console.error("Error loading assignments:", assignmentsError)
      } else {
        setAssignments(assignmentsData || [])
      }

      // Load grades for all students
      const gradesMap: Record<string, Grade[]> = {}
      const loadPromises = students.map(async (student) => {
        const { data, error } = await supabase
          .from("grades")
          .select("*")
          .eq("student_id", student.id)
          .eq("group_id", groupId)
          .order("created_at", { ascending: false })

        if (error) {
          console.error(`Error loading grades for student ${student.id}:`, error)
          gradesMap[student.id] = []
        } else {
          gradesMap[student.id] = data || []
        }
      })

      await Promise.all(loadPromises)
      setGrades(gradesMap)
    } catch (error) {
      console.error("Unexpected error loading grades:", error)
      toast.error("Failed to load grades", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddGrade = async () => {
    if (!selectedStudentId || !formData.category || !formData.score) {
      toast.error("Please fill in all required fields")
      return
    }

    const score = Number.parseFloat(formData.score)
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error("Score must be between 0 and 100")
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from("grades").insert({
        student_id: selectedStudentId,
        group_id: groupId,
        assignment_id: formData.assignment_id || null,
        category: formData.category,
        score: score,
        notes: formData.notes || null,
        graded_by: teacherId,
      })

      if (error) {
        // Properly serialize error for logging
        const errorObj = error as any
        const errorDetails = {
          message: errorObj.message || error.message || String(error) || "",
          code: errorObj.code || "",
          details: errorObj.details || "",
          hint: errorObj.hint || "",
          status: errorObj.status || errorObj.statusCode || "",
          name: errorObj.name || error.name || "",
        }
        console.error("Error adding grade:", errorDetails)
        toast.error("Failed to add grade", {
          description: errorDetails.message || "Please try again",
        })
        return
      }

      toast.success("Grade added successfully")
      setIsAddOpen(false)
      setSelectedStudentId("")
      setFormData({ category: "", score: "", notes: "", assignment_id: "" })
      loadData()
    } catch (error) {
      console.error("Unexpected error adding grade:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleEditGrade = async () => {
    if (!selectedGrade || !formData.category || !formData.score) {
      toast.error("Please fill in all required fields")
      return
    }

    const score = Number.parseFloat(formData.score)
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error("Score must be between 0 and 100")
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("grades")
        .update({
          category: formData.category,
          score: score,
          notes: formData.notes || null,
          assignment_id: formData.assignment_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedGrade.id)

      if (error) {
        // Properly serialize error for logging
        const errorObj = error as any
        const errorDetails = {
          message: errorObj.message || error.message || String(error) || "",
          code: errorObj.code || "",
          details: errorObj.details || "",
          hint: errorObj.hint || "",
          status: errorObj.status || errorObj.statusCode || "",
          name: errorObj.name || error.name || "",
        }
        console.error("Error updating grade:", errorDetails)
        toast.error("Failed to update grade", {
          description: errorDetails.message || "Please try again",
        })
        return
      }

      toast.success("Grade updated successfully")
      setIsEditOpen(false)
      setSelectedGrade(null)
      setFormData({ category: "", score: "", notes: "", assignment_id: "" })
      loadData()
    } catch (error) {
      console.error("Unexpected error updating grade:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleDeleteGrade = async (gradeId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("grades").delete().eq("id", gradeId)

      if (error) {
        // Properly serialize error for logging
        const errorObj = error as any
        const errorDetails = {
          message: errorObj.message || error.message || String(error) || "",
          code: errorObj.code || "",
          details: errorObj.details || "",
          hint: errorObj.hint || "",
          status: errorObj.status || errorObj.statusCode || "",
          name: errorObj.name || error.name || "",
        }
        console.error("Error deleting grade:", errorDetails)
        toast.error("Failed to delete grade", {
          description: errorDetails.message || "Please try again",
        })
        return
      }

      toast.success("Grade deleted successfully")
      loadData()
    } catch (error) {
      console.error("Unexpected error deleting grade:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const openEditDialog = (grade: Grade) => {
    setSelectedGrade(grade)
    setFormData({
      category: grade.category,
      score: grade.score.toString(),
      notes: grade.notes || "",
      assignment_id: grade.assignment_id || "",
    })
    setIsEditOpen(true)
  }

  const openViewDialog = (studentId: string) => {
    setSelectedStudentId(studentId)
    setIsViewOpen(true)
  }

  const calculateAverage = (studentGrades: Grade[]) => {
    if (studentGrades.length === 0) return 0
    const sum = studentGrades.reduce((acc, grade) => acc + grade.score, 0)
    return (sum / studentGrades.length).toFixed(1)
  }

  const calculateTrend = (studentGrades: Grade[]) => {
    if (studentGrades.length < 2) return null
    const sorted = [...studentGrades].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const recent = sorted.slice(-3)
    const older = sorted.slice(-6, -3)
    if (older.length === 0) return null
    
    const recentAvg = recent.reduce((sum, g) => sum + g.score, 0) / recent.length
    const olderAvg = older.reduce((sum, g) => sum + g.score, 0) / older.length
    return recentAvg - olderAvg
  }

  if (loading) {
    return <SkeletonTable />
  }

  const selectedStudentGrades = selectedStudentId ? grades[selectedStudentId] || [] : []
  const selectedStudent = students.find(s => s.id === selectedStudentId)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Grades & Performance</CardTitle>
              <CardDescription className="text-sm">Track student grades and academic performance</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={loadData} className="flex-1 sm:flex-initial">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1 sm:flex-initial">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Grade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Grade</DialogTitle>
                    <DialogDescription>Record a grade for a student</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Student</Label>
                      <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignment">Link to Assignment (Optional)</Label>
                      <Select 
                        value={formData.assignment_id || undefined} 
                        onValueChange={(value) => setFormData({ ...formData, assignment_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an assignment (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {assignments.map((assignment) => (
                            <SelectItem key={assignment.id} value={assignment.id}>
                              {assignment.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        placeholder="e.g., Midterm Exam, Quiz, Homework"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="score">Score (0-100)</Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="Enter score"
                        value={formData.score}
                        onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Additional comments"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddGrade} disabled={!selectedStudentId || !formData.category || !formData.score}>
                      Add Grade
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No students in this group"
              description="Add students to this group to track grades"
            />
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Student Name</TableHead>
                      <TableHead className="min-w-[150px]">Recent Grades</TableHead>
                      <TableHead className="min-w-[100px]">Average</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">Trend</TableHead>
                      <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                  const studentGrades = grades[student.id] || []
                  const average = calculateAverage(studentGrades)
                  const trend = calculateTrend(studentGrades)
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {studentGrades.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No grades yet</span>
                          ) : (
                            studentGrades.slice(0, 3).map((grade) => (
                              <div key={grade.id} className="text-sm">
                                <span className="font-medium">{grade.score}</span>
                                <span className="text-muted-foreground"> ({grade.category})</span>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-lg font-bold ${
                            Number.parseFloat(average) >= 70
                              ? "text-green-600"
                              : Number.parseFloat(average) >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {studentGrades.length > 0 ? average : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {trend !== null ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`h-4 w-4 ${trend >= 0 ? "text-green-600" : "text-red-600"}`} />
                            <span className={`text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {trend >= 0 ? "+" : ""}{trend.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(student.id)}
                            disabled={studentGrades.length === 0}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Grade Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Grade</DialogTitle>
            <DialogDescription>Update grade information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-assignment">Link to Assignment (Optional)</Label>
              <Select 
                value={formData.assignment_id || undefined} 
                onValueChange={(value) => setFormData({ ...formData, assignment_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an assignment (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {assignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-score">Score (0-100)</Label>
              <Input
                id="edit-score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditGrade}>Update Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View All Grades Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.full_name}'s Grades</DialogTitle>
            <DialogDescription>All grades and performance history</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedStudentGrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No grades recorded yet
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{calculateAverage(selectedStudentGrades)}</div>
                      <div className="text-sm text-muted-foreground">Average</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{selectedStudentGrades.length}</div>
                      <div className="text-sm text-muted-foreground">Total Grades</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {selectedStudentGrades.filter(g => g.score >= 70).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Passing Grades</div>
                    </CardContent>
                  </Card>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedStudentGrades.map((grade) => (
                      <TableRow key={grade.id}>
                        <TableCell>{format(new Date(grade.created_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{grade.category}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            grade.score >= 70 ? "text-green-600" : grade.score >= 50 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {grade.score}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{grade.notes || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(grade)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Grade</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this grade? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteGrade(grade.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
