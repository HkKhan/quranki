'use client';

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, BarChart2, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  const scrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const howItWorksSection = document.getElementById('how-it-works');
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div>
      <main className="scroll-smooth">
        <section className="relative w-full min-h-[100vh] flex items-center justify-center">
          <div 
            className="absolute inset-0 z-0 h-full w-full"
            style={{
              backgroundImage: "url('/quran_background.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="absolute inset-0 bg-black/50 z-0" />
          <div className="container relative z-10 px-4 md:px-6 py-12 md:py-24">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl text-white">
                  Review the Quran with Ease
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl">
                  An intelligent spaced repetition system designed specifically for Quran review
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/setup">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">Get Started</Button>
                </Link>
                <a href="#how-it-works" onClick={scrollToHowItWorks}>
                  <Button variant="outline" size="lg" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                    Learn More
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-background">
                <BookOpen className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Customized Review</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Select which juzaa you know and how many ayahs you want to review after each prompt
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-background">
                <Calendar className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Spaced Repetition</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Review ayahs at optimal intervals to strengthen your knowledge over time
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border rounded-lg p-6 bg-background">
                <BarChart2 className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Progress Tracking</h3>
                <p className="text-center text-gray-500 dark:text-gray-400">
                  Visualize your review history and upcoming reviews with detailed statistics
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 scroll-mt-20">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">How It Works</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Our app uses a proven spaced repetition algorithm to help you efficiently review the Quran:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4">
                    <Badge variant="outline" className="h-8 w-8 rounded-full p-2 flex items-center justify-center text-primary border-primary">1</Badge>
                    <div className="space-y-1">
                      <div className="text-base font-medium">Set Your Knowledge Level</div>
                      <div className="text-sm text-muted-foreground">Select which juzaa you've learned</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Badge variant="outline" className="h-8 w-8 rounded-full p-2 flex items-center justify-center text-primary border-primary">2</Badge>
                    <div className="space-y-1">
                      <div className="text-base font-medium">Configure Review Length</div>
                      <div className="text-sm text-muted-foreground">Choose how many ayahs to recall when shown a prompt</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Badge variant="outline" className="h-8 w-8 rounded-full p-2 flex items-center justify-center text-primary border-primary">3</Badge>
                    <div className="space-y-1">
                      <div className="text-base font-medium">Daily Review</div>
                      <div className="text-sm text-muted-foreground">Review with our intelligent scheduling system that prioritizes what you need to practice</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Badge variant="outline" className="h-8 w-8 rounded-full p-2 flex items-center justify-center text-primary border-primary">4</Badge>
                    <div className="space-y-1">
                      <div className="text-base font-medium">Track Progress</div>
                      <div className="text-sm text-muted-foreground">Monitor your journey with detailed statistics and visualizations</div>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border bg-muted p-8">
                <div className="flex flex-col space-y-4">
                  <div className="rounded-md bg-background p-4">
                    <p className="font-arabic text-lg text-center">وَالْمُرْسَلَاتِ عُرْفًا</p>
                    <p className="text-sm text-center text-gray-500 mt-2">Al-Mursalat 77:1</p>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">Recall the next 2 ayahs...</div>
                  <Button className="w-full">Show Answer</Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

