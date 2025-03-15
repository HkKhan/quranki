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
  count: number;
  isDue: boolean;
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
  });
  const [isLoading, setIsLoading] = useState(true);

  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      setIsLoading(true);

      try {
        // Calculate start and end dates for the current year
        const startDate = new Date(currentYear, 0, 1); // January 1st of current year
        const endDate = new Date(currentYear + 1, 0, 0); // December 31st of current year
        const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;

        const data: DayData[] = [];
        const dueData: { [key: string]: number } = {};
        const today = new Date();

        // Initialize data array with zeros
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          data.push({ date, count: 0, isDue: false });
        }

        // Fetch daily logs
        const dailyLogsResponse = await fetch("/api/daily-logs");
        const dailyLogsData = await dailyLogsResponse.json();
        
        let totalReviews = 0;
        let daysWithReviews = 0;
        let yearReviews = 0;

        if (dailyLogsData.logs) {
          dailyLogsData.logs.forEach((log: any) => {
            const reviewDate = new Date(log.date);
            
            // Only count if in current year view
            if (reviewDate.getFullYear() === currentYear) {
              const dayOfYear = Math.floor(
                (reviewDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              if (dayOfYear >= 0 && dayOfYear < days) {
                if (data[dayOfYear].count === 0) {
                  daysWithReviews++;
                }
                data[dayOfYear].count += log.count;
                yearReviews += log.count;
              }
            }
            totalReviews += log.count;
          });
        }

        // Fetch spaced repetition data for due dates
        const srResponse = await fetch("/api/spaced-repetition");
        const srData = await srResponse.json();

        if (srData.data) {
          srData.data.forEach((item: ReviewData) => {
            if (item.dueDate) {
              const dueDate = new Date(item.dueDate);
              if (dueDate.getFullYear() === currentYear) {
                const dueDateStr = dueDate.toDateString();
                dueData[dueDateStr] = (dueData[dueDateStr] || 0) + 1;
              }
            }
          });
        }

        // Calculate and set stats
        const dailyAverage = daysWithReviews > 0 ? yearReviews / daysWithReviews : 0;
        setStats({
          dailyAverage,
          totalReviews: yearReviews,
          daysWithReviews,
        });

        // Add due counts to data
        data.forEach((day) => {
          const dueCount = dueData[day.date.toDateString()] || 0;
          if (dueCount > 0 && day.date >= today) {
            day.isDue = true;
            day.count = dueCount;
          }
        });

        // Draw the heatmap
        drawHeatmap(ctx, canvas, data, today);
      } catch (error) {
        console.error("Error fetching review data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentYear]);

  const drawHeatmap = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: DayData[],
    today: Date
  ) => {
    // Set canvas dimensions using standard HTML dimensions without pixel ratio adjustments
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = 180;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = "100%";
    canvas.style.height = `${canvasHeight}px`;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate color intensities
    const maxCount = Math.max(...data.map((d) => d.count), 1); // Ensure non-zero max
    const getColorIntensity = (count: number) => {
      if (count === 0) return 0;
      return Math.min(Math.ceil((count / maxCount) * 4), 4);
    };

    // Color schemes matching Anki
    const pastColors = [
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
    const COLS = Math.ceil(data.length / ROWS);
    const gridWidth = COLS * TOTAL_CELL_SIZE;
    const gridHeight = ROWS * TOTAL_CELL_SIZE;

    // Calculate starting position to center the grid
    const startX = CANVAS_PADDING + (canvasWidth - 2 * CANVAS_PADDING - gridWidth) / 2;
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

      const intensity = getColorIntensity(day.count);
      const colorArray = day.isDue ? dueColors : pastColors;
      const color = colorArray[intensity];

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
      if (day.date.toDateString() === today.toDateString()) {
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw legend
    const legendY = startY + gridHeight + 24;
    ctx.font = "12px system-ui";
    const isDarkMode = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDarkMode ? "#e2e8f0" : "#6b7280";

    // Add mouse event handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x: e.clientX, y: e.clientY });

      // Check if mouse is over any cell
      const hoveredCell = cellPositions.find(
        (cell) =>
          x >= cell.x &&
          x <= cell.x + cell.width &&
          y >= cell.y &&
          y <= cell.y + cell.height
      );

      setHoveredDay(hoveredCell ? hoveredCell.data : null);
    };

    const handleMouseLeave = () => {
      setHoveredDay(null);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousYear}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{currentYear}</div>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextYear}
            disabled={isLoading || currentYear >= new Date().getFullYear()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "180px" }}
          />
          {hoveredDay && (
            <div
              className="absolute z-10 bg-popover text-popover-foreground px-2 py-1 rounded text-sm"
              style={{
                left: mousePos.x + 10,
                top: mousePos.y - 40,
                transform: "translateX(-50%)",
              }}
            >
              {hoveredDay.date.toLocaleDateString()} -{" "}
              {hoveredDay.isDue
                ? `${hoveredDay.count} due`
                : `${hoveredDay.count} reviews`}
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <div>Daily Average: {stats.dailyAverage.toFixed(1)}</div>
          <div>Total Reviews: {stats.totalReviews}</div>
          <div>Days with Reviews: {stats.daysWithReviews}</div>
        </div>
      </CardContent>
    </Card>
  );
}
