"use client"

import type React from "react"
import { useEffect } from "react"

import type { User } from "@/lib/types"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Bell, MessageSquare, GraduationCap, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/use-notifications"
import { useSessionRefresh } from "@/lib/auth-session-refresh"

interface DashboardLayoutProps {
  user: User
  children: React.ReactNode
}

export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { unreadCount } = useNotifications(user.id)
  
  // Keep session alive - users won't be logged out automatically
  useSessionRefresh()

  // Determine if we should show the back to dashboard button
  const isDashboardPage = pathname === "/dashboard" || 
    pathname === "/dashboard/main-teacher" || 
    pathname === "/dashboard/teacher" || 
    pathname === "/dashboard/student" || 
    pathname === "/dashboard/parent"

  const getDashboardPath = () => {
    if (!user) return "/dashboard"
    switch (user.role) {
      case "main_teacher":
        return "/dashboard/main-teacher"
      case "teacher":
        return "/dashboard/teacher"
      case "student":
        return "/dashboard/student"
      case "parent":
        return "/dashboard/parent"
      default:
        return "/dashboard"
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "main_teacher":
        return "Main Teacher"
      case "teacher":
        return "Teacher"
      case "student":
        return "Student"
      case "parent":
        return "Parent"
      default:
        return role
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {!isDashboardPage && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="mr-2"
              >
                <Link href={getDashboardPath()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Link>
              </Button>
            )}
            <Link href={getDashboardPath()} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <span className="text-base sm:text-lg font-semibold truncate transition-colors hover:text-primary">
                <span className="hidden sm:inline">English Course Platform</span>
                <span className="sm:hidden">ECP</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/messages">
                <MessageSquare className="h-5 w-5" />
                <span className="sr-only">Messages</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/dashboard/notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">{getRoleLabel(user.role)}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
