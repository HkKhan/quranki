import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNav } from "@/components/main-nav";
import { Providers } from './providers';

const inter = Inter({ subsets: ["latin"] });

// Get the base URL for the application
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://quranki.vercel.app";

export const metadata = {
  title: "QuranKi - Spaced Repetition for Quran Memorization",
  description:
    "A spaced repetition system designed for Quran memorization and review",
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "QuranKi - Spaced Repetition for Quran Memorization",
    description:
      "Strengthen your Quran memorization with spaced repetition techniques",
    url: baseUrl,
    siteName: "QuranKi",
    images: [
      {
        url: "/quranki_logo.png",
        width: 1024,
        height: 1024,
        alt: "QuranKi Logo - Spaced Repetition for Quran Memorization",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuranKi - Spaced Repetition for Quran Memorization",
    description:
      "Strengthen your Quran memorization with spaced repetition techniques",
    images: ["/quranki_logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
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
                    <a
                      href="/contact"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Contact
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
