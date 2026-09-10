// Service Worker for Plumb Line - Rooted Guide
const CACHE_NAME = 'rooted-guide-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Notification Event Listener
self.addEventListener('push', (event) => {
  let title = 'Rooted Guide';
  let options = {
    body: 'Daily Scripture reminder: Ground your heart in stillness today.',
    icon: '/app-logo-adaptive.png',
    badge: '/app-logo-adaptive.png',
    vibrate: [100, 50, 100],
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      if (json.title) title = json.title;
      if (json.body) options.body = json.body;
      if (json.icon) options.icon = json.icon;
      if (json.url) options.data.url = json.url;
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
