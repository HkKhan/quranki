'use client';

import { usePathname } from 'next/navigation';
import { NotificationPrompt } from './NotificationPrompt';

export function NotificationPromptWrapper() {
  const pathname = usePathname();
  
  // Don't show the notification prompt on the setup page
  // since we're already showing it there directly
  if (pathname === '/setup') {
    return null;
  }
  
  return <NotificationPrompt />;
} 