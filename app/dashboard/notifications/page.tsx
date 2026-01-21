import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NotificationsPage } from "@/components/notifications/notifications-page"

export default async function Notifications() {
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

  if (profileError || !profile) {
    redirect("/dashboard")
  }

  return <NotificationsPage user={profile} />
}
