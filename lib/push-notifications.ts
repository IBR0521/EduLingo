/**
 * Push Notification Utilities
 * Handles web push notification subscriptions and sending
 */

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Request notification permission and subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  userId: string
): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser')
    throw new Error('Push notifications are not supported in this browser')
  }

  // Check if VAPID key is configured
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey || vapidPublicKey.trim() === '') {
    console.error('VAPID_PUBLIC_KEY is not configured')
    throw new Error('Push notifications are not configured. Please contact the administrator.')
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission()
    if (permission === 'denied') {
      console.log('Notification permission denied - push notifications will not work')
      return null // Silently fail if denied
    }
    if (permission !== 'granted') {
      console.log('Notification permission not granted - push notifications will not work')
      return null // Silently fail if not granted
    }

    // Register service worker
    let registration
    try {
      registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
    } catch (swError: any) {
      console.error('Service worker registration error:', swError)
      throw new Error(`Failed to register service worker: ${swError.message}`)
    }

    // Subscribe to push notifications
    let subscription
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    } catch (subError: any) {
      console.error('Push subscription error:', subError)
      throw new Error(`Failed to subscribe to push notifications: ${subError.message}`)
    }

    // Save subscription to database
    try {
      await savePushSubscription(userId, subscription)
    } catch (saveError: any) {
      console.error('Failed to save subscription:', saveError)
      throw new Error(`Failed to save subscription: ${saveError.message}`)
    }

    return subscription
  } catch (error: any) {
    console.error('Error subscribing to push notifications:', error)
    throw error // Re-throw to let the caller handle it
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      await deletePushSubscription(userId, subscription.endpoint)
      return true
    }

    return false
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}

/**
 * Check if user has push notification permission
 */
export async function checkPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Save push subscription to database
 */
async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const subscriptionData: PushSubscriptionData = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
      auth: arrayBufferToBase64(subscription.getKey('auth')!),
    },
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      subscription: subscriptionData,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to save push subscription')
  }
}

/**
 * Delete push subscription from database
 */
async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  const response = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      endpoint,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to delete push subscription')
  }
}

/**
 * Convert VAPID public key from URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

