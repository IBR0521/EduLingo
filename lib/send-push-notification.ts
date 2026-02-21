/**
 * Send push notification to a user
 * This function is called when a notification is created in the database
 */

export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  priority: "low" | "normal" | "high" | "urgent" = "normal"
): Promise<void> {
  try {
    const response = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        title,
        message,
        action_url: actionUrl,
        priority,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to send push notification:", error)
    }
  } catch (error) {
    console.error("Error sending push notification:", error)
    // Don't throw - push notifications are optional
  }
}






