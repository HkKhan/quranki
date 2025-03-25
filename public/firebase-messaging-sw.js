// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyBtGfG-2bixEOK8B-YeVuSIVEuxOAxwKtQ",
  authDomain: "quranki-notifs.firebaseapp.com",
  projectId: "quranki-notifs",
  storageBucket: "quranki-notifs.firebasestorage.app",
  messagingSenderId: "324418902586",
  appId: "1:324418902586:web:ac623b7fb806e8b42c7303",
  measurementId: "G-DGD95CEL6R"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

// Service Worker Installation
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate worker immediately
});

// Service Worker Activation
self.addEventListener('activate', (event) => {
  self.clients.claim(); // Take control of all clients
});

// Generic message handler
self.addEventListener('message', (event) => {
});

// Function to show notification
function showNotification(payload) {

  
  const notificationTitle = payload.notification?.title || 'QuranKi Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification from QuranKi',
    icon: '/quranki-logo.ico',
    badge: '/quranki-logo.png',
    data: payload.data || {},
    tag: payload.data?.type || 'default',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'open_app',
        title: 'Open QuranKi',
      },
    ],
    vibrate: [200, 100, 200],
  };
  
  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
    })
    .catch((error) => {
    });
}

// Handle push events directly
self.addEventListener('push', function(event) {
  
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    
    // Ensure the service worker stays active until the notification is shown
    event.waitUntil(showNotification(payload));
  } catch (error) {
    
    // Try to show a basic notification even if parsing fails
    event.waitUntil(
      self.registration.showNotification('QuranKi Notification', {
        body: 'You have a new notification',
        icon: '/quranki-logo.ico',
        badge: '/quranki-logo.png'
      })
    );
  }
});

// Handle background messages through Firebase
messaging.onBackgroundMessage((payload) => {
  return showNotification(payload);
});

// Handle notification click event
self.addEventListener('notificationclick', (event) => {

  const clickedNotification = event.notification;
  clickedNotification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const baseUrl = self.location.origin;
  const fullUrl = baseUrl + urlToOpen;

  // Handle action button clicks
  if (event.action === 'open_app') {
    event.waitUntil(clients.openWindow(fullUrl));
    return;
  }

  // Default action when clicking the notification body
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === fullUrl && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(fullUrl);
      })
  );
}); 