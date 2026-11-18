/* MediMitra Firebase Cloud Messaging Service Worker */
/* Handles background push notifications when FCM is configured with a VAPID key */
self.addEventListener('push', function (event) {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'MediMitra Reminder', body: event.data.text() } };
  }
  const title = payload.notification?.title || 'MediMitra Medicine Reminder';
  const options = {
    body: payload.notification?.body || 'It is time to review your scheduled medication.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.scheduleId || 'medimitra-reminder',
    requireInteraction: true,
    data: payload.data || { url: '/schedule' },
    actions: [
      { action: 'open', title: 'Open MediMitra' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/schedule';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
