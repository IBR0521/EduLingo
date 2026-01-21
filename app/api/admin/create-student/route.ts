import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone_number } = body

    if (!email || !phone_number) {
      return NextResponse.json({ error: "Email and phone number are required" }, { status: 400 })
    }

    // Format phone number for Uzbekistan
    let formattedPhone = phone_number.trim().replace(/[\s\-\(\)]/g, "")
    if (formattedPhone.startsWith("9") && formattedPhone.length === 9) {
      formattedPhone = `+998${formattedPhone}`
    } else if (formattedPhone.startsWith("998") && formattedPhone.length === 12) {
      formattedPhone = `+${formattedPhone}`
    } else if (!formattedPhone.startsWith("+998")) {
      formattedPhone = `+998${formattedPhone}`
    }

    // Validate phone format
    if (!/^\+998\d{9}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: "Invalid Uzbekistan phone number format" },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if email already exists in users or pending_students
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      )
    }

    const { data: existingPending } = await supabase
      .from("pending_students")
      .select("id, email")
      .eq("email", email)
      .single()

    if (existingPending) {
      return NextResponse.json(
        { error: "A pending student with this email already exists" },
        { status: 400 }
      )
    }

    // Get the main teacher ID from request (should be passed from frontend)
    // For now, we'll get it from a header or make it optional
    const mainTeacherId = request.headers.get("x-user-id") || null

    // Create pending student record
    const { error: pendingError } = await supabase.from("pending_students").insert({
      email: email,
      phone_number: formattedPhone,
      created_by: mainTeacherId,
    })

    if (pendingError) {
      console.error("Error creating pending student:", pendingError)
      return NextResponse.json(
        { error: "Failed to create pending student: " + pendingError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Student added successfully. They will complete registration when they sign up.",
      email: email,
    })
  } catch (error: any) {
    console.error("Error in create-student API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create student" },
      { status: 500 }
    )
  }
}

