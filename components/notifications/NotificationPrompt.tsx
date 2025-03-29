'use client';

import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useNotification } from './NotificationContext';

export function NotificationPrompt() {
  const router = useRouter();
  const { showPrompt, isNewUser, markPromptAsSeen } = useNotification();

  const handleEnableClick = async () => {
    await markPromptAsSeen();
    // Navigate to notifications tab in profile
    router.push('/profile?tab=notifications');
  };

  const handleDismiss = async () => {
    await markPromptAsSeen();
  };

  if (!showPrompt) {
    return null;
  }

  // Different messaging for new vs returning users
  const title = isNewUser 
    ? "Enable notifications for your Quran review" 
    : "Stay on track with your Quran memorization!";
  
  const description = isNewUser
    ? "Set up notifications to receive reminders for your daily review sessions and stay consistent with your progress."
    : "Enable notifications to receive daily reminders and streak alerts.";

  return (
    <Alert className="relative mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
      <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <p className="text-blue-800 dark:text-blue-200 font-medium">
            {title}
          </p>
          <p className="mt-1 text-blue-700 dark:text-blue-200">
            {description}
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
            {isNewUser ? "Later" : "Dismiss"}
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