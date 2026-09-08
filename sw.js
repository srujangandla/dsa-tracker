// ============================================
// DSA TRACKER SERVICE WORKER
// Web Push Notifications & Reminders
// ============================================

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Push Event Listener
self.addEventListener('push', (event) => {
    let data = {
        title: '🎯 DSA Reminder',
        body: "You haven't completed today's DSA challenge yet! Day is waiting.",
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'dsa-reminder',
        data: { url: self.location.origin }
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || undefined,
        badge: data.badge || undefined,
        tag: data.tag || 'dsa-reminder',
        renotify: true,
        data: data.data || { url: '/' }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.host) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Message Listener from Main Script
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, options } = event.data;
        self.registration.showNotification(title, options);
    }
});
