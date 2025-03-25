"use client";

import { RegisterForm } from '@/components/auth/register-form';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';

interface InviterInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

// Create a client component that uses useSearchParams
function RegisterContent() {
  const searchParams = useSearchParams();
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [inviter, setInviter] = useState<InviterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check for invitation parameters in URL and fetch inviter details
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
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-gray-600">Please fill in your information</p>
        </div>
        {invitedBy && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm">
            <p className="font-medium mb-1 text-center text-base">
              Click this link to add <span className="font-bold">{inviterDisplayName}</span> as a friend on Quranki
            </p>
            <p className="text-center">
              After registration, you will be connected as friends!
            </p>
          </div>
        )}
        <RegisterForm />
      </div>
    </main>
  );
}

// Main component with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <RegisterContent />
    </Suspense>
  );
} 