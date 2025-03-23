import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react"
import { MainNav } from "@/components/main-nav";
import { Providers } from './providers';
import { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

// Get the base URL for the application
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://quranki.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Quranki",
    template: "%s | Quranki",
  },
  description: "An intelligent spaced repetition system designed specifically for Quran review.",
  keywords: [
    "Quran",
    "Review",
    "Spaced Repetition",
    "Islamic",
    "Muslim",
    "Learning",
    "Education",
  ],
  authors: [
    {
      name: "Quranki",
      url: "https://quranki.com",
    },
  ],
  creator: "Quranki",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://quranki.com",
    title: "Quranki",
    description: "An intelligent spaced repetition system designed specifically for Quran review.",
    siteName: "Quranki",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quranki",
    description: "An intelligent spaced repetition system designed specifically for Quran review.",
    creator: "@quranki",
  },
  icons: {
    icon: [
      { url: "/quranmeta.ico", sizes: "any" },
      { url: "/quranmetadata.png", type: "image/png" }
    ],
    shortcut: ["/quranmeta.ico"],
    apple: [{ url: "/quranmetadata.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/quranmeta.ico" sizes="any" />
        <link rel="icon" href="/quranmetadata.png" type="image/png" />
        <link rel="apple-touch-icon" href="/quranmetadata.png" />
        <link rel="shortcut icon" href="/quranmeta.ico" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-background font-sans antialiased`}
      >
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              <div className="flex min-h-screen flex-col">
                <MainNav />
                <main className="flex-1">
                  {children}
                </main>
                <footer className="border-t py-6 md:py-0">
                  <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                      © {new Date().getFullYear()} QuranKi. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                      <a
                        href="/privacy"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Privacy
                      </a>
                      <a
                        href="/terms"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Terms
                      </a>
                    </div>
                  </div>
                </footer>
              </div>
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
