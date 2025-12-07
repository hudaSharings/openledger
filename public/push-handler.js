// Push notification handler for service worker
self.addEventListener("push", function (event) {
  console.log("Push notification received");

  let data = {
    title: "Payment Reminder",
    body: "You have a payment reminder",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || data.data,
      };
    } catch (e) {
      console.error("Error parsing push data:", e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: "view",
        title: "View Reminder",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {
  console.log("Notification clicked");

  event.notification.close();

  if (event.action === "view" || !event.action) {
    // Open the app to the reminders page or specific reminder
    const urlToOpen = event.notification.data?.url || "/reminders";
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

