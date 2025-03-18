import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Calendar,
  Flame,
  BarChart2,
  Plus,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  dueToday: number;
  reviewedToday: number;
  streak: number;
  totalReviewed: number;
  dailyAverage?: number;
  newAyahsDue: number;
  newAyahsReviewed: number;
  reviewAyahsDue: number;
  reviewAyahsReviewed: number;
}

export function StatsCards({
  dueToday,
  reviewedToday,
  streak,
  totalReviewed,
  dailyAverage = 0,
  newAyahsDue,
  newAyahsReviewed,
  reviewAyahsDue,
  reviewAyahsReviewed,
}: StatsCardsProps) {
  // Format daily average to 1 decimal place
  const formattedAverage = dailyAverage.toFixed(1);

  // Calculate percentage for progress bars, avoiding division by zero
  const newAyahsProgressPercent =
    newAyahsDue > 0 ? Math.min(100, (newAyahsReviewed / newAyahsDue) * 100) : 0;

  const reviewAyahsProgressPercent =
    reviewAyahsDue > 0
      ? Math.min(100, (reviewAyahsReviewed / reviewAyahsDue) * 100)
      : 0;

  // Check if all reviews are complete
  const allComplete =
    (newAyahsDue === 0 || newAyahsReviewed === newAyahsDue) &&
    (reviewAyahsDue === 0 || reviewAyahsReviewed === reviewAyahsDue);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due Today</CardTitle>
          <Calendar className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dueToday}</div>
          <p className="text-xs text-muted-foreground mb-3">
            {reviewedToday} of {dueToday} total ayahs reviewed
          </p>

          <div className="space-y-3">
            {/* New Ayahs Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Plus className="h-3 w-3 text-blue-500 mr-1" />
                  <span className="text-xs font-medium">New Ayahs</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {newAyahsReviewed} of {newAyahsDue}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all duration-700 ease-in-out"
                  style={{ width: `${newAyahsProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Review Ayahs Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <History className="h-3 w-3 text-amber-500 mr-1" />
                  <span className="text-xs font-medium">Review Ayahs</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {reviewAyahsReviewed} of {reviewAyahsDue}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-amber-500 transition-all duration-700 ease-in-out"
                  style={{ width: `${reviewAyahsProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {allComplete && (
            <p className="text-xs text-green-600 mt-3 font-medium">
              All reviews complete! ✓
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Flame className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {streak} <span className="text-base ml-1">days</span>
            {streak >= 7 && <span className="ml-2">🔥</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            {streak === 0
              ? "Start reviewing today to begin your streak!"
              : "Keep reviewing daily to maintain your streak"}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
          <BarChart2 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formattedAverage}</div>
          <p className="text-xs text-muted-foreground">
            Ayahs reviewed per day (last 30 days)
          </p>
          {Number(formattedAverage) > 10 && (
            <div className="mt-2 text-xs text-green-600 font-medium">
              Excellent progress! 👏
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reviewed</CardTitle>
          <BookOpen className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalReviewed}</div>
          <div className="flex flex-col">
            <p className="text-xs text-muted-foreground">
              Ayahs reviewed since you started
            </p>
            <div className="h-1.5 w-full bg-muted rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, (totalReviewed / 500) * 100)}%`,
                  opacity: totalReviewed > 0 ? 1 : 0.5,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0</span>
              <span>250</span>
              <span>500</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
