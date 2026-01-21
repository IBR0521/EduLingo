"use client"

import { useState, useEffect } from "react"
import type { Group, User } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentsTab } from "@/components/dashboard/group-tabs/students-tab"
import { AttendanceTab } from "@/components/dashboard/group-tabs/attendance-tab"
import { GradesTab } from "@/components/dashboard/group-tabs/grades-tab"
import { AssignmentsTab } from "@/components/dashboard/group-tabs/assignments-tab"
import { ScheduleTab } from "@/components/dashboard/group-tabs/schedule-tab"
import { Leaderboard } from "@/components/dashboard/gamification/leaderboard"
import { LearningPathViewer } from "@/components/dashboard/learning-path/learning-path-viewer"
import { ModuleManager } from "@/components/dashboard/learning-path/module-manager"
import { AdvancedAnalytics } from "@/components/dashboard/analytics/advanced-analytics"
import { MaterialManager } from "@/components/dashboard/materials/material-manager"
import { AnnouncementsManager } from "@/components/dashboard/announcements/announcements-manager"
import { createClient } from "@/lib/supabase/client"

interface GroupDetailProps {
  group: Group
  teacherId: string
  onUpdate: () => void
  isStudentView?: boolean
  studentId?: string
  isMainTeacher?: boolean
}

export function GroupDetail({ group, teacherId, onUpdate, isStudentView = false, studentId, isMainTeacher = false }: GroupDetailProps) {
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [group.id])

  const loadStudents = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("group_students")
      .select(`
        student:student_id(*)
      `)
      .eq("group_id", group.id)

    if (data) {
      setStudents(data.map((item: { student: User }) => item.student).filter(Boolean))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{group.name}</h2>
        <p className="text-muted-foreground">{group.description || "No description"}</p>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          {!isStudentView && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {!isStudentView && <TabsTrigger value="materials">Materials</TabsTrigger>}
          {isStudentView ? (
            <TabsTrigger value="learning-path">Learning Path</TabsTrigger>
          ) : (
            <TabsTrigger value="modules">Course Modules</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="students">
          <StudentsTab groupId={group.id} students={students} onUpdate={loadStudents} isMainTeacher={isMainTeacher} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab groupId={group.id} teacherId={teacherId} isStudentView={isStudentView} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab groupId={group.id} teacherId={teacherId} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab groupId={group.id} students={students} teacherId={teacherId} />
        </TabsContent>

        <TabsContent value="grades">
          <GradesTab groupId={group.id} students={students} teacherId={teacherId} />
        </TabsContent>

        <TabsContent value="leaderboard">
          <Leaderboard groupId={group.id} />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsManager
            groupId={group.id}
            teacherId={teacherId}
            isStudentView={isStudentView}
            studentId={studentId}
          />
        </TabsContent>

        {!isStudentView && (
          <>
            <TabsContent value="analytics">
              <AdvancedAnalytics groupId={group.id} teacherId={teacherId} />
            </TabsContent>
            <TabsContent value="materials">
              <MaterialManager groupId={group.id} teacherId={teacherId} />
            </TabsContent>
          </>
        )}

        {isStudentView && studentId ? (
          <TabsContent value="learning-path">
            <LearningPathViewer groupId={group.id} studentId={studentId} />
          </TabsContent>
        ) : (
          <TabsContent value="modules">
            <ModuleManager groupId={group.id} teacherId={teacherId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
