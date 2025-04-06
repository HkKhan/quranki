"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// Re-export the useTheme hook from next-themes
export const useTheme = useNextTheme;
