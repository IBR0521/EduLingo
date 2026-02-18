"use client"

import { useState, useEffect } from "react"
import type { User, Schedule } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { toast } from "sonner"
import { handleDatabaseError } from "@/lib/error-handler"
import { SkeletonTable } from "@/components/ui/skeleton-loader"
import { EmptyState } from "@/components/ui/empty-state"

interface AttendanceTabProps {
  groupId: string
  students: User[]
  teacherId: string
}

type AttendanceStatus = "present" | "absent" | "late" | "excused"

export function AttendanceTab({ groupId, students, teacherId }: AttendanceTabProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("")
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    loadSchedules()
  }, [groupId])

  useEffect(() => {
    if (selectedScheduleId) {
      loadAttendance(selectedScheduleId)
    }
  }, [selectedScheduleId])

  const loadSchedules = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { data, error: dbError } = await supabase
        .from("schedule")
        .select("*")
        .eq("group_id", groupId)
        .order("date", { ascending: false })

      if (dbError) {
        const errorInfo = handleDatabaseError(dbError, "Failed to load schedules")
        setError(errorInfo.message)
        toast.error(errorInfo.message)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        setSchedules(data)
        setSelectedScheduleId(data[0].id)
      }
    } catch (error) {
      const errorInfo = handleDatabaseError(error, "Failed to load schedules")
      setError(errorInfo.message)
      toast.error(errorInfo.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAttendance = async (scheduleId: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("schedule_id", scheduleId)

      if (error) {
        console.error("Error loading attendance:", error)
        toast.error("Failed to load attendance", {
          description: error.message || "Please try again",
        })
        return
      }

      const attendanceMap: Record<string, AttendanceStatus> = {}
      if (data) {
        data.forEach((item) => {
          attendanceMap[item.student_id] = item.status as AttendanceStatus
        })
      }
      setAttendance(attendanceMap)
    } catch (error) {
      console.error("Unexpected error loading attendance:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSave = async () => {
    if (!selectedScheduleId) {
      toast.error("Please select a class session")
      return
    }

    if (Object.keys(attendance).length === 0) {
      toast.error("Please mark attendance for at least one student")
      return
    }

    setIsSaving(true)
    const supabase = createClient()

    try {
      // Delete existing attendance for this schedule
      const { error: deleteError } = await supabase
        .from("attendance")
        .delete()
        .eq("schedule_id", selectedScheduleId)

      if (deleteError) {
        // Properly serialize error for logging
        const errorObj = deleteError as any
        const errorDetails = {
          message: errorObj.message || deleteError.message || String(deleteError) || "",
          code: errorObj.code || "",
          details: errorObj.details || "",
          hint: errorObj.hint || "",
          status: errorObj.status || errorObj.statusCode || "",
          name: errorObj.name || deleteError.name || "",
        }
        console.error("Error deleting existing attendance:", errorDetails)
        toast.error("Failed to save attendance", {
          description: errorDetails.message || "Please try again",
        })
        setIsSaving(false)
        return
      }

      // Insert new attendance records
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        schedule_id: selectedScheduleId,
        student_id: studentId,
        status,
        marked_by: teacherId,
      }))

      const { error: insertError } = await supabase.from("attendance").insert(records)

      if (insertError) {
        // Properly serialize error for logging
        const errorObj = insertError as any
        const errorDetails = {
          message: errorObj.message || insertError.message || String(insertError) || "",
          code: errorObj.code || "",
          details: errorObj.details || "",
          hint: errorObj.hint || "",
          status: errorObj.status || errorObj.statusCode || "",
          name: errorObj.name || insertError.name || "",
        }
        console.error("Error inserting attendance:", errorDetails)
        toast.error("Failed to save attendance", {
          description: errorDetails.message || "Please try again",
        })
        setIsSaving(false)
        return
      }

      toast.success("Attendance saved successfully")
      // Reload attendance to reflect changes
      loadAttendance(selectedScheduleId)
    } catch (error) {
      console.error("Unexpected error saving attendance:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadgeVariant = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "default"
      case "absent":
        return "destructive"
      case "late":
        return "secondary"
      case "excused":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">Attendance Tracking</CardTitle>
            <CardDescription className="text-sm">Mark student attendance for each class</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={isSaving || !selectedScheduleId} className="w-full sm:w-auto">
            {isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 border border-destructive bg-destructive/10 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {loading ? (
          <SkeletonTable />
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No scheduled classes yet"
            description="Create a class schedule first"
          />
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Class Session</label>
              <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {format(new Date(schedule.date), "PPp")} - {schedule.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Student Name</TableHead>
                      <TableHead className="min-w-[150px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No students in this group
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>
                        <Select
                          value={attendance[student.id] || ""}
                          onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Mark status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
