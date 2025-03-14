import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, BarChart2, Calendar } from "lucide-react"

export default function LandingPage() {
  return (
    <div>
      <main>
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Memorize and Review the Quran with Ease
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  An intelligent spaced repetition system designed specifically for Quran memorization and review
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/setup">
                  <Button size="lg">Get Started</Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg">
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
                  Review ayahs at optimal intervals to strengthen your memorization over time
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
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-primary/10 p-1 text-primary">1</div>
                    <div>Set up your knowledge level by selecting which juzaa you've memorized</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-primary/10 p-1 text-primary">2</div>
                    <div>Configure how many "ayahs after" you want to recall when shown a prompt</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-primary/10 p-1 text-primary">3</div>
                    <div>
                      Review daily with our intelligent scheduling system that prioritizes what you need to review
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-primary/10 p-1 text-primary">4</div>
                    <div>Track your progress with detailed statistics and visualizations</div>
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

