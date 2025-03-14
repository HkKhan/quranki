"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useSafeSignOut } from "@/components/session-provider";

export function SignOutButton() {
  const safeSignOut = useSafeSignOut();
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => safeSignOut()}
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      <span>Sign Out</span>
    </Button>
  );
} 