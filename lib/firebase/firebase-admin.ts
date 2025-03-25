import * as admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

let firebaseAdmin: admin.app.App | undefined;

// Initialize Firebase Admin SDK
export async function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // Prepare the private key - it might be escaped in the environment variable
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  } else {
    firebaseAdmin = admin.app();
  }
  
  return admin;
}

// Function to send push notification using Firebase Admin
export async function sendPushNotification({
  token,
  title,
  body,
  data = {},
}: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    // Initialize Firebase Admin if not already initialized
    const admin = await initializeFirebaseAdmin();
    const messaging = getMessaging(firebaseAdmin);

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data,
      webpush: {
        fcmOptions: {
          link: process.env.NEXTAUTH_URL || 'https://quranki.vercel.app',
        },
        notification: {
          icon: '/logo.png',
          badge: '/logo.png',
          actions: [
            {
              action: 'open_app',
              title: 'Open App',
            },
          ],
        },
      },
    };

    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

// Function to send notifications to multiple tokens
export async function sendMulticastPushNotification({
  tokens,
  title,
  body,
  data = {},
}: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    if (!tokens.length) {
      console.error('No tokens provided');
      return { success: 0, failure: 0 };
    }

    // Initialize Firebase Admin if not already initialized
    const admin = await initializeFirebaseAdmin();
    const messaging = getMessaging(firebaseAdmin);

    // Process in batches of 500 (FCM limit)
    const results = { success: 0, failure: 0 };
    
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      
      // Create a multicast message
      const messages = batch.map(token => ({
        token,
        notification: {
          title,
          body,
        },
        data,
        webpush: {
          fcmOptions: {
            link: process.env.NEXTAUTH_URL || 'https://quranki.vercel.app',
          },
          notification: {
            icon: '/logo.png',
            badge: '/logo.png',
            actions: [
              {
                action: 'open_app',
                title: 'Open App',
              },
            ],
          },
        },
      }));
      
      // Send each message individually (since sendAll is not available)
      const batchResults = await Promise.all(
        messages.map(async (message) => {
          try {
            await messaging.send(message);
            return { success: true };
          } catch (err) {
            console.error(`Error sending to token:`, err);
            return { success: false };
          }
        })
      );
      
      const batchSuccess = batchResults.filter(r => r.success).length;
      const batchFailure = batchResults.filter(r => !r.success).length;
      
      results.success += batchSuccess;
      results.failure += batchFailure;
    }

    console.log(`Successfully sent ${results.success} messages; failed to send ${results.failure} messages`);
    return results;
  } catch (error) {
    console.error('Error sending multicast messages:', error);
    return { success: 0, failure: tokens.length };
  }
} 