// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'New Notification'
  const options = {
    body: data.message || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.id || 'notification',
    requireInteraction: data.priority === 'high' || data.priority === 'urgent',
    data: {
      url: data.action_url || '/dashboard/notifications',
      id: data.id,
    },
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const url = event.notification.data?.url || '/dashboard/notifications'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

