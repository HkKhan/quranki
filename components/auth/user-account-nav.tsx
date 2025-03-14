"use client";

import Link from "next/link";
import { User } from "next-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, User as UserIcon, LogOut, Settings } from "lucide-react";
import { useSafeSignOut } from "@/components/session-provider";

interface UserAccountNavProps {
  user: Pick<User, "name" | "email" | "image">;
}

export function UserAccountNav({ user }: UserAccountNavProps) {
  const safeSignOut = useSafeSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User avatar"}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <UserIcon className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col space-y-1 p-2">
          {user.name && <p className="font-medium">{user.name}</p>}
          {user.email && (
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/auth/profile" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Profile Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => safeSignOut()}
        >
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 