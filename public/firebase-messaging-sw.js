// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'QuranKi Notification';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification from QuranKi',
    icon: '/quranki-logo.png',
    badge: '/quranki-badge.png',
    data: payload.data,
    actions: [
      {
        action: 'view',
        title: 'View QuranKi',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click Received.');

  const clickedNotification = event.notification;
  clickedNotification.close();

  // Handle action button clicks
  if (event.action === 'view') {
    // Open the main app
    clients.openWindow('https://quranki.com');
    return;
  }

  // Default action is to open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there is already a window/tab open with the target URL
        for (const client of clientList) {
          // If so, focus it
          if (client.url.startsWith('https://quranki.com') && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow('https://quranki.com');
        }
      })
  );
}); 