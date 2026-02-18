"use client"

import { useEffect, useMemo, useState } from "react"
import type { Schedule, User } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingState } from "@/components/ui/loading-state"
import { EmptyState } from "@/components/ui/empty-state"
import { Calendar } from "lucide-react"
import { toast } from "sonner"

interface MainScheduleProps {
  currentUserId: string
}

type GroupRow = {
  id: string
  name: string
  teacher_id: string | null
}

const daysOfWeek = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
]

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

export function MainSchedule({ currentUserId }: MainScheduleProps) {
  const [loading, setLoading] = useState(true)
  const [recurringSchedules, setRecurringSchedules] = useState<Schedule[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [teachersById, setTeachersById] = useState<Record<string, User>>({})

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const [{ data: schedulesData, error: schedulesError }, { data: groupsData, error: groupsError }] =
        await Promise.all([
          supabase
            .from("schedule")
            .select("*")
            .eq("is_recurring", true)
            .is("parent_schedule_id", null)
            .order("created_at", { ascending: false }),
          supabase.from("groups").select("id,name,teacher_id"),
        ])

      if (schedulesError) {
        console.error("Error loading recurring schedules:", schedulesError)
        toast.error("Failed to load schedules", {
          description: schedulesError.message || "Please try again",
        })
        setRecurringSchedules([])
      } else {
        setRecurringSchedules(schedulesData || [])
      }

      if (groupsError) {
        console.error("Error loading groups:", groupsError)
        toast.error("Failed to load groups", {
          description: groupsError.message || "Please try again",
        })
        setGroups([])
      } else {
        setGroups((groupsData as any) || [])
      }

      const teacherIds = Array.from(new Set(((groupsData as any) || []).map((g: GroupRow) => g.teacher_id).filter(Boolean)))
      if (teacherIds.length > 0) {
        const { data: teachersData, error: teachersError } = await supabase
          .from("users")
          .select("*")
          .in("id", teacherIds)

        if (teachersError) {
          console.error("Error loading teachers:", teachersError)
        } else {
          const map: Record<string, User> = {}
          ;(teachersData || []).forEach((t: any) => {
            map[t.id] = t
          })
          setTeachersById(map)
        }
      } else {
        setTeachersById({})
      }
    } catch (error) {
      console.error("Unexpected error loading main schedule:", error)
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setLoading(false)
    }
  }

  const grouped = useMemo(() => {
    const groupMap: Record<string, { group: GroupRow; schedules: Schedule[] }> = {}
    for (const g of groups) {
      groupMap[g.id] = { group: g, schedules: [] }
    }
    for (const s of recurringSchedules) {
      if (!groupMap[s.group_id]) {
        groupMap[s.group_id] = {
          group: { id: s.group_id, name: "Unknown group", teacher_id: null },
          schedules: [],
        }
      }
      groupMap[s.group_id].schedules.push(s)
    }
    return Object.values(groupMap).filter((x) => x.schedules.length > 0)
  }, [groups, recurringSchedules])

  if (loading) return <LoadingState message="Loading schedules..." />

  if (grouped.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Main Schedule</CardTitle>
          <CardDescription>All groups’ weekly class schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title="No schedules yet"
            description="Create weekly schedules inside a group to see them here."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Main Schedule</CardTitle>
        <CardDescription>All groups’ weekly class schedules and assigned teachers</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.flatMap(({ group, schedules }) => {
              const teacherName = group.teacher_id ? teachersById[group.teacher_id]?.full_name || "—" : "Unassigned"
              return schedules.map((s) => {
                const days =
                  s.recurrence_days_of_week && s.recurrence_days_of_week.length > 0
                    ? daysOfWeek
                        .filter((d) => s.recurrence_days_of_week?.includes(d.value))
                        .map((d) => d.label)
                        .join(", ")
                    : "—"

                const time = formatTimeRange(s.date, s.duration_minutes || 60)
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{teacherName}</TableCell>
                    <TableCell>{days}</TableCell>
                    <TableCell>{time}</TableCell>
                    <TableCell className="text-muted-foreground">{s.subject}</TableCell>
                  </TableRow>
                )
              })
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}





