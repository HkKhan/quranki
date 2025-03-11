"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export function MainNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Home",
      href: "/",
      isActive: pathname === "/",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      isActive: pathname.includes("/dashboard"),
    },
    {
      name: "Review",
      href: "/review",
      isActive: pathname.includes("/review"),
    },
    {
      name: "Setup",
      href: "/setup",
      isActive: pathname.includes("/setup"),
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-2 flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">QuranKi</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                item.isActive
                  ? "text-foreground font-semibold"
                  : "text-foreground/60"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
