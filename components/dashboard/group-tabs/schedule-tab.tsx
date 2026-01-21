"use client"

import { useState, useEffect } from "react"
import type { Schedule } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Calendar, Trash2, Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "sonner"
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
import { Checkbox } from "@/components/ui/checkbox"

interface ScheduleTabProps {
  groupId: string
  teacherId: string
  isStudentView?: boolean
}

type WeeklyForm = {
  subject: string
  daysOfWeek: number[] // JS getDay() values: 0..6
  startTime: string // HH:MM
  endTime: string // HH:MM
  notes: string
}

const DAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
]

function parseTimeToMinutes(t: string) {
  const [hh, mm] = t.split(":").map((x) => Number.parseInt(x, 10))
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
  return hh * 60 + mm
}

function minutesToHHMM(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function formatTimeRange(startIso: string, durationMinutes: number) {
  const start = new Date(startIso)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = startMinutes + (durationMinutes || 60)
  return `${minutesToHHMM(startMinutes)}–${minutesToHHMM(endMinutes)}`
}

function nextOccurrenceDateTime(dayOfWeek: number, startTime: string, from: Date) {
  const mins = parseTimeToMinutes(startTime)
  if (mins === null) return null
  const fromDay = from.getDay()
  const delta = (dayOfWeek - fromDay + 7) % 7
  const candidate = new Date(from)
  candidate.setDate(candidate.getDate() + delta)
  candidate.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  if (candidate.getTime() < from.getTime()) {
    candidate.setDate(candidate.getDate() + 7)
  }
  return candidate
}

export function ScheduleTab({ groupId, teacherId, isStudentView = false }: ScheduleTabProps) {
  const [recurringClasses, setRecurringClasses] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [formData, setFormData] = useState<WeeklyForm>({
    subject: "",
    daysOfWeek: [],
    startTime: "15:00",
    endTime: "18:00",
    notes: "",
  })

  useEffect(() => {
    loadSchedule()
  }, [groupId])

  const loadSchedule = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: recurringData, error: recurringError } = await supabase
        .from("schedule")
        .select("*")
        .eq("group_id", groupId)
        .eq("is_recurring", true)
        .is("parent_schedule_id", null)
        .order("created_at", { ascending: false })

      if (recurringError) {
        console.error("Error loading recurring schedule:", recurringError)
        toast.error("Failed to load schedule", {
          description: recurringError.message || "Please try again",
        })
        return
      }

      setRecurringClasses(recurringData || [])
      
      // Instances are generated in background for attendance - not displayed here
    } catch (error) {
      console.error("Error loading schedule:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day: number) => {
    setFormData((prev) => {
      const exists = prev.daysOfWeek.includes(day)
      return {
        ...prev,
        daysOfWeek: exists ? prev.daysOfWeek.filter((d) => d !== day) : [...prev.daysOfWeek, day],
      }
    })
  }

  const ensureInstances = async (parent: Schedule) => {
    const startMins = parseTimeToMinutes(formData.startTime)
    if (startMins === null) return

    const supabase = createClient()
    const from = new Date()
    const end = new Date(from)
    end.setDate(end.getDate() + 7 * 6) // Only 6 weeks ahead (reduced from 12)

    // Load existing future instances to avoid duplicates
    const { data: existing, error: existingError } = await supabase
      .from("schedule")
      .select("id,date")
      .eq("parent_schedule_id", parent.id)
      .gte("date", from.toISOString())
      .lte("date", end.toISOString())

    if (existingError) {
      console.error("Error loading existing instances:", existingError)
    }

    const existingTimes = new Set((existing || []).map((e: any) => new Date(e.date).getTime()))
    const inserts: any[] = []

    for (let week = 0; week < 6; week++) {
      for (const day of parent.recurrence_days_of_week || []) {
        const occ = nextOccurrenceDateTime(day, formData.startTime, from)
        if (!occ) continue
        occ.setDate(occ.getDate() + 7 * week)
        if (occ.getTime() < from.getTime()) continue
        if (occ.getTime() > end.getTime()) continue
        if (existingTimes.has(occ.getTime())) continue

        inserts.push({
          group_id: parent.group_id,
          subject: parent.subject,
          date: occ.toISOString(),
          duration_minutes: parent.duration_minutes || 60,
          notes: parent.notes || null,
          parent_schedule_id: parent.id,
          is_recurring: false,
        })
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from("schedule").insert(inserts)
      if (insertError) {
        console.error("Error inserting schedule instances:", insertError)
      }
    }
  }

  const handleCreateRecurring = async () => {
    if (isStudentView) return

    const subject = formData.subject.trim()
    if (subject.length < 2) {
      toast.error("Subject must be at least 2 characters")
      return
    }
    if (subject.length > 255) {
      toast.error("Subject is too long (max 255 characters)")
      return
    }
    if (formData.daysOfWeek.length === 0) {
      toast.error("Select at least one day of the week")
      return
    }

    const startMins = parseTimeToMinutes(formData.startTime)
    const endMins = parseTimeToMinutes(formData.endTime)
    if (startMins === null || endMins === null) {
      toast.error("Invalid time")
      return
    }
    const duration = endMins - startMins
    if (duration <= 0) {
      toast.error("End time must be after start time")
      return
    }
    if (duration < 15 || duration > 480) {
      toast.error("Class duration must be between 15 minutes and 8 hours")
      return
    }
    if (formData.notes && formData.notes.length > 1000) {
      toast.error("Notes are too long (max 1000 characters)")
      return
    }

    const from = new Date()
    const firstDay = [...formData.daysOfWeek].sort((a, b) => a - b)[0]
    const firstStart = nextOccurrenceDateTime(firstDay, formData.startTime, from)
    if (!firstStart) {
      toast.error("Failed to compute first class date")
      return
    }

    try {
    const supabase = createClient()
      const { data: parent, error } = await supabase
        .from("schedule")
        .insert({
      group_id: groupId,
          subject,
          date: firstStart.toISOString(),
          duration_minutes: duration,
      notes: formData.notes?.trim() || null,
          is_recurring: true,
          recurrence_pattern: "weekly",
          recurrence_interval: 1,
          recurrence_days_of_week: formData.daysOfWeek,
          recurrence_end_date: null,
          parent_schedule_id: null,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating weekly schedule:", error)
        toast.error("Failed to create schedule", {
          description: error.message || "Please try again",
        })
        return
      }

      // Generate upcoming instances so Attendance works
      await ensureInstances(parent as any)

      toast.success("Weekly schedule created")
      setIsCreateOpen(false)
      setFormData({ subject: "", daysOfWeek: [], startTime: "15:00", endTime: "18:00", notes: "" })
      loadSchedule()
    } catch (e) {
      console.error("Unexpected error creating schedule:", e)
      toast.error("An unexpected error occurred", {
        description: e instanceof Error ? e.message : "Please try again",
      })
    }
  }

  const openEdit = (s: Schedule) => {
    const start = new Date(s.date)
    const startTime = minutesToHHMM(start.getHours() * 60 + start.getMinutes())
    const endTime = minutesToHHMM(start.getHours() * 60 + start.getMinutes() + (s.duration_minutes || 60))
    setEditing(s)
    setFormData({
      subject: s.subject,
      daysOfWeek: s.recurrence_days_of_week || [],
      startTime,
      endTime,
      notes: s.notes || "",
    })
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (isStudentView) return

    const subject = formData.subject.trim()
    if (subject.length < 2) {
      toast.error("Subject must be at least 2 characters")
      return
    }
    if (formData.daysOfWeek.length === 0) {
      toast.error("Select at least one day of the week")
      return
    }
    const startMins = parseTimeToMinutes(formData.startTime)
    const endMins = parseTimeToMinutes(formData.endTime)
    if (startMins === null || endMins === null) {
      toast.error("Invalid time")
      return
    }
    const duration = endMins - startMins
    if (duration <= 0) {
      toast.error("End time must be after start time")
      return
    }
    if (duration < 15 || duration > 480) {
      toast.error("Class duration must be between 15 minutes and 8 hours")
      return
    }

    try {
      const supabase = createClient()
      const nowIso = new Date().toISOString()

      // Delete future instances, then regenerate
      const { error: deleteError } = await supabase
        .from("schedule")
        .delete()
        .eq("parent_schedule_id", editing.id)
        .gte("date", nowIso)

      if (deleteError) {
        console.error("Error deleting future instances:", deleteError)
      }

      const from = new Date()
      const firstDay = [...formData.daysOfWeek].sort((a, b) => a - b)[0]
      const firstStart = nextOccurrenceDateTime(firstDay, formData.startTime, from)
      if (!firstStart) {
        toast.error("Failed to compute first class date")
        return
      }

      const { data: updated, error: updateError } = await supabase
        .from("schedule")
        .update({
          subject,
          date: firstStart.toISOString(),
          duration_minutes: duration,
          notes: formData.notes?.trim() || null,
          is_recurring: true,
          recurrence_pattern: "weekly",
          recurrence_interval: 1,
          recurrence_days_of_week: formData.daysOfWeek,
          recurrence_end_date: null,
        })
        .eq("id", editing.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating schedule:", updateError)
        toast.error("Failed to update schedule", {
          description: updateError.message || "Please try again",
        })
        return
      }

      await ensureInstances(updated as any)

      toast.success("Schedule updated")
      setIsEditOpen(false)
      setEditing(null)
      setFormData({ subject: "", daysOfWeek: [], startTime: "15:00", endTime: "18:00", notes: "" })
      loadSchedule()
    } catch (e) {
      console.error("Unexpected error updating schedule:", e)
      toast.error("An unexpected error occurred", {
        description: e instanceof Error ? e.message : "Please try again",
      })
    }
  }

  const handleDeleteRecurring = async (scheduleId: string) => {
    if (isStudentView) return
    const supabase = createClient()
    // delete instances first
    await supabase.from("schedule").delete().eq("parent_schedule_id", scheduleId)
    const { error } = await supabase.from("schedule").delete().eq("id", scheduleId)

    if (error) {
      console.error("Error deleting schedule:", error)
      toast.error("Failed to delete schedule", {
        description: error.message || "Please try again",
      })
      return
    }

    toast.success("Schedule removed")
    loadSchedule()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Class Schedule</CardTitle>
            <CardDescription>
              {isStudentView ? "Your upcoming weekly classes" : "Set weekly recurring classes (Mon–Sun) for this group"}
            </CardDescription>
          </div>
          {!isStudentView && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                  Add Weekly Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                  <DialogTitle>Create Weekly Class</DialogTitle>
                  <DialogDescription>Select days of week and time; it repeats every week until removed.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                      placeholder="e.g., Listening"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                    <Label>Days of Week *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS.map((d) => (
                        <div key={d.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`dow-${d.value}`}
                            checked={formData.daysOfWeek.includes(d.value)}
                            onCheckedChange={() => toggleDay(d.value)}
                          />
                          <Label htmlFor={`dow-${d.value}`} className="cursor-pointer text-sm">
                            {d.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                      <Label htmlFor="endTime">End Time *</Label>
                  <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                      placeholder="Optional notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                  <Button onClick={handleCreateRecurring}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState message="Loading schedule..." />
        ) : (
          <div className="space-y-6">
            {/* Recurring weekly classes (manage) */}
            {!isStudentView && (
              <div>
                {recurringClasses.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
                    title="No weekly classes set"
                    description="Add a weekly class (Mon–Sun) and it will repeat every week."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Time</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                      {recurringClasses.map((item) => {
                        const days =
                          item.recurrence_days_of_week && item.recurrence_days_of_week.length > 0
                            ? DAYS.filter((d) => item.recurrence_days_of_week?.includes(d.value))
                                .map((d) => d.label)
                                .join(", ")
                            : "-"
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.subject}</TableCell>
                            <TableCell>{days}</TableCell>
                            <TableCell>{formatTimeRange(item.date, item.duration_minutes || 60)}</TableCell>
                            <TableCell className="text-muted-foreground">{item.notes || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Weekly Class</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove this weekly class and all upcoming sessions? This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteRecurring(item.id)}>
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      {!isStudentView && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Weekly Class</DialogTitle>
              <DialogDescription>Changes apply to future sessions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subjectEdit">Subject *</Label>
                <Input
                  id="subjectEdit"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Days of Week *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS.map((d) => (
                    <div key={d.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`dow-edit-${d.value}`}
                        checked={formData.daysOfWeek.includes(d.value)}
                        onCheckedChange={() => toggleDay(d.value)}
                      />
                      <Label htmlFor={`dow-edit-${d.value}`} className="cursor-pointer text-sm">
                        {d.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTimeEdit">Start Time *</Label>
                  <Input
                    id="startTimeEdit"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTimeEdit">End Time *</Label>
                  <Input
                    id="endTimeEdit"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notesEdit">Notes</Label>
                <Textarea
                  id="notesEdit"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false)
                  setEditing(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editing}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
