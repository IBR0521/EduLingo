import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import * as webpush from "web-push"

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@edulingoplatform.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with service role for server-side operations
    // This endpoint can be called from server-side (e.g., when notifications are created)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      })
      return NextResponse.json(
        { 
          success: false,
          error: "Server configuration error",
          message: "Supabase configuration is missing",
        },
        { status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()
    const { user_id, title, message, action_url, priority } = body

    if (!user_id || !title || !message) {
      return NextResponse.json(
        { 
          success: false,
          error: "Missing required fields",
          message: "Missing required fields: user_id, title, message",
          received: { has_user_id: !!user_id, has_title: !!title, has_message: !!message },
        },
        { status: 400 }
      )
    }

    // Check if VAPID keys are configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "Push notifications not configured",
          note: "VAPID keys are required. See PUSH_NOTIFICATIONS_SETUP.md",
        },
        { status: 200 }
      )
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id)

    if (subError) {
      console.error("Error fetching push subscriptions:", subError)
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No push subscriptions found for user",
        sent: 0,
      })
    }

    // Send push notification to all subscriptions
    const payload = JSON.stringify({
      title,
      message,
      action_url: action_url || "/dashboard/notifications",
      id: `notification-${Date.now()}`,
      priority: priority || "normal",
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          }

          await webpush.sendNotification(subscription, payload)
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          // If subscription is invalid, delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id)
          }
          return { success: false, endpoint: sub.endpoint, error: error.message }
        }
      })
    )

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error("Error sending push notification:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

