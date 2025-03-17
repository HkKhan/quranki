"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LeaderboardEntry {
  name: string;
  totalAyahs: number;
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
  const [perPage, setPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLeaderboard = async (page: number, itemsPerPage: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/leaderboard?page=${page}&perPage=${itemsPerPage}`
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
    fetchLeaderboard(currentPage, perPage);
  }, [currentPage, perPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            QuranKi Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">
                      Total Ayahs Reviewed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center font-medium">
                        {(currentPage - 1) * perPage + index + 1}
                      </TableCell>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell className="text-right">
                        {entry.totalAyahs}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select
                    value={perPage.toString()}
                    onValueChange={handlePerPageChange}
                  >
                    <SelectTrigger className="w-[180px]">
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
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
