"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

export function MainNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  // After hydration, we can safely show the UI that depends on the theme
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
    },
    {
      href: "/review",
      label: "Review",
      active: pathname === "/review",
    },
    {
      href: "/leaderboard",
      label: "Leaderboard",
      active: pathname === "/leaderboard",
    },
    {
      href: "/setup",
      label: "Setup",
      active: pathname === "/setup",
    },
    {
      href: "/bug-report",
      label: "Bug Report",
      active: pathname === "/bug-report",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center mr-4">
          <Link href="/" className="flex items-center">
            <div
              className={cn(
                "relative p-1 transition-all duration-300 rounded-lg",
                theme === "dark"
                  ? "hover:bg-gold-900/10 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                  : "hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              )}
            >
              <Image
                src={
                  theme === "dark" ? "/qurankilogo.png" : "/qurankilight.png"
                }
                alt="QuranKi Logo"
                width={120}
                height={36}
                className={cn(
                  "h-9 w-[120px] transition-all duration-300 rounded-lg",
                  theme === "dark"
                    ? "shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                    : "shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                )}
                priority
              />
            </div>
          </Link>
        </div>
        <div className="flex-1"></div>
        <nav className="flex items-center space-x-6 pr-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                route.active
                  ? "border-b-2 border-primary pb-2 text-foreground"
                  : "text-foreground"
              )}
            >
              {route.label}
            </Link>
          ))}
          {isLoading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {session.user.name || session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    signOut({ callbackUrl: "https://quranki.com" })
                  }
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium transition-colors hover:text-primary text-foreground"
            >
              Sign in
            </Link>
          )}
        </nav>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="flex items-center gap-2"
          aria-label={
            mounted
              ? theme === "dark"
                ? "Switch to Light Theme"
                : "Switch to Dark Theme"
              : "Toggle Theme"
          }
        >
          {mounted ? (
            <>
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </>
          ) : (
            <span className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
