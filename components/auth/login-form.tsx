'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

interface LoginFormProps {
  inviterName?: string;
}

export function LoginForm({ inviterName }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);

  // Check for invitation parameters in URL
  useEffect(() => {
    const inviteParam = searchParams.get("invitedBy");
    if (inviteParam) {
      setInvitedBy(inviteParam);
    }
  }, [searchParams]);

  // Function to handle adding friend after successful login
  const handleInvitation = async () => {
    if (!invitedBy) return;

    try {
      const response = await fetch("/api/friends/add-after-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviterEmail: invitedBy }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.alreadyFriends) {
          toast({
            title: "Already Friends",
            description: `You are already friends with ${inviterName || invitedBy}`,
          });
        } else if (data.alreadySent) {
          toast({
            title: "Request Pending",
            description: "A friend request has already been sent",
          });
        } else {
          toast({
            title: "Success",
            description: `You are now friends with ${inviterName || invitedBy}`,
          });
        }
      } else {
        console.error("Error adding friend after login:", data.error);
      }
    } catch (error) {
      console.error("Error processing invitation:", error);
    }
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Process invitation if present
      if (invitedBy) {
        await handleInvitation();
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {invitedBy && !inviterName && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm">
          <p className="text-center">
            Sign in to connect with <span className="font-bold">{invitedBy}</span> as a friend
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
} 