"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function MainNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

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
      href: "/setup",
      label: "Setup",
      active: pathname === "/setup",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center mr-4">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="font-bold">QuranKi</span>
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
        </nav>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="ml-auto flex items-center gap-2"
          aria-label={mounted ? (theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme") : "Toggle Theme"}
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
