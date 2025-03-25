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
  const isAuthenticated = status === "authenticated";

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
  }, [status, session?.user?.id, pathname]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleNavigation = (href: string, e: React.MouseEvent) => {
    // We won't block navigation to the review page anymore
    // The review page itself will handle showing appropriate error messages
    // This removes the alert() popup and allows for a better user experience
    
    // Just refresh the settings check when navigation happens
    if (status === "authenticated" && session?.user?.id) {
      fetch("/api/settings")
        .then(response => response.json())
        .then(data => {
          setHasSettings(!!data.settings);
        })
        .catch(error => {
          console.error("Error checking settings:", error);
        });
    }
  };

  // Full routes for authenticated users
  const authenticatedRoutes = [
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
      href: "/friends",
      label: "Friends",
      active: pathname === "/friends",
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

  // Limited routes for unauthenticated users
  const unauthenticatedRoutes = [
    {
      href: "/leaderboard",
      label: "Leaderboard",
      active: pathname === "/leaderboard",
    },
  ];

  // Choose routes based on authentication status
  const routes = isAuthenticated ? authenticatedRoutes : unauthenticatedRoutes;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile Menu Hamburger - Only for authenticated users */}
        {isAuthenticated ? (
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
                  {authenticatedRoutes.map((route) => (
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
        ) : (
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
                  <Link
                    href="/leaderboard"
                    className={cn(
                      "text-sm font-medium py-2 transition-colors hover:text-primary",
                      pathname === "/leaderboard"
                        ? "border-l-2 border-primary pl-3 text-foreground"
                        : "text-foreground pl-4"
                    )}
                  >
                    Leaderboard
                  </Link>
                  <Link
                    href="/register"
                    className={cn(
                      "text-sm font-medium py-2 transition-colors hover:text-primary",
                      pathname === "/register"
                        ? "border-l-2 border-primary pl-3 text-foreground"
                        : "text-foreground pl-4"
                    )}
                  >
                    Sign up
                  </Link>
                  <Link
                    href="/login"
                    className={cn(
                      "text-sm font-medium py-2 transition-colors hover:text-primary",
                      pathname === "/login"
                        ? "border-l-2 border-primary pl-3 text-foreground"
                        : "text-foreground pl-4"
                    )}
                  >
                    Sign in
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        )}
        
        {/* Logo */}
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
        
        {/* Desktop Navigation Menu */}
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
        
        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {session?.user?.name || session?.user?.email}
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
            <>
              <Link
                href="/register"
                className="text-sm font-medium transition-colors hover:text-primary text-foreground mr-2"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium transition-colors hover:text-primary text-foreground"
              >
                Sign in
              </Link>
            </>
          )}
          
          {/* Theme Toggle Button */}
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
