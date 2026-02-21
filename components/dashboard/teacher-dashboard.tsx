"use client"

import { useState, useEffect } from "react"
import type { User, Group } from "@/lib/types"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, ClipboardList, Calendar, RefreshCw, AlertCircle } from "lucide-react"
import { GroupDetail } from "@/components/dashboard/group-detail"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"

interface TeacherDashboardProps {
  user: User
}

interface GroupWithDetails extends Group {
  teacher?: User
  studentCount?: number
}

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [groups, setGroups] = useState<GroupWithDetails[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalStudents: 0,
    upcomingClasses: 0,
    pendingAssignments: 0,
  })

  useEffect(() => {
    loadTeacherData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const loadTeacherData = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()

      // Load groups assigned to this teacher
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(`
          *,
          teacher:teacher_id(*)
        `)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })

      if (groupsError) {
        console.error("Error loading groups:", groupsError)
        setError("Failed to load groups. Please try again.")
        setGroups([])
      } else {
        const groupsWithDetails = groupsData || []
        
        // Get student counts for each group
        if (groupsWithDetails.length > 0) {
          const groupIds = groupsWithDetails.map(g => g.id)
          
          const { data: studentCounts, error: countError } = await supabase
            .from("group_students")
            .select("group_id")
            .in("group_id", groupIds)

          if (!countError && studentCounts) {
            // Count students per group
            const countMap: Record<string, number> = {}
            studentCounts.forEach(item => {
              countMap[item.group_id] = (countMap[item.group_id] || 0) + 1
            })
            
            // Add counts to groups
            groupsWithDetails.forEach(group => {
              (group as GroupWithDetails).studentCount = countMap[group.id] || 0
            })
          }
        }
        
        setGroups(groupsWithDetails)
      }

      // Load upcoming classes count
      const now = new Date().toISOString()
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("schedule")
        .select("id, group_id")
        .gte("date", now)
        .order("date", { ascending: true })

      let upcomingClasses = 0
      if (!upcomingError && upcomingData && groupsData) {
        const teacherGroupIds = (groupsData || []).map(g => g.id)
        upcomingClasses = upcomingData.filter(s => teacherGroupIds.includes(s.group_id)).length
      }

      // Load pending assignments count (assignments due in the future)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, group_id")
        .gte("due_date", now)

      let pendingAssignments = 0
      if (!assignmentsError && assignmentsData && groupsData) {
        const teacherGroupIds = (groupsData || []).map(g => g.id)
        pendingAssignments = assignmentsData.filter(a => teacherGroupIds.includes(a.group_id)).length
      }

      // Calculate total students
      let totalStudents = 0
      if (groupsData && groupsData.length > 0) {
        const groupIds = groupsData.map(g => g.id)
        const { count, error: studentCountError } = await supabase
          .from("group_students")
          .select("*", { count: "exact", head: true })
          .in("group_id", groupIds)

        if (!studentCountError && count !== null) {
          totalStudents = count
        }
      }

      setStats({
        totalGroups: (groupsData || []).length,
        totalStudents,
        upcomingClasses,
        pendingAssignments,
      })
    } catch (err) {
      console.error("Error loading teacher data:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (selectedGroup) {
    return (
      <DashboardLayout user={user}>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setSelectedGroup(null)}>
            ← Back to My Groups
          </Button>
          <GroupDetail group={selectedGroup} teacherId={user.id} onUpdate={loadTeacherData} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Teacher Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your assigned groups and students</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadTeacherData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-2 py-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadTeacherData} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Groups</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalGroups}</div>
                  <p className="text-xs text-muted-foreground">Assigned classes</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground">Across all groups</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold">{stats.upcomingClasses}</div>
                  <p className="text-xs text-muted-foreground">Scheduled sessions</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold">{stats.pendingAssignments}</div>
                  <p className="text-xs text-muted-foreground">Due soon</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Groups List */}
        <Card>
          <CardHeader>
            <CardTitle>My Groups</CardTitle>
            <CardDescription>Click on a group to manage students, attendance, and grades</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No groups assigned yet"
                description="Contact the main teacher to be assigned to a group"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {group.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {(group as GroupWithDetails).studentCount || 0} students
                        </Badge>
                        <Badge variant="outline">View Details</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
