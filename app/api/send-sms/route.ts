import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, message, senderName } = body

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("Twilio is not configured. SMS will not be sent.")
      return NextResponse.json(
        {
          success: false,
          message: "SMS service not configured",
          note: "SMS functionality requires Twilio configuration",
        },
        { status: 200 }, // Return 200 so message sending doesn't fail
      )
    }

    // Format phone number for Uzbekistan (+998)
    // Accepts: +998XXXXXXXXX, 998XXXXXXXXX, or 9XXXXXXXXX (local format)
    let formattedPhone = phoneNumber.trim()
    
    // Remove any spaces, dashes, or parentheses
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, "")
    
    // If it starts with 9 (local Uzbekistan format), add +998
    if (formattedPhone.startsWith("9") && formattedPhone.length === 9) {
      formattedPhone = `+998${formattedPhone}`
    }
    // If it starts with 998 (without +), add +
    else if (formattedPhone.startsWith("998") && formattedPhone.length === 12) {
      formattedPhone = `+${formattedPhone}`
    }
    // If it already starts with +998, use as is
    else if (formattedPhone.startsWith("+998") && formattedPhone.length === 13) {
      // Already correct format
    }
    // If it starts with + but not +998, use as is (for other countries)
    else if (formattedPhone.startsWith("+")) {
      // Use as is
    }
    // Otherwise, assume it's a local Uzbekistan number and add +998
    else {
      formattedPhone = `+998${formattedPhone}`
    }
    
    // Validate Uzbekistan phone number format
    if (formattedPhone.startsWith("+998")) {
      // Uzbekistan: +998 followed by 9 digits (total 13 characters)
      if (formattedPhone.length !== 13 || !/^\+998\d{9}$/.test(formattedPhone)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Uzbekistan phone number format. Expected: +998XXXXXXXXX (9 digits after +998)",
          },
          { status: 400 },
        )
      }
    }

    // Send SMS using Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`

    const smsBody = new URLSearchParams({
      To: formattedPhone,
      From: process.env.TWILIO_PHONE_NUMBER,
      Body: senderName ? `Message from ${senderName}: ${message}` : message,
    })

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: smsBody.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Twilio error:", data)
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Failed to send SMS",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "SMS sent successfully",
        sid: data.sid,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error sending SMS:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send SMS",
        note: "SMS sending failed but message was saved in platform",
      },
      { status: 200 }, // Return 200 so message sending doesn't fail
    )
  }
}

