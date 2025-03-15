'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export function NavMenu() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <Link
              href="/"
              className="flex items-center text-xl font-bold text-indigo-600"
            >
              QuranKi
            </Link>
          </div>

          <div className="flex items-center">
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
            ) : session?.user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Welcome, {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-indigo-600"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 