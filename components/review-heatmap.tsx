"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ReviewData {
  interval: number;
  repetitions: number;
  easeFactor: number;
  lastReviewed: number;
  dueDate: number;
}

interface DayData {
  date: Date;
  reviewCount: number;  // Past reviews (blue)
  dueCount: number;     // Future due ayahs (red)
}

interface DailyLog {
  date: string;
  count: number;
}

export function ReviewHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({
    dailyAverage: 0,
    totalReviews: 0,
    daysWithReviews: 0,
    totalDue: 0,
  });

  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  // Force refresh of data every 60 seconds to capture new reviews
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Trigger re-render to refresh data
      setCurrentYear(prev => prev);
    }, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions using standard HTML dimensions without pixel ratio adjustments
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = 180;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = "100%";
    canvas.style.height = `${canvasHeight}px`;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate start and end dates for the current year
    const startDate = new Date(currentYear, 0, 1); // January 1st of current year
    const endDate = new Date(currentYear + 1, 0, 0); // December 31st of current year
    const days =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;

    const data: DayData[] = [];
    // Get exact current date with timezone offset to ensure accurate local date
    const today = new Date();
    // Normalize today to midnight for comparison, but preserve local timezone
    const normalizedToday = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );
    normalizedToday.setMinutes(normalizedToday.getMinutes() + today.getTimezoneOffset());

    // Initialize data array with zeros
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      data.push({ date, reviewCount: 0, dueCount: 0 });
    }

    // Fetch review data from the database
    const fetchData = async () => {
      try {
        // Fetch both spaced repetition data and review stats
        const [srResponse, reviewStatsResponse] = await Promise.all([
          fetch("/api/spaced-repetition"),
          fetch("/api/review-stats")
        ]);
        
        const srData = await srResponse.json();
        const reviewStatsData = await reviewStatsResponse.json();

        let totalReviews = 0;
        let daysWithReviews = 0;
        let yearReviews = 0;
        let totalDue = 0;

        // Process past review data from daily logs
        if (reviewStatsData.success && reviewStatsData.reviewStats && reviewStatsData.reviewStats.dailyReviews) {
          const dailyReviews = reviewStatsData.reviewStats.dailyReviews;
          
          // Map daily reviews to data array
          Object.entries(dailyReviews).forEach(([dateStr, count]) => {
            // Create date from the dateStr returned by the API
            // Important: Create a date from the YYYY-MM-DD string without assuming timezone
            const reviewDate = new Date(dateStr);
            
            // Our workaround for handling date inconsistencies is no longer needed since we fixed the API
            if (reviewDate.getFullYear() === currentYear) {
              // Calculate dayOfYear
              const dayOfYear = Math.floor(
                (reviewDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              if (dayOfYear >= 0 && dayOfYear < days) {
                const reviewCount = count as number;
                if (reviewCount > 0) {
                  daysWithReviews++;
                  data[dayOfYear].reviewCount = reviewCount;
                  yearReviews += reviewCount;
                }
              }
            }
            totalReviews += count as number;
          });
        }

        // Process due ayahs
        // First from review-stats API (preferred source)
        if (reviewStatsData.success && reviewStatsData.reviewStats && reviewStatsData.reviewStats.dueItems) {
          const dueItems = reviewStatsData.reviewStats.dueItems;
          
          dueItems.forEach((item: any) => {
            const dueDate = new Date(item.dueDate);
            
            // Only process future due dates
            if (dueDate >= normalizedToday && dueDate.getFullYear() === currentYear) {
              const dayOfYear = Math.floor(
                (dueDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              if (dayOfYear >= 0 && dayOfYear < days) {
                data[dayOfYear].dueCount += 1;
                totalDue += 1;
              }
            }
          });
        }
        // Fallback to spaced repetition data if review-stats API didn't have due items
        else if (srData.srData && totalDue === 0) {
          srData.srData.forEach((item: any) => {
            if (item.dueDate) {
              const dueDate = new Date(item.dueDate);
              
              // Only process future due dates
              if (dueDate >= normalizedToday && dueDate.getFullYear() === currentYear) {
                const dayOfYear = Math.floor(
                  (dueDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                if (dayOfYear >= 0 && dayOfYear < days) {
                  data[dayOfYear].dueCount += 1;
                  totalDue += 1;
                }
              }
            }
          });
        }

        // Calculate and set stats
        const dailyAverage =
          daysWithReviews > 0 ? yearReviews / daysWithReviews : 0;
        setStats({
          dailyAverage,
          totalReviews: yearReviews,
          daysWithReviews,
          totalDue,
        });

        // Calculate max counts for color intensity
        const maxReviewCount = Math.max(...data.map((d) => d.reviewCount), 1); // Ensure non-zero max
        const maxDueCount = Math.max(...data.map((d) => d.dueCount), 1); // Ensure non-zero max
        
        const getReviewColorIntensity = (count: number) => {
          if (count === 0) return 0;
          return Math.min(Math.ceil((count / maxReviewCount) * 4), 4);
        };
        
        const getDueColorIntensity = (count: number) => {
          if (count === 0) return 0;
          return Math.min(Math.ceil((count / maxDueCount) * 4), 4);
        };

        // Color schemes matching Anki
        const reviewColors = [
          "rgb(238, 238, 238)", // 0 reviews
          "rgb(219, 229, 241)", // 1-25% of max
          "rgb(171, 194, 225)", // 26-50% of max
          "rgb(132, 162, 216)", // 51-75% of max
          "rgb(91, 132, 207)", // 76-100% of max
        ];

        const dueColors = [
          "rgb(238, 238, 238)", // 0 due
          "rgb(255, 219, 219)", // 1-25% of max
          "rgb(255, 184, 184)", // 26-50% of max
          "rgb(255, 149, 149)", // 51-75% of max
          "rgb(255, 114, 114)", // 76-100% of max
        ];

        // Calendar layout constants
        const CANVAS_PADDING = 16;
        const CELL_SIZE = 11;
        const CELL_PADDING = 3;
        const TOTAL_CELL_SIZE = CELL_SIZE + CELL_PADDING;

        // Calculate grid dimensions
        const ROWS = 7;
        const COLS = Math.ceil(days / ROWS);
        const gridWidth = COLS * TOTAL_CELL_SIZE;
        const gridHeight = ROWS * TOTAL_CELL_SIZE;

        // Calculate starting position to center the grid
        const startX =
          CANVAS_PADDING + (canvasWidth - 2 * CANVAS_PADDING - gridWidth) / 2;
        const startY = CANVAS_PADDING;

        // Store cell positions for hover detection
        const cellPositions: {
          x: number;
          y: number;
          width: number;
          height: number;
          data: DayData;
        }[] = [];

        // Draw cells
        data.forEach((day, index) => {
          const col = Math.floor(index / ROWS);
          const row = index % ROWS;

          const x = startX + col * TOTAL_CELL_SIZE;
          const y = startY + row * TOTAL_CELL_SIZE;

          // Store cell position
          cellPositions.push({
            x,
            y,
            width: CELL_SIZE,
            height: CELL_SIZE,
            data: day,
          });

          // Determine which color to use
          let color = reviewColors[0]; // Default empty color
          
          // Normalized date for comparison
          const normalizedDayDate = new Date(
            day.date.getFullYear(),
            day.date.getMonth(),
            day.date.getDate()
          );
          
          // Compare dates (use toDateString() to compare just the date portion)
          const isToday = normalizedDayDate.toDateString() === today.toDateString();
          const isPast = normalizedDayDate < today;
          const isFuture = normalizedDayDate > today;
          
          // Today and has both reviews and due items - show transition color
          if (isToday && day.reviewCount > 0 && day.dueCount > 0) {
            // Calculate the percentage of completed reviews vs total (reviews + due)
            const totalItems = day.reviewCount + day.dueCount;
            const completionRatio = day.reviewCount / totalItems;
            
            // Choose color based on completion ratio - more blue as more are completed
            if (completionRatio >= 0.75) {
              // Mostly complete, use lighter blue
              const intensity = getReviewColorIntensity(day.reviewCount);
              color = reviewColors[intensity];
            } else if (completionRatio >= 0.5) {
              // Half complete, use a purple-ish blend
              color = "rgb(173, 173, 229)"; // Blend of red and blue
            } else if (completionRatio >= 0.25) {
              // Started but mostly incomplete, use lighter red
              const intensity = getDueColorIntensity(day.dueCount);
              color = dueColors[intensity];
            } else {
              // Just started, use red
              const intensity = getDueColorIntensity(day.dueCount);
              color = dueColors[intensity];
            }
          }
          // If today or past and has reviews, use review colors (blue)
          else if ((isToday || isPast) && day.reviewCount > 0) {
            const intensity = getReviewColorIntensity(day.reviewCount);
            color = reviewColors[intensity];
          } 
          // If today or future and has due items, use due colors (red)
          // But if today and all reviews are done (reviewCount > 0, dueCount = 0), it will be blue from above condition
          else if ((isToday || isFuture) && day.dueCount > 0) {
            const intensity = getDueColorIntensity(day.dueCount);
            color = dueColors[intensity];
          }

          // Draw cell with rounded corners
          ctx.fillStyle = color;
          const radius = 2;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + CELL_SIZE - radius, y);
          ctx.quadraticCurveTo(x + CELL_SIZE, y, x + CELL_SIZE, y + radius);
          ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - radius);
          ctx.quadraticCurveTo(
            x + CELL_SIZE,
            y + CELL_SIZE,
            x + CELL_SIZE - radius,
            y + CELL_SIZE
          );
          ctx.lineTo(x + radius, y + CELL_SIZE);
          ctx.quadraticCurveTo(x, y + CELL_SIZE, x, y + CELL_SIZE - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.fill();

          // Highlight today
          if (normalizedDayDate.getTime() === normalizedToday.getTime()) {
            ctx.strokeStyle = "#374151";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });

        // Draw legend at the bottom with proper spacing
        const legendY = startY + gridHeight + 24;
        ctx.font = "12px system-ui";

        // Use class-based colors that respect dark mode
        const isDarkMode = document.documentElement.classList.contains("dark");
        ctx.fillStyle = isDarkMode ? "#e2e8f0" : "#6b7280";

        // Past reviews legend
        ctx.fillText("Reviews:", startX, legendY);
        reviewColors.slice(1).forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(startX + 70 + i * 30, legendY - 10, 24, 10);
        });

        // Future due legend
        ctx.fillStyle = isDarkMode ? "#e2e8f0" : "#6b7280";
        ctx.fillText("Due:", startX + canvasWidth / 2 - CANVAS_PADDING, legendY);
        dueColors.slice(1).forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(
            startX + canvasWidth / 2 - CANVAS_PADDING + 40 + i * 30,
            legendY - 10,
            24,
            10
          );
        });

        // Add hover effect handler
        const handleMouseMove = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          // Find hovered cell
          const hoveredCell = cellPositions.find(
            (cell) =>
              x >= cell.x &&
              x <= cell.x + cell.width &&
              y >= cell.y &&
              y <= cell.y + cell.height
          );

          if (hoveredCell) {
            setHoveredDay(hoveredCell.data);
            setMousePos({
              x: hoveredCell.x + hoveredCell.width / 2,
              y: hoveredCell.y + hoveredCell.height + 5,
            });
          } else {
            setHoveredDay(null);
          }
        };

        // Add double-click handler to force refresh data
        const handleDoubleClick = () => {
          // Force reload by setting the year state, which triggers a re-render
          setCurrentYear(prev => prev);
        };

        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("dblclick", handleDoubleClick);
        
        return () => {
          canvas.removeEventListener("mousemove", handleMouseMove);
          canvas.removeEventListener("dblclick", handleDoubleClick);
        };
      } catch (error) {
        console.error("Error fetching review data:", error);
      }
    };

    fetchData();
  }, [currentYear]);

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousYear}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">{currentYear} Review Activity</div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextYear}
            className="h-8 w-8 p-0"
            disabled={currentYear >= new Date().getFullYear() + 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative w-full">
          <canvas
            ref={canvasRef}
            className="w-full cursor-pointer"
            style={{ display: "block" }}
          />
          {hoveredDay && (
            <div
              className="absolute z-10 bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-md text-sm"
              style={{
                left: `${mousePos.x}px`,
                top: `${mousePos.y}px`,
                transform: "translate(-50%, 0)",
              }}
            >
              <div className="font-medium">
                {hoveredDay.date.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              {hoveredDay.reviewCount > 0 && (
                <div>
                  {hoveredDay.reviewCount} ayah{hoveredDay.reviewCount === 1 ? "" : "s"} reviewed
                </div>
              )}
              {hoveredDay.dueCount > 0 && (
                <div className="text-red-500 dark:text-red-400">
                  {hoveredDay.dueCount} ayah{hoveredDay.dueCount === 1 ? "" : "s"} due
                </div>
              )}
              {hoveredDay.reviewCount === 0 && hoveredDay.dueCount === 0 && (
                <div>No activity</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
