"use client";

import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

interface InviterInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [inviter, setInviter] = useState<InviterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get invitation parameter and fetch inviter details
  useEffect(() => {
    const inviteParam = searchParams.get("invitedBy");
    
    if (inviteParam) {
      setInvitedBy(inviteParam);
      
      // Fetch the inviter's details
      const fetchInviter = async () => {
        try {
          const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(inviteParam)}`);
          const data = await response.json();
          
          if (response.ok) {
            setInviter(data.user);
          }
        } catch (error) {
          console.error("Error fetching inviter details:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchInviter();
    } else {
      setLoading(false);
    }
  }, [searchParams]);
  
  // Get the display name (use name if available, otherwise use email)
  const inviterDisplayName = inviter?.name || invitedBy || '';
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Please sign in to your account</p>
        </div>
        {invitedBy && (
          <div className="mt-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm">
            <p className="font-medium mb-1 text-center text-base">
              Sign in to add <span className="font-bold">{inviterDisplayName}</span> as a friend on Quranki
            </p>
          </div>
        )}
        <LoginForm inviterName={inviterDisplayName} />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              href={invitedBy ? `/register?invitedBy=${encodeURIComponent(invitedBy)}` : "/register"} 
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
} 