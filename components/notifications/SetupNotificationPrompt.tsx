'use client';

import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function SetupNotificationPrompt() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();
  
  // Check notification status from API
  useEffect(() => {
    const checkPromptStatus = async () => {
      if (status === 'authenticated') {
        try {
          setLoading(true);
          setError(null);
          
          console.log('Setup page: Checking notification prompt status');
          const response = await fetch('/api/profile/notification-prompt');
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            const errorMessage = errorData.error || `Server error: ${response.status} ${response.statusText}`;
            console.error('Setup page: Error fetching notification status:', errorMessage);
            setError(errorMessage);
            return;
          }
          
          let data;
          try {
            data = await response.json();
            console.log('Setup page: Notification status data:', data);
          } catch (parseError) {
            console.error('Setup page: Error parsing notification response:', parseError);
            setError('Failed to parse server response');
            return;
          }
          
          // If user has already seen the prompt or has notifications enabled, don't show it
          if (data.hasSeenPrompt || data.hasEnabledNotifications) {
            console.log('Setup page: User has seen prompt or has notifications enabled');
            setDismissed(true);
          } else {
            console.log('Setup page: Showing notification prompt');
            setDismissed(false);
          }
        } catch (error) {
          console.error('Setup page: Network error checking notification status:', error);
          setError('Network error. Please try again later.');
        } finally {
          setLoading(false);
        }
      } else if (status === 'unauthenticated') {
        setLoading(false);
      }
    };

    checkPromptStatus();
  }, [status]);

  const handleEnableClick = async () => {
    try {
      console.log('Setup page: Enabling notifications');
      // Mark the prompt as seen
      const response = await fetch('/api/profile/notification-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update notification settings');
      }
      
      setDismissed(true);
      // Navigate to notifications tab in profile
      router.push('/profile?tab=notifications');
    } catch (error) {
      console.error('Setup page: Error enabling notifications:', error);
      // Still dismiss the prompt even if there's an error to avoid frustrating the user
      setDismissed(true);
      // We'll still redirect them, but they might need to enable settings manually
      router.push('/profile?tab=notifications');
    }
  };

  const handleDismiss = async () => {
    try {
      console.log('Setup page: Dismissing notification prompt');
      // Mark the prompt as seen
      const response = await fetch('/api/profile/notification-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update notification settings');
      }
      
      setDismissed(true);
    } catch (error) {
      console.error('Setup page: Error dismissing notification prompt:', error);
      // Still dismiss the prompt even if there's an error to avoid frustrating the user
      setDismissed(true);
    }
  };

  if (dismissed || loading || status !== 'authenticated') {
    return null;
  }

  // If there's an error but we want to show something anyway
  if (error) {
    console.warn('Setup page: Showing notification prompt despite error:', error);
  }

  return (
    <Alert className="relative mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
      <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <p className="text-blue-800 dark:text-blue-200 font-medium">
            Enable notifications for your Quran review
          </p>
          <p className="mt-1 text-blue-700 dark:text-blue-200">
            Set up notifications to receive reminders for your daily review sessions and stay consistent with your progress.
          </p>
          <p className="mt-1 text-sm text-blue-600 dark:text-blue-300">
            Note: Notifications currently only work on desktop browsers. Our mobile app is coming soon!
          </p>
          <p className="mt-1 text-sm text-blue-600 dark:text-blue-300">
            If you don't see notifications after enabling, please check your browser and system notification settings.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 border-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/40"
          >
            Later
          </Button>
          <Button
            size="sm"
            onClick={handleEnableClick}
            className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Enable Notifications
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
} 