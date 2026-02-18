"use client"

import { useState, useEffect } from "react"
import type { Schedule, Group } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Repeat, CalendarDays, X, Plus, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface RecurringScheduleManagerProps {
  groupId: string
  currentUserId: string
}

export function RecurringScheduleManager({ groupId, currentUserId }: RecurringScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    subject: "",
    date: "",
    time: "",
    duration_minutes: 60,
    notes: "",
    location: "",
    meeting_url: "",
    is_recurring: false,
    recurrence_pattern: "weekly" as "daily" | "weekly" | "monthly" | "custom",
    recurrence_end_date: "",
    recurrence_interval: 1,
    recurrence_days_of_week: [] as number[],
    recurrence_day_of_month: 1,
  })
  const { toast } = useToast()

  const daysOfWeek = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" },
  ]

  useEffect(() => {
    loadSchedules()
  }, [groupId])

  const loadSchedules = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("schedule")
        .select("*")
        .eq("group_id", groupId)
        .or("is_recurring.eq.true,parent_schedule_id.is.null")
        .order("date", { ascending: true })

      if (error) {
        console.error("Error loading schedules:", error)
        toast({
          title: "Error",
          description: "Failed to load schedules",
          variant: "destructive",
        })
        return
      }

      setSchedules(data || [])
    } catch (error) {
      console.error("Unexpected error:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateRecurringInstances = async (parentSchedule: Schedule) => {
    if (!parentSchedule.is_recurring || !parentSchedule.recurrence_pattern) return

    const supabase = createClient()
    const startDate = new Date(parentSchedule.date)
    const endDate = parentSchedule.recurrence_end_date
      ? new Date(parentSchedule.recurrence_end_date)
      : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000) // Default 90 days

    const instances: Omit<Schedule, "id" | "created_at">[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      let shouldInclude = false

      if (parentSchedule.recurrence_pattern === "daily") {
        shouldInclude = true
        currentDate.setDate(currentDate.getDate() + (parentSchedule.recurrence_interval || 1))
      } else if (parentSchedule.recurrence_pattern === "weekly") {
        const dayOfWeek = currentDate.getDay()
        if (parentSchedule.recurrence_days_of_week?.includes(dayOfWeek)) {
          shouldInclude = true
        }
        currentDate.setDate(currentDate.getDate() + 1)
        if (currentDate.getDay() === startDate.getDay()) {
          currentDate.setDate(currentDate.getDate() + 7 * ((parentSchedule.recurrence_interval || 1) - 1))
        }
      } else if (parentSchedule.recurrence_pattern === "monthly") {
        if (currentDate.getDate() === (parentSchedule.recurrence_day_of_month || startDate.getDate())) {
          shouldInclude = true
        }
        currentDate.setMonth(currentDate.getMonth() + (parentSchedule.recurrence_interval || 1))
      }

      if (shouldInclude) {
        instances.push({
          ...parentSchedule,
          id: `temp-${currentDate.getTime()}`,
          date: currentDate.toISOString(),
          parent_schedule_id: parentSchedule.id,
          is_recurring: false,
        })
      }
    }

    // Insert instances (in batches to avoid overwhelming the database)
    for (const instance of instances.slice(0, 50)) {
      // Limit to 50 instances at a time
      await supabase.from("schedule").insert({
        group_id: instance.group_id,
        subject: instance.subject,
        date: instance.date,
        duration_minutes: instance.duration_minutes,
        notes: instance.notes,
        location: instance.location,
        meeting_url: instance.meeting_url,
        parent_schedule_id: instance.parent_schedule_id,
        is_recurring: false,
      })
    }

    toast({
      title: "Success",
      description: `Generated ${Math.min(instances.length, 50)} schedule instances`,
    })
  }

  const handleCreate = async () => {
    if (!formData.subject.trim() || !formData.date || !formData.time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const supabase = createClient()
      
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`)
      const recurrenceEndDate = formData.is_recurring && formData.recurrence_end_date
        ? new Date(formData.recurrence_end_date)
        : null

      const scheduleData: any = {
        group_id: groupId,
        subject: formData.subject,
        date: dateTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null,
        location: formData.location || null,
        meeting_url: formData.meeting_url || null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
        recurrence_end_date: recurrenceEndDate?.toISOString() || null,
        recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
        recurrence_days_of_week: formData.is_recurring && formData.recurrence_pattern === "weekly"
          ? formData.recurrence_days_of_week
          : null,
        recurrence_day_of_month: formData.is_recurring && formData.recurrence_pattern === "monthly"
          ? formData.recurrence_day_of_month
          : null,
      }

      const { data, error } = await supabase
        .from("schedule")
        .insert(scheduleData)
        .select()
        .single()

      if (error) {
        console.error("Error creating schedule:", error)
        toast({
          title: "Error",
          description: `Failed to create schedule: ${error.message}`,
          variant: "destructive",
        })
        return
      }

      // If recurring, generate instances
      if (formData.is_recurring && data) {
        await generateRecurringInstances(data)
      }

      toast({
        title: "Success",
        description: "Schedule created successfully",
      })

      setFormData({
        subject: "",
        date: "",
        time: "",
        duration_minutes: 60,
        notes: "",
        location: "",
        meeting_url: "",
        is_recurring: false,
        recurrence_pattern: "weekly",
        recurrence_end_date: "",
        recurrence_interval: 1,
        recurrence_days_of_week: [],
        recurrence_day_of_month: 1,
      })
      setIsCreateOpen(false)
      loadSchedules()
    } catch (error) {
      console.error("Unexpected error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (scheduleId: string, isRecurring: boolean) => {
    try {
      const supabase = createClient()
      
      if (isRecurring) {
        // Delete all instances
        const { error: instancesError } = await supabase.from("schedule").delete().eq("parent_schedule_id", scheduleId)
        if (instancesError) {
          console.error("Error deleting schedule instances:", instancesError)
        }
      }
      
      const { error } = await supabase.from("schedule").delete().eq("id", scheduleId)

      if (error) {
        console.error("Error deleting schedule:", error)
        toast.error("Failed to delete schedule", {
          description: error.message || "Please try again",
        })
        return
      }

      toast.success("Schedule deleted successfully")
      loadSchedules()
    } catch (error) {
      console.error("Error deleting schedule:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const toggleDayOfWeek = (day: number) => {
    const days = formData.recurrence_days_of_week || []
    if (days.includes(day)) {
      setFormData({
        ...formData,
        recurrence_days_of_week: days.filter((d) => d !== day),
      })
    } else {
      setFormData({
        ...formData,
        recurrence_days_of_week: [...days, day],
      })
    }
  }

  if (loading) {
    return <LoadingState message="Loading schedules..." />
  }

  const recurringSchedules = schedules.filter((s) => s.is_recurring)
  const singleSchedules = schedules.filter((s) => !s.is_recurring && !s.parent_schedule_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule Management</h2>
          <p className="text-muted-foreground">Create recurring and one-time schedules</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
              <DialogDescription>Create a one-time or recurring schedule</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Grammar Lesson"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="480"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Room number or online"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting_url">Meeting URL</Label>
                <Input
                  id="meeting_url"
                  type="url"
                  value={formData.meeting_url}
                  onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
                />
                <Label htmlFor="is_recurring" className="cursor-pointer">
                  Recurring schedule
                </Label>
              </div>
              {formData.is_recurring && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
                    <Select
                      value={formData.recurrence_pattern}
                      onValueChange={(value: any) => setFormData({ ...formData, recurrence_pattern: value })}
                    >
                      <SelectTrigger id="recurrence_pattern">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.recurrence_pattern === "weekly" && (
                    <div className="space-y-2">
                      <Label>Days of Week</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {daysOfWeek.map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day.value}`}
                              checked={formData.recurrence_days_of_week?.includes(day.value)}
                              onCheckedChange={() => toggleDayOfWeek(day.value)}
                            />
                            <Label htmlFor={`day-${day.value}`} className="cursor-pointer text-sm">
                              {day.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.recurrence_pattern === "monthly" && (
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_day_of_month">Day of Month</Label>
                      <Input
                        id="recurrence_day_of_month"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.recurrence_day_of_month}
                        onChange={(e) =>
                          setFormData({ ...formData, recurrence_day_of_month: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_interval">Repeat Every</Label>
                      <Input
                        id="recurrence_interval"
                        type="number"
                        min="1"
                        value={formData.recurrence_interval}
                        onChange={(e) =>
                          setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_end_date">End Date</Label>
                      <Input
                        id="recurrence_end_date"
                        type="date"
                        value={formData.recurrence_end_date}
                        onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recurring Schedules */}
      {recurringSchedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Recurring Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recurringSchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold">{schedule.subject}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(schedule.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">
                        {schedule.recurrence_pattern} • Every {schedule.recurrence_interval}
                      </Badge>
                      {schedule.location && <Badge variant="outline">{schedule.location}</Badge>}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(schedule.id, true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Upcoming Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {singleSchedules.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No schedules"
              description="Create your first schedule to get started"
            />
          ) : (
            <div className="space-y-4">
              {singleSchedules.slice(0, 10).map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold">{schedule.subject}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(schedule.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </div>
                    {schedule.location && (
                      <div className="text-sm text-muted-foreground mt-1">📍 {schedule.location}</div>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this schedule? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(schedule.id, false)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



