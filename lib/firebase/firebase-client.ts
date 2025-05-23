// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from "firebase/messaging";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBtGfG-2bixEOK8B-YeVuSIVEuxOAxwKtQ",
  authDomain: "quranki-notifs.firebaseapp.com",
  projectId: "quranki-notifs",
  storageBucket: "quranki-notifs.firebasestorage.app",
  messagingSenderId: "324418902586",
  appId: "1:324418902586:web:ac623b7fb806e8b42c7303",
  measurementId: "G-DGD95CEL6R"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Analytics can only be initialized in the browser
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Cloud Messaging in the browser
let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Error initializing FCM:', error);
  }
}

// Request permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  
  if (!messaging) {
    console.error('Firebase Messaging is not initialized');
    return null;
  }

  try {
    // Check if notification permission is already granted
    if (Notification.permission === 'granted') {
      return await getFCMToken();
    }

    // Request permission from the user
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      return await getFCMToken();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

// Get the FCM token
export async function getFCMToken(): Promise<string | null> {
  if (!messaging) {
    console.error('Firebase Messaging is not initialized');
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set');
    return null;
  }

  try {
    // Get registration token. This requires the user to have allowed notifications
    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey,
    });

    if (currentToken) {
      return currentToken;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Set up the foreground message handler
export function setupOnMessage(callback: (payload: MessagePayload) => void) {
  if (!messaging) {
    console.error('Firebase Messaging is not initialized');
    return;
  }

  try {
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch (error) {
    console.error('Error setting up message handler:', error);
  }
}

export { app, analytics, messaging }; 