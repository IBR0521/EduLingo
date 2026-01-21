import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MainTeacherDashboard } from "@/components/dashboard/main-teacher-dashboard"

export default async function MainTeacherPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "main_teacher") {
    redirect("/dashboard")
  }

  return <MainTeacherDashboard user={profile} />
}
