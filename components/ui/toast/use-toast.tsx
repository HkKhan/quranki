"use client";

import * as React from "react";
import { Toast } from "./toast";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastActionElement = React.ReactElement;

export interface Toast extends ToastProps {
  id: string;
  action?: ToastActionElement;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (props: ToastProps) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback(
    ({ title, description, variant }: ToastProps) => {
      setToasts((current) => {
        const id = Math.random().toString(36).substring(2, 9);
        return [...current, { id, title, description, variant }];
      });
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setToasts((current) => current.slice(1));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slide-in-right"
            onAnimationEnd={() => {
              setTimeout(() => removeToast(toast.id), 300);
            }}
          >
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
} 