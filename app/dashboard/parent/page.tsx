import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ParentDashboard } from "@/components/dashboard/parent-dashboard"

export default async function ParentPage() {
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

  if (profileError || !profile || profile.role !== "parent") {
    redirect("/dashboard")
  }

  return <ParentDashboard user={profile} />
}
