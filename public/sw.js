self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'MediProtect', body: 'Nueva notificación' }
  const url = data.url || '/mis-citas'

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url },
      vibrate: [200, 100, 200],
      tag: data.tag || 'mediprotect',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/mis-citas'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('mediprotect') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
