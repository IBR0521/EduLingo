import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// This API endpoint processes salary reminders for main teacher
// Should be called daily at 12 PM via cron job

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job or scheduled task
    // It checks for salary due dates and sends reminders to main teacher
    // Should be called once daily at 12 PM

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date and time
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const todayDay = now.getDate() // Day of month (1-31)
    const currentHour = now.getHours()

    // Only send reminders at 12 PM (12)
    if (currentHour !== 12) {
      return NextResponse.json({
        success: true,
        message: "Not a reminder time. Reminders are sent at 12 PM only.",
        currentHour,
      })
    }

    // Get all teachers with salary information
    const { data: teachers, error: queryError } = await supabase
      .from("users")
      .select("*")
      .eq("role", "teacher")
      .not("salary_amount", "is", null) // Only teachers with a set salary amount
      .not("employment_start_date", "is", null) // Only teachers with employment start date

    if (queryError) {
      console.error("Error fetching teachers for reminders:", queryError)
      return NextResponse.json({ error: "Failed to fetch teacher data" }, { status: 500 })
    }

    if (!teachers || teachers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No salaries due for reminders",
        count: 0,
      })
    }

    // Get main teacher
    const { data: mainTeachers } = await supabase.from("users").select("*").eq("role", "main_teacher").limit(1)

    if (!mainTeachers || mainTeachers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No main teacher found",
        count: 0,
      })
    }

    const mainTeacher = mainTeachers[0]
    const remindersSent = []
    const errors = []

    for (const teacher of teachers) {
      try {
        // Determine salary day based on last_salary_date or employment_start_date
        let salaryDay: number
        let referenceDate: Date

        if (teacher.last_salary_date) {
          referenceDate = new Date(teacher.last_salary_date)
          salaryDay = referenceDate.getDate()
        } else if (teacher.employment_start_date) {
          referenceDate = new Date(teacher.employment_start_date)
          salaryDay = referenceDate.getDate()
        } else {
          continue // Skip if no reference date
        }

        referenceDate.setHours(0, 0, 0, 0)

        // Calculate salary due date: same day of month as salary day
        let salaryDueDate = new Date()
        salaryDueDate.setDate(salaryDay)
        salaryDueDate.setHours(0, 0, 0, 0)

        // If the day has passed this month, set to next month
        if (salaryDueDate < new Date()) {
          salaryDueDate.setMonth(salaryDueDate.getMonth() + 1)
        }

        const dueDateStr = salaryDueDate.toISOString().split('T')[0]
        const isOverdue = salaryDueDate < new Date()

        // Only send reminders if salary is not paid
        // Send reminders on salary due day (same day as salary day) or if overdue
        // Reminders are sent once daily (12 PM) until salary is received
        if (teacher.salary_status === "paid") {
          continue // Skip if already paid
        }

        // Send reminder if:
        // 1. Today is the salary due day (same day as employment_start_date or last_salary_date)
        // 2. Salary is overdue
        // 3. Salary status is pending or overdue (not paid)
        if (todayDay !== salaryDay && !isOverdue && teacher.salary_status !== "overdue") {
          continue // Skip if not the salary day yet and not overdue
        }

        // Update salary_due_date in database if it's different
        if (teacher.salary_due_date !== dueDateStr) {
          await supabase.from("users").update({ salary_due_date: dueDateStr }).eq("id", teacher.id)
        }

        // Update salary status if it's the due day and not yet paid
        if (todayDay === salaryDay && teacher.salary_status !== "paid") {
          await supabase.from("users").update({ salary_status: "pending" }).eq("id", teacher.id)
        }

        // Update salary status to overdue if payment is missed
        if (isOverdue && teacher.salary_status !== "overdue") {
          await supabase.from("users").update({ salary_status: "overdue" }).eq("id", teacher.id)
        }

        // Create reminder message
        const reminderType = isOverdue ? "overdue" : "monthly"
        const amount = teacher.salary_amount
        const amountFormatted = amount?.toLocaleString() || "0"

        const messageSubject = isOverdue
          ? `Salary Overdue - ${teacher.full_name}`
          : `Salary Reminder - ${teacher.full_name}`

        const messageContent = isOverdue
          ? `Dear ${mainTeacher.full_name},\n\nTeacher ${teacher.full_name}'s monthly salary of ${amountFormatted} UZS is overdue. Please process payment as soon as possible. Due date was ${new Date(teacher.salary_due_date!).toLocaleDateString()}.`
          : `Dear ${mainTeacher.full_name},\n\nThis is a reminder that teacher ${teacher.full_name}'s monthly salary of ${amountFormatted} UZS is due today (${salaryDueDate.toLocaleDateString()}). Please ensure timely payment.`

        // Send email notification to main teacher
        if (mainTeacher.email) {
          try {
            await fetch(`${request.nextUrl.origin}/api/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipientEmail: mainTeacher.email,
                recipientName: mainTeacher.full_name,
                senderName: "EduLingo Platform",
                subject: messageSubject,
                content: messageContent,
                platformUrl: request.nextUrl.origin,
              }),
            })
          } catch (emailError) {
            console.error(`Failed to send email to ${mainTeacher.email}:`, emailError)
            errors.push({ recipient: mainTeacher.email, type: "email", error: (emailError as Error).message })
          }
        }

        // Send SMS notification to main teacher
        if (mainTeacher.phone_number) {
          try {
            const smsText = messageContent.length > 160 ? `${messageContent.substring(0, 150)}...` : messageContent
            await fetch(`${request.nextUrl.origin}/api/send-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phoneNumber: mainTeacher.phone_number,
                message: smsText,
                senderName: "EduLingo Platform",
              }),
            })
          } catch (smsError) {
            console.error(`Failed to send SMS to ${mainTeacher.phone_number}:`, smsError)
            errors.push({
              recipient: mainTeacher.phone_number,
              type: "sms",
              error: (smsError as Error).message,
            })
          }
        }

        // Create notification in platform
        await supabase.from("notifications").insert({
          user_id: mainTeacher.id,
          title: messageSubject,
          message: messageContent,
          type: "salary_reminder",
        })

        remindersSent.push({
          teacher_id: teacher.id,
          teacher_name: teacher.full_name,
          amount: amountFormatted,
          reminder_type: reminderType,
        })
      } catch (error) {
        console.error(`Error processing reminder for teacher ${teacher.id}:`, error)
        errors.push({ teacher: teacher.id, error: (error as Error).message })
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${remindersSent.length} salary reminders`,
        reminders_sent: remindersSent,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in salary reminders API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process salary reminders",
        note: (error as Error).message,
      },
      { status: 500 },
    )
  }
}


