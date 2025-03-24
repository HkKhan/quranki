"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Menu, Moon, Sun, User } from "lucide-react";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const [hasSettings, setHasSettings] = useState<boolean | null>(null);

  // After hydration, we can safely show the UI that depends on the theme
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Check if the user has configured settings
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      const checkUserSettings = async () => {
        try {
          const response = await fetch("/api/settings");
          const data = await response.json();
          setHasSettings(!!data.settings);
        } catch (error) {
          console.error("Error checking user settings:", error);
          setHasSettings(false);
        }
      };

      checkUserSettings();
    } else if (status === "unauthenticated") {
      setHasSettings(null); // Reset for non-logged in users
    }
  }, [status, session?.user?.id]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleNavigation = (href: string, e: React.MouseEvent) => {
    // Only intercept clicks to the review page for authenticated users without settings
    if (
      href === "/review" &&
      status === "authenticated" &&
      hasSettings === false
    ) {
      e.preventDefault();
      // Show alert and redirect to setup
      alert("You need to configure your review settings first.");
      router.push("/setup");
    }
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
        <div className="md:hidden mr-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[240px]">
              <nav className="flex flex-col space-y-4 mt-8">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={(e) => handleNavigation(route.href, e)}
                    className={cn(
                      "text-sm font-medium py-2 transition-colors hover:text-primary",
                      route.active
                        ? "border-l-2 border-primary pl-3 text-foreground"
                        : "text-foreground pl-4",
                      route.href === "/review" &&
                        status === "authenticated" &&
                        hasSettings === false
                        ? "text-muted-foreground hover:text-primary/70"
                        : ""
                    )}
                  >
                    {route.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
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
        <nav className="hidden md:flex items-center space-x-6 pr-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              onClick={(e) => handleNavigation(route.href, e)}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                route.active
                  ? "border-b-2 border-primary pb-2 text-foreground"
                  : "text-foreground",
                route.href === "/review" &&
                  status === "authenticated" &&
                  hasSettings === false
                  ? "text-muted-foreground hover:text-primary/70"
                  : ""
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center space-x-2">
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
                <span className="hidden md:inline">
                  {theme === "dark" ? "Light" : "Dark"}
                </span>
              </>
            ) : (
              <span className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
