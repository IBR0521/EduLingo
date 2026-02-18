"use client"

import { useState, useEffect, useRef } from "react"
import type { User } from "@/lib/types"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, BookOpen, UserCog, MessageSquare, CalendarDays, Menu, BarChart3 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GroupsManagement } from "@/components/dashboard/groups-management"
import { TeachersManagement } from "@/components/dashboard/teachers-management"
import { StudentsManagement } from "@/components/dashboard/students-management"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { MainSchedule } from "@/components/dashboard/main-schedule"
import { createClient } from "@/lib/supabase/client"

interface MainTeacherDashboardProps {
  user: User
}

export function MainTeacherDashboard({ user }: MainTeacherDashboardProps) {
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalParents: 0,
  })
  const [systemStats, setSystemStats] = useState({
    groupsWithTeachers: 0,
    avgStudentsPerGroup: 0,
    parentLinkRate: 0,
  })
  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "teachers" | "students" | "schedule" | "analytics">(
    "overview",
  )
  const [loading, setLoading] = useState(true)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [tabsOverflow, setTabsOverflow] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const checkTabsOverflow = () => {
      if (tabsRef.current) {
        // Check if tabs container has overflow
        const container = tabsRef.current
        const hasOverflow = container.scrollWidth > container.clientWidth
        setTabsOverflow(hasOverflow)
        
        // Show mobile menu if tabs overflow OR on mobile/tablet screens
        const isMobile = window.innerWidth < 1024
        setShowMobileMenu(isMobile || hasOverflow)
      }
    }

    // Check after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(checkTabsOverflow, 100)
    window.addEventListener("resize", checkTabsOverflow)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener("resize", checkTabsOverflow)
    }
  }, [activeTab]) // Re-check when tab changes

  const loadStats = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Load all counts in parallel for better performance
      const [
        groupsResponse,
        teachersResponse,
        studentsResponse,
        parentsResponse,
        groupStudentsResponse,
        linkedParentsResponse,
      ] = await Promise.all([
        supabase.from("groups").select("id, teacher_id"),
        supabase.from("users").select("id").eq("role", "teacher"),
        supabase.from("users").select("id").eq("role", "student"),
        supabase.from("users").select("id").eq("role", "parent"),
        supabase.from("group_students").select("group_id"),
        supabase.from("parent_student").select("id").eq("is_linked", true),
      ])

      const groupsData = groupsResponse.data || []
      const teachersData = teachersResponse.data || []
      const studentsData = studentsResponse.data || []
      const parentsData = parentsResponse.data || []
      const groupStudentsData = groupStudentsResponse.data || []
      const linkedParentsData = linkedParentsResponse.data || []

      const totalGroups = groupsData.length
      const groupsWithTeachers = groupsData.filter((g) => g.teacher_id).length
      const totalTeachers = teachersData.length
      const totalStudents = studentsData.length
      const totalParents = parentsData.length
      const totalEnrollments = groupStudentsData.length
      const linkedParents = linkedParentsData.length

      const avgStudentsPerGroup = totalGroups > 0 ? Math.round((totalEnrollments / totalGroups) * 10) / 10 : 0
      const parentLinkRate = totalStudents > 0 ? Math.round((linkedParents / totalStudents) * 100) : 0

      setStats({
        totalGroups,
        totalTeachers,
        totalStudents,
        totalParents,
      })

      setSystemStats({
        groupsWithTeachers: totalGroups > 0 ? Math.round((groupsWithTeachers / totalGroups) * 100) : 0,
        avgStudentsPerGroup,
        parentLinkRate,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const tabOptions = [
    { id: "overview" as const, label: "Overview", icon: BookOpen },
    { id: "groups" as const, label: "Groups", icon: Users },
    { id: "teachers" as const, label: "Teachers", icon: UserCog },
    { id: "students" as const, label: "Students", icon: Users },
    { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
  ]

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Main Teacher Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage all groups, teachers, and students</p>
          </div>
          {showMobileMenu && (
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open navigation menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={activeTab === tab.id ? "bg-accent" : ""}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {tab.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Navigation Tabs - Hidden on mobile when menu is shown */}
        {!showMobileMenu && (
          <div className="w-full border-b overflow-x-auto scrollbar-hide" ref={tabsRef}>
            <div className="flex gap-2 min-w-max pb-1">
              {tabOptions.map((tab) => {
                const Icon = tab.icon
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    onClick={() => setActiveTab(tab.id)}
                    className="rounded-b-none whitespace-nowrap text-xs sm:text-sm"
                  >
                    <Icon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {tab.label}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                  <div className="rounded-lg bg-primary/10 p-2 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl sm:text-3xl font-bold">{stats.totalGroups}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active classes</p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                  <div className="rounded-lg bg-primary/10 p-2 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <UserCog className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl sm:text-3xl font-bold">{stats.totalTeachers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active teachers</p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                  <div className="rounded-lg bg-primary/10 p-2 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl sm:text-3xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Enrolled students</p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                  <CardTitle className="text-sm font-medium">Parents</CardTitle>
                  <div className="rounded-lg bg-primary/10 p-2 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-2xl sm:text-3xl font-bold">{stats.totalParents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Connected parents</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => setActiveTab("groups")} className="w-full justify-start" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Group
                  </Button>
                  <Button onClick={() => setActiveTab("teachers")} className="w-full justify-start" variant="outline">
                    <UserCog className="mr-2 h-4 w-4" />
                    Assign Teachers to Groups
                  </Button>
                  <Button onClick={() => setActiveTab("students")} className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Students
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                  <CardDescription>Platform activity and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading statistics...</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Groups with assigned teachers</span>
                        <span className="font-semibold">{systemStats.groupsWithTeachers}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Students per group (avg)</span>
                        <span className="font-semibold">{systemStats.avgStudentsPerGroup}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Parent accounts linked</span>
                        <span className="font-semibold">{systemStats.parentLinkRate}%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && (
          <GroupsManagement isMainTeacher={true} currentUserId={user.id} onStatsChange={loadStats} />
        )}

        {/* Teachers Tab */}
        {activeTab === "teachers" && <TeachersManagement onStatsChange={loadStats} />}

        {/* Students Tab */}
        {activeTab === "students" && <StudentsManagement onStatsChange={loadStats} isMainTeacher={true} />}

        {/* Schedule Tab */}
        {activeTab === "schedule" && <MainSchedule currentUserId={user.id} />}

        {/* Analytics Tab */}
        {activeTab === "analytics" && <AnalyticsDashboard currentUserId={user.id} userRole="main_teacher" />}
      </div>
    </DashboardLayout>
  )
}
