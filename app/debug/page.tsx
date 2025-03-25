'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    console.log('DebugPage: Status is', status);
    console.log('DebugPage: Session is', session);
  }, [status, session]);
  
  return (
    <div className="container p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      
      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl mb-2">Authentication Status</h2>
        <p>Status: {status}</p>
        <p>User: {session?.user?.name || 'Not logged in'}</p>
        <p>Email: {session?.user?.email || 'N/A'}</p>
      </div>
      
      <div className="space-y-2">
        <Link href="/" className="text-blue-500 hover:underline block">
          Home Page
        </Link>
        <Link href="/profile" className="text-blue-500 hover:underline block">
          Profile Page
        </Link>
      </div>
    </div>
  );
} 