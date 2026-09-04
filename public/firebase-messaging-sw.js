/* MotoPro Push service worker. Firebase configuration remains in the page;
   getToken() registers this worker explicitly, so no private value is stored here. */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { data: { message: event.data.text() } };
  }
  const data = payload.data || payload;
  const title = data.title || 'MotoPro';
  const options = {
    body: data.message || 'Tienes una nueva actualización.',
    icon: '/icons/motopro.svg',
    badge: '/icons/motopro.svg',
    tag: data.notification_id || undefined,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});
