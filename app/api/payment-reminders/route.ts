import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// This API endpoint processes payment reminders
// Should be called daily via cron job or scheduled task

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job or scheduled task
    // It checks for payment due dates and sends reminders
    // Should be called twice daily: 9 AM and 8 PM

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get current date and time
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const todayDay = now.getDate() // Day of month (1-31)
    const currentHour = now.getHours()
    
    // Only send reminders at 9 AM (9) or 8 PM (20)
    // This ensures reminders are sent twice daily
    if (currentHour !== 9 && currentHour !== 20) {
      return NextResponse.json({
        success: true,
        message: "Not a reminder time. Reminders are sent at 9 AM and 8 PM only.",
        currentHour,
      })
    }

    // Get all group_students with payment information
    // We need to check payments due on the same day of month as course_start_date
    const { data: groupStudents, error: queryError } = await supabase
      .from("group_students")
      .select(`
        *,
        student:student_id(*),
        group:group_id(*)
      `)
      .not("monthly_payment_amount", "is", null)
      .not("course_start_date", "is", null)

    if (queryError) {
      console.error("Error querying group_students:", queryError)
      return NextResponse.json({ error: "Failed to query payments" }, { status: 500 })
    }

    if (!groupStudents || groupStudents.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No payments due for reminders",
        count: 0 
      })
    }

    const remindersSent = []
    const errors = []

    for (const groupStudent of groupStudents) {
      try {
        const student = (groupStudent as any).student
        const group = (groupStudent as any).group
        
        // Determine payment reminder day:
        // - If student has paid before, use last_payment_date day of month
        // - Otherwise, use course_start_date day of month
        let paymentDay: number
        if (groupStudent.last_payment_date) {
          const lastPaymentDate = new Date(groupStudent.last_payment_date)
          paymentDay = lastPaymentDate.getDate()
        } else if (groupStudent.course_start_date) {
          const courseStartDate = new Date(groupStudent.course_start_date)
          paymentDay = courseStartDate.getDate()
        } else {
          // Fallback: use today's day if neither is set
          paymentDay = todayDay
        }
        
        // Calculate payment due date: same day of month as payment day
        let paymentDueDate = new Date(now)
        paymentDueDate.setDate(paymentDay)
        
        // If the day has passed this month, set to next month
        if (paymentDueDate < now) {
          paymentDueDate.setMonth(paymentDueDate.getMonth() + 1)
        }
        
        const dueDateStr = paymentDueDate.toISOString().split('T')[0]
        const isOverdue = paymentDueDate < now
        
        // Only send reminders if payment is not paid
        // Send reminders on payment due day (same day as payment day) or if overdue
        // Reminders are sent twice daily (9 AM and 8 PM) until payment is received
        if (groupStudent.payment_status === "paid") {
          continue // Skip if already paid
        }
        
        // Send reminder if:
        // 1. Today is the payment due day (same day as course_start_date or last_payment_date)
        // 2. Payment is overdue
        // 3. Payment status is pending or overdue (not paid)
        if (todayDay !== paymentDay && !isOverdue && groupStudent.payment_status !== "overdue") {
          continue // Skip if not the payment day yet and not overdue
        }
        
        // Update payment_due_date in database if it's different
        if (groupStudent.payment_due_date !== dueDateStr) {
          await supabase
            .from("group_students")
            .update({ payment_due_date: dueDateStr })
            .eq("id", groupStudent.id)
        }

        // Get parent information
        const { data: parentLink } = await supabase
          .from("parent_student")
          .select(`
            parent:parent_id(*)
          `)
          .eq("student_id", student.id)
          .eq("is_linked", true)
          .single()

        const parent = parentLink ? (parentLink as any).parent : null

        // Determine who to send reminders to
        const recipients: Array<{ user: any; phone: string | null; email: string }> = []

        // Add student if they have phone or email
        if (student.has_phone && student.phone_number) {
          recipients.push({ user: student, phone: student.phone_number, email: student.email })
        } else if (!student.has_phone) {
          // Student has no phone, only add email
          recipients.push({ user: student, phone: null, email: student.email })
        }

        // Add parent (required for payment reminders)
        if (parent) {
          if (parent.phone_number) {
            recipients.push({ user: parent, phone: parent.phone_number, email: parent.email })
          } else {
            // Parent must have phone, but if missing, send email only
            recipients.push({ user: parent, phone: null, email: parent.email })
          }
        }

        // Create reminder message
        const reminderType = isOverdue ? "overdue" : "monthly"
        const amount = groupStudent.monthly_payment_amount
        const amountFormatted = amount?.toLocaleString() || "0"

        const messageSubject = isOverdue
          ? `Payment Overdue - ${group.name}`
          : `Payment Reminder - ${group.name}`

        const messageContent = isOverdue
          ? `Your monthly payment of ${amountFormatted} UZS for ${group.name} is overdue. Please make payment as soon as possible.`
          : `Reminder: Your monthly payment of ${amountFormatted} UZS for ${group.name} is due today (${paymentDueDate.toLocaleDateString()}).`

        // Send reminders to all recipients
        for (const recipient of recipients) {
          // Send email
          try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipientEmail: recipient.email,
                recipientName: recipient.user.full_name,
                senderName: "English Course Platform",
                subject: messageSubject,
                content: messageContent,
                platformUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              }),
            })
          } catch (emailError) {
            console.error(`Failed to send email to ${recipient.email}:`, emailError)
          }

          // Send SMS if phone number available
          if (recipient.phone) {
            try {
              await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/send-sms`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  phoneNumber: recipient.phone,
                  message: messageContent,
                  senderName: "English Course Platform",
                }),
              })
            } catch (smsError) {
              console.error(`Failed to send SMS to ${recipient.phone}:`, smsError)
            }
          }
        }

        // Record reminder in database
        await supabase.from("payment_reminders").insert({
          group_student_id: groupStudent.id,
          student_id: student.id,
          parent_id: parent?.id || null,
          reminder_type: reminderType,
          sent_to_email: true,
          sent_to_sms: recipients.some(r => r.phone !== null),
        })

        // Update payment status
        if (isOverdue) {
          await supabase
            .from("group_students")
            .update({ payment_status: "overdue" })
            .eq("id", groupStudent.id)
        } else if (todayDay === paymentDay && groupStudent.payment_status === "paid") {
          // If today is payment day and payment was already made, reset to pending for new month
          await supabase
            .from("group_students")
            .update({ 
              payment_status: "pending",
              payment_due_date: dueDateStr 
            })
            .eq("id", groupStudent.id)
        }

        remindersSent.push({
          student: student.full_name,
          group: group.name,
          amount: amountFormatted,
          dueDate: groupStudent.payment_due_date,
          status: reminderType,
        })
      } catch (error: any) {
        console.error(`Error processing reminder for group_student ${groupStudent.id}:`, error)
        errors.push({
          groupStudentId: groupStudent.id,
          error: error.message || "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${remindersSent.length} payment reminders`,
      remindersSent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Error in payment reminders API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process payment reminders" },
      { status: 500 }
    )
  }
}

