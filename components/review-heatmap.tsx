"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Add a useMediaQuery hook to detect mobile screens
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

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
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [stats, setStats] = useState({
    dailyAverage: 0,
    totalReviews: 0,
    daysWithReviews: 0,
    totalDue: 0,
  });
  
  // Detect mobile screens
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Navigation functions for year and month
  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(currentYear + 1);
  };
  
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Get current month name
  const getCurrentMonthName = () => {
    return new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
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
    const canvasHeight = isMobile ? 220 : 180; // Increase height on mobile for stacked legend

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = "100%";
    canvas.style.height = `${canvasHeight}px`;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate start and end dates based on view type (year or month)
    let startDate, endDate, days;
    
    if (isMobile) {
      // For mobile: Show only current month
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth + 1, 0); // Last day of current month
    } else {
      // For desktop: Show entire year
      startDate = new Date(currentYear, 0, 1); // January 1st of current year
      endDate = new Date(currentYear + 1, 0, 0); // December 31st of current year
    }
    
    days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;

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
        let periodReviews = 0; // Reviews for current period (year or month)
        let totalDue = 0;

        // Process past review data from daily logs
        if (reviewStatsData.success && reviewStatsData.reviewStats && reviewStatsData.reviewStats.dailyReviews) {
          const dailyReviews = reviewStatsData.reviewStats.dailyReviews;
          
          // Map daily reviews to data array
          Object.entries(dailyReviews).forEach(([dateStr, count]) => {
            // Create date from the dateStr returned by the API
            const reviewDate = new Date(dateStr);
            
            // Check if date is within current view period
            const inCurrentPeriod = isMobile 
              ? reviewDate.getFullYear() === currentYear && reviewDate.getMonth() === currentMonth
              : reviewDate.getFullYear() === currentYear;
              
            if (inCurrentPeriod) {
              // Calculate day index relative to start date
              const dayIndex = Math.floor(
                (reviewDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              if (dayIndex >= 0 && dayIndex < days) {
                const reviewCount = count as number;
                if (reviewCount > 0) {
                  daysWithReviews++;
                  data[dayIndex].reviewCount = reviewCount;
                  periodReviews += reviewCount;
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
            
            // Check if date is within current view period and is today or in the future
            const inCurrentPeriod = isMobile
              ? dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth
              : dueDate.getFullYear() === currentYear;
              
            if (dueDate >= normalizedToday && inCurrentPeriod) {
              const dayIndex = Math.floor(
                (dueDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              if (dayIndex >= 0 && dayIndex < days) {
                data[dayIndex].dueCount += 1;
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
              
              // Check if date is within current view period and is today or in the future
              const inCurrentPeriod = isMobile
                ? dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth
                : dueDate.getFullYear() === currentYear;
                
              if (dueDate >= normalizedToday && inCurrentPeriod) {
                const dayIndex = Math.floor(
                  (dueDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                if (dayIndex >= 0 && dayIndex < days) {
                  data[dayIndex].dueCount += 1;
                  totalDue += 1;
                }
              }
            }
          });
        }

        // Calculate and set stats
        const dailyAverage =
          daysWithReviews > 0 ? periodReviews / daysWithReviews : 0;
        setStats({
          dailyAverage,
          totalReviews: periodReviews,
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

        // Calculate grid dimensions based on view type
        const ROWS = 7; // Days of the week
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

        // Draw day headings for mobile view (only in monthly view)
        if (isMobile) {
          const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
          ctx.font = '10px system-ui';
          ctx.fillStyle = '#888888';
          
          for (let i = 0; i < ROWS; i++) {
            ctx.fillText(
              dayLabels[i],
              startX - 12, // Position to the left of the grid
              startY + i * TOTAL_CELL_SIZE + CELL_SIZE / 2 + 3 // Align with grid rows
            );
          }
        }

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
          if (normalizedDayDate.toDateString() === today.toDateString()) {
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

        if (isMobile) {
          // Mobile view: Stacked vertical legend
          // Reviews legend
          ctx.fillText("Reviews:", startX, legendY);
          reviewColors.slice(1).forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.fillRect(startX + 70 + i * 22, legendY - 10, 16, 10); // Smaller boxes, closer together
          });

          // Due items legend - positioned below reviews legend
          ctx.fillStyle = isDarkMode ? "#e2e8f0" : "#6b7280";
          ctx.fillText("Due:", startX, legendY + 20); // Position below reviews legend
          dueColors.slice(1).forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.fillRect(startX + 70 + i * 22, legendY + 10, 16, 10); // Smaller boxes, closer together
          });
        } else {
          // Desktop view: Side-by-side legend
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
        }

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
  }, [currentYear, currentMonth, isMobile]);

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {/* Control buttons - conditionally show year or month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={isMobile ? goToPreviousMonth : goToPreviousYear}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="font-medium">
            {isMobile 
              ? `${getCurrentMonthName()} ${currentYear}`
              : `${currentYear} Review Activity`
            }
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={isMobile ? goToNextMonth : goToNextYear}
            className="h-8 w-8 p-0"
            disabled={isMobile 
              ? (currentYear > new Date().getFullYear() || 
                (currentYear === new Date().getFullYear() && currentMonth >= new Date().getMonth()))
              : currentYear >= new Date().getFullYear() + 1
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* View switcher - only show for debugging 
        <div className="text-center text-xs text-muted-foreground mb-2">
          {isMobile ? "Monthly View" : "Yearly View"}
        </div>
        */}
        
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
        
        {/* Display period summary */}
        <div className="mt-4 text-xs text-center text-muted-foreground">
          <span className="font-medium">{stats.totalReviews}</span> ayahs reviewed in {isMobile ? 'this month' : 'this year'} 
          {stats.totalDue > 0 && <span> • <span className="font-medium">{stats.totalDue}</span> due</span>}
        </div>
      </CardContent>
    </Card>
  );
}
