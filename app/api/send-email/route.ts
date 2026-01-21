import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientEmail, recipientName, senderName, subject, content, platformUrl } = body

    if (!recipientEmail || !senderName || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured. Email will not be sent.")
      return NextResponse.json(
        {
          success: false,
          message: "Email service not configured",
          note: "Email functionality requires Resend API key configuration",
        },
        { status: 200 }, // Return 200 so message sending doesn't fail
      )
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message from ${senderName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2563eb; margin-top: 0;">New Message from EduLingo</h2>
            <p>Hello ${recipientName || "there"},</p>
            <p>You have received a new message from <strong>${senderName}</strong>.</p>
            
            ${subject ? `<div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Subject:</strong> ${subject}
            </div>` : ""}
            
            <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="white-space: pre-wrap; margin: 0;">${content}</p>
            </div>
            
            ${platformUrl ? `<div style="text-align: center; margin: 30px 0;">
              <a href="${platformUrl}/dashboard/messages" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Message in Platform
              </a>
            </div>` : ""}
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This is an automated notification from EduLingo Platform.<br>
              Please do not reply to this email directly. Use the platform to respond.
            </p>
          </div>
        </body>
      </html>
    `

    const emailText = `
New Message from EduLingo

Hello ${recipientName || "there"},

You have received a new message from ${senderName}.

${subject ? `Subject: ${subject}\n\n` : ""}${content}

${platformUrl ? `\nView the message in the platform: ${platformUrl}/dashboard/messages` : ""}

---
This is an automated notification from EduLingo Platform.
Please do not reply to this email directly. Use the platform to respond.
    `.trim()

    // Send email using Resend (works with Gmail, Outlook, and all email clients)
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "EduLingo <onboarding@resend.dev>",
      to: recipientEmail,
      subject: subject || `New message from ${senderName}`,
      html: emailHtml,
      text: emailText,
      // Add reply-to for better email client integration
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
    })

    if (error) {
      console.error("Error sending email:", error)
      // Return success with warning so message sending doesn't fail
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to send email",
          note: "Email sending failed but message was saved in platform",
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
        emailId: data?.id,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

