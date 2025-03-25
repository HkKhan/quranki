'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface NotificationContextType {
  showPrompt: boolean;
  setShowPrompt: (show: boolean) => void;
  hasSeenPrompt: boolean;
  setHasSeenPrompt: (seen: boolean) => void;
  isNewUser: boolean;
  markPromptAsSeen: () => Promise<void>;
}

interface NotificationStatus {
  hasSeenPrompt: boolean;
  hasEnabledNotifications: boolean;
  error?: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasSeenPrompt, setHasSeenPrompt] = useState(true); // Default to true to prevent flash
  const [isNewUser, setIsNewUser] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Function to mark the prompt as seen via API
  const markPromptAsSeen = async () => {
    if (status === 'authenticated' && session?.user) {
      try {
        const response = await fetch('/api/profile/notification-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const data = await response.json();
          console.error('Error marking notification prompt as seen:', data.error || 'Unknown error');
          return;
        }
        
        setHasSeenPrompt(true);
        setShowPrompt(false);
      } catch (error) {
        console.error('Network error marking notification prompt as seen:', error);
      }
    }
  };

  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (status === 'authenticated' && session?.user) {
        try {
          // Check if we're on the setup page - if so, consider user as new
          const isOnSetupPage = pathname === '/setup';
          setIsNewUser(isOnSetupPage);

          console.log('Fetching notification prompt status...');
          const response = await fetch('/api/profile/notification-prompt');
          
          if (!response.ok) {
            try {
              const errorData = await response.json();
              console.error('Error fetching notification prompt status:', 
                errorData && typeof errorData === 'object' && 'error' in errorData 
                  ? errorData.error 
                  : response.statusText
              );
            } catch (parseError) {
              console.error('Error fetching notification prompt status:', response.statusText);
            }
            return;
          }
          
          let data: NotificationStatus;
          try {
            data = await response.json();
            console.log('Notification status data:', data);
          } catch (parseError) {
            console.error('Error parsing notification status response:', parseError);
            return;
          }
          
          const { hasSeenPrompt: seen, hasEnabledNotifications } = data;

          // If user has enabled notifications, they don't need to see the prompt
          if (hasEnabledNotifications) {
            console.log('User has notifications enabled, not showing prompt');
            setHasSeenPrompt(true);
            setShowPrompt(false);
            return;
          }

          // For new users on setup page: always show if they haven't seen it
          if (isOnSetupPage && !seen) {
            console.log('New user on setup page, showing notification prompt');
            setShowPrompt(true);
            setHasSeenPrompt(false);
            return;
          }
          
          // For returning users on home page: show if they haven't seen it
          if (pathname === '/' && !seen) {
            console.log('Returning user on home page, showing notification prompt');
            setShowPrompt(true);
            setHasSeenPrompt(false);
            return;
          }
          
          // Otherwise, respect the stored value
          setHasSeenPrompt(seen);
          setShowPrompt(!seen);
          
        } catch (error) {
          console.error('Network error checking notification status:', error);
        }
      }
    };

    checkNotificationStatus();
  }, [session?.user, status, pathname]);

  return (
    <NotificationContext.Provider value={{ 
      showPrompt, 
      setShowPrompt, 
      hasSeenPrompt, 
      setHasSeenPrompt, 
      isNewUser,
      markPromptAsSeen
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 