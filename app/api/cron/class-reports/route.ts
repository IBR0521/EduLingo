import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * API Route to process ended classes and send automatic reports
 * This should be called by a cron job (e.g., every hour)
 * 
 * To set up a cron job:
 * 1. Use a service like Vercel Cron, GitHub Actions, or external cron service
 * 2. Call this endpoint: POST /api/cron/class-reports
 * 3. Optionally protect with a secret token
 */
export async function POST(request: Request) {
  try {
    // Optional: Verify request is from cron service
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Use service role key for cron jobs to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the database function to process ended classes
    const { data, error } = await supabase.rpc("process_ended_classes")

    if (error) {
      console.error("Error processing ended classes:", error)
      return NextResponse.json(
        { 
          error: "Failed to process ended classes",
          details: error.message 
        },
        { status: 500 }
      )
    }

    const result = data?.[0] || { processed_count: 0, success_count: 0, error_count: 0 }

    return NextResponse.json({
      success: true,
      message: "Class reports processed",
      processed: result.processed_count,
      successful: result.success_count,
      errors: result.error_count,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Unexpected error in class reports cron:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Also allow GET for easy testing
export async function GET() {
  return POST(new Request("http://localhost", { method: "POST" }))
}

