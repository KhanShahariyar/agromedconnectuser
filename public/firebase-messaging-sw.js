

importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyD843oLkOnYSshbgfFf23ST4fpJR_i6zS4',
  authDomain: 'agromedconnect-67db1.firebaseapp.com',
  projectId: 'agromedconnect-67db1',
  storageBucket: 'agromedconnect-67db1.firebasestorage.app',
  messagingSenderId: '344138536854',
  appId: '1:344138536854:web:ee150ffd99587f22926fb7',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  if (payload.notification) return
  const data = payload.data || {}
  self.registration.showNotification(data.title || 'AgroMedConnect', {
    body: data.body || '',
    icon: '/favicon.ico',
    tag: data.notification_id || undefined,
    data: { notificationId: data.notification_id || null },
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if (new URL(client.url).origin !== self.location.origin) continue
        await client.focus()
        client.postMessage({ type: 'agromed:open-notifications' })
        return
      }
      await self.clients.openWindow('/?view=notifications')
    })(),
  )
})
