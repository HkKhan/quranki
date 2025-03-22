"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
  Award,
  Crown,
  Medal,
  Construction,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge-custom";
import { useTheme } from "next-themes";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  name: string;
  totalAyahs: number;
  currentStreak: number;
  positionChange: number;
  isCurrentUser?: boolean;
}

interface LeaderboardResponse {
  data: LeaderboardEntry[];
  metadata: {
    totalPages: number;
    currentPage: number;
    perPage: number;
    totalCount: number;
  };
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("global");
  const [sortBy, setSortBy] = useState<"currentStreak" | "totalAyahs">(
    "currentStreak"
  );

  const fetchLeaderboard = async (
    page: number,
    itemsPerPage: number,
    sortOption: string
  ) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/leaderboard?page=${page}&perPage=${itemsPerPage}&sortBy=${sortOption}`
      );
      const data: LeaderboardResponse = await response.json();
      setLeaderboard(data.data);
      setTotalPages(data.metadata.totalPages);
      setCurrentPage(data.metadata.currentPage);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(currentPage, perPage, sortBy);
  }, [currentPage, perPage, sortBy]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as "currentStreak" | "totalAyahs");
    setCurrentPage(1); // Reset to first page when changing sort option
  };

  // Function to choose the trophy color based on rank
  const getTrophyColor = (rank: number): string => {
    if (rank === 1) return "text-yellow-500"; // Gold
    if (rank === 2) return "text-slate-400"; // Silver
    if (rank === 3) return "text-amber-600"; // Bronze
    return "text-yellow-400"; // Default gold for others
  };

  // Icon for rank display
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  // Get position change icon and styling
  const getPositionChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-500">
          <ArrowUp className="h-3.5 w-3.5 mr-0.5" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-500">
          <ArrowDown className="h-3.5 w-3.5 mr-0.5" />
          <span className="text-xs font-medium">{Math.abs(change)}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-400">
          <Minus className="h-3.5 w-3.5" />
        </div>
      );
    }
  };

  // Image path based on theme - flipped from previous implementation
  const getLeaderboardImagePath = () => {
    return theme === "dark"
      ? "/quranki-leaderboard-dark.png"
      : "/quranki-leaderboard-light.png";
  };

  // Get theme-based colors - updated with new color scheme
  const getThemeColors = () => {
    return theme === "dark"
      ? { primary: "#48498e", secondary: "#dabd74" }
      : { primary: "#fdd3b6", secondary: "#767778" };
  };

  const colors = getThemeColors();
  const isDarkMode = theme === "dark";

  // Render content based on active tab
  const renderTabContent = () => {
    if (activeTab === "friends") {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 mb-6">
            <Clock className="h-12 w-12 text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-center">
            Friends Leaderboard Coming Soon!
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-4">
            We're working on bringing you the ability to compete with your
            friends. Stay tuned for updates!
          </p>
          <Button
            variant="outline"
            onClick={() => setActiveTab("global")}
            className="mt-2"
          >
            Return to Global Leaderboard
          </Button>
        </div>
      );
    }

    // Default to global tab content
    return (
      <>
        <div className="space-y-3 mt-2">
          {leaderboard.map((entry, index) => {
            const rank = (currentPage - 1) * perPage + index + 1;
            const isTopThree = rank <= 3;
            const isCurrentUser = entry.isCurrentUser;

            return (
              <div
                key={index}
                className={`
                  relative flex items-center rounded-lg px-4 py-3.5
                  ${
                    isTopThree
                      ? "bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 border-2"
                      : "bg-white dark:bg-slate-800 border"
                  }
                  ${isCurrentUser ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}
                  border-slate-200 dark:border-slate-700
                  shadow-sm transition-all hover:shadow hover:bg-opacity-90
                `}
                style={{
                  borderColor: isTopThree ? colors.primary : "",
                  borderLeftWidth: isTopThree ? "4px" : "1px",
                }}
              >
                {/* Rank number - styled differently for top 3 */}
                {isTopThree ? (
                  <div
                    className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-lg mr-3 shadow-md
                    ${
                      rank === 1
                        ? "bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-950"
                        : rank === 2
                        ? "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950"
                        : "bg-gradient-to-br from-amber-400 to-amber-700 text-amber-950"
                    }
                  `}
                  >
                    <span className="text-lg font-bold">{rank}</span>
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center mr-3">
                    <span
                      className="text-lg font-semibold"
                      style={{ color: colors.primary }}
                    >
                      {rank}.
                    </span>
                  </div>
                )}

                {/* Name with rank icon for top 3 and position change */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center">
                    <div className={`text-lg font-semibold truncate ${isCurrentUser ? "text-blue-600 dark:text-blue-400" : ""}`}>
                      {entry.name}
                      {isCurrentUser && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">You</span>}
                    </div>
                    {getRankIcon(rank)}
                    <div className="ml-2">
                      {getPositionChangeIndicator(entry.positionChange)}
                    </div>
                  </div>

                  {/* Mobile view streak indicator */}
                  <div className="md:hidden mt-1 flex items-center">
                    <div
                      className="mr-2 flex items-center gap-1 px-3 py-1 rounded-full overflow-hidden"
                      style={{
                        backgroundColor: colors.primary,
                        fontWeight: "bold",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      <span style={{ color: colors.secondary }}>
                        {entry.currentStreak}
                      </span>
                      <Flame
                        className="h-3.5 w-3.5"
                        style={{ color: colors.secondary }}
                      />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Ayahs: {entry.totalAyahs}
                    </span>
                  </div>
                </div>

                {/* Stats Section - Desktop */}
                <div className="hidden md:flex items-center space-x-4 ml-auto">
                  {/* Streak Badge */}
                  <div className="flex flex-col items-end">
                    <div
                      className={`text-xs mb-1 font-bold uppercase ${
                        isDarkMode ? "text-white" : "text-black"
                      }`}
                    >
                      Streak
                    </div>
                    <div
                      className="flex items-center gap-1 px-4 py-1.5 rounded-full"
                      style={{
                        backgroundColor: colors.primary,
                        fontWeight: "bold",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      <span style={{ color: colors.secondary }}>
                        {entry.currentStreak}
                      </span>
                      <Flame
                        className="h-3.5 w-3.5"
                        style={{ color: colors.secondary }}
                      />
                    </div>
                  </div>

                  {/* Total Ayahs with Trophy */}
                  <div className="flex flex-col items-end min-w-[100px]">
                    <div
                      className={`text-xs mb-1 font-bold uppercase ${
                        isDarkMode ? "text-white" : "text-black"
                      }`}
                    >
                      Total Ayahs
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`font-bold text-lg ${
                          isDarkMode ? "text-white" : "text-black"
                        }`}
                      >
                        {entry.totalAyahs}
                      </span>
                      <Trophy
                        className={`h-5 w-5 ml-1.5 ${getTrophyColor(rank)}`}
                        fill={isTopThree ? "currentColor" : "none"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination and Sort Controls */}
        <div className="mt-8 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between px-2">
          {/* Sort Options - Mobile (visible only on mobile) */}
          <div className="md:hidden w-full">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full border-slate-300 dark:border-slate-600">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currentStreak">
                  <div className="flex items-center">
                    <Flame className="mr-2 h-4 w-4 text-amber-500" />
                    Sort by Streak
                  </div>
                </SelectItem>
                <SelectItem value="totalAyahs">
                  <div className="flex items-center">
                    <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                    Sort by Total Ayahs
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Per Page Selector and Page Counter */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
            <Select
              value={perPage.toString()}
              onValueChange={handlePerPageChange}
            >
              <SelectTrigger className="w-full md:w-[180px] border-slate-300 dark:border-slate-600">
                <SelectValue placeholder="Select rows per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          <div className="flex justify-between md:justify-start items-center">
            {/* Pagination Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-slate-300 dark:border-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-slate-300 dark:border-slate-600"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="container py-6 max-w-4xl mx-auto">
      <Card className="shadow-lg border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden">
        <CardHeader
          className="pt-3 pb-4 border-b border-slate-200 dark:border-slate-700"
          style={{
            background: `linear-gradient(to right, ${colors.primary}20, ${colors.secondary}20)`,
          }}
        >
          <div className="flex justify-between items-center mb-4">
            {/* Empty div to balance the layout (hidden on mobile) */}
            <div className="hidden md:block w-[180px]"></div>

            {/* Centered Leaderboard PNG */}
            <div className="relative h-10 w-56 flex-shrink-0 mx-auto md:mx-0">
              <Image
                src={getLeaderboardImagePath()}
                alt="QuranKi Leaderboard"
                width={256 * 0.9}
                height={48 * 0.9}
                priority
                className="object-contain rounded-lg"
                style={{
                  filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))",
                  transform: "translateY(-5px) scale(0.9)",
                }}
              />
            </div>

            {/* Sort selector (hidden on mobile) */}
            <div className="hidden md:block w-[180px]">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px] border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currentStreak">
                    <div className="flex items-center">
                      <Flame className="mr-2 h-4 w-4 text-amber-500" />
                      Sort by Streak
                    </div>
                  </SelectItem>
                  <SelectItem value="totalAyahs">
                    <div className="flex items-center">
                      <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                      Sort by Total Ayahs
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="custom-tabs-container">
            <div className="custom-tabs">
              <button
                className={`custom-tab ${
                  activeTab === "global" ? "active" : ""
                }`}
                onClick={() => setActiveTab("global")}
              >
                <span className="mr-2 text-lg">🌎</span>
                Global
              </button>
              <button
                className={`custom-tab ${
                  activeTab === "friends" ? "active" : ""
                }`}
                onClick={() => setActiveTab("friends")}
              >
                <span className="mr-2 text-lg">🤝</span>
                Friends
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-3 pt-4 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            renderTabContent()
          )}
        </CardContent>
      </Card>

      {/* Custom CSS for tabs */}
      <style jsx>{`
        .custom-tabs-container {
          width: 100%;
          overflow: hidden;
          border-radius: 10px;
          margin-bottom: 5px;
        }

        .custom-tabs {
          display: flex;
          width: 100%;
          background-color: #f0f2f5;
          border-radius: 10px;
          overflow: hidden;
        }

        .custom-tab {
          flex: 1;
          text-align: center;
          padding: 12px 0;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #606770;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .custom-tab.active {
          background-color: white;
          color: #1877f2;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
          .custom-tabs {
            background-color: #2d2d2d;
          }

          .custom-tab {
            color: #b0b3b8;
          }

          .custom-tab.active {
            background-color: #3a3b3c;
            color: #e4e6eb;
          }
        }
      `}</style>
    </div>
  );
}
