"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
  title?: string;
  description?: string;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = "default", title, description, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
          variant === "default" && "bg-background text-foreground",
          variant === "destructive" &&
            "destructive group border-destructive bg-destructive text-destructive-foreground",
          className
        )}
        {...props}
      >
        <div className="grid gap-1">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </div>
      </div>
    );
  }
);
Toast.displayName = "Toast"; 