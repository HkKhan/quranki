// @ts-nocheck
"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Bug, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function BugReportPage() {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const { addToast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="container py-8 flex justify-center items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Don't render the form if not authenticated
  if (!session) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("description", description);

      const response = await fetch("/api/bug-report", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit bug report");
      }

      const data = await response.json();
      setTicketNumber(data.ticketNumber);

      addToast({
        title: "Bug Report Submitted",
        description: `Thank you for your feedback. Your ticket number is: ${data.ticketNumber}`,
      });

      // Reset form
      setDescription("");
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to submit bug report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-primary" />
            <CardTitle>Report a Bug</CardTitle>
          </div>
          <CardDescription>
            Help us improve QuranKi by reporting any issues you encounter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description of Issue
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                required
                placeholder="Please describe the issue you encountered..."
                className="min-h-[100px]"
                maxLength={250}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/250 characters
              </p>
            </div>

            {ticketNumber && (
              <div className="p-4 border border-primary bg-primary/10 rounded-md">
                <p className="text-sm">
                  Your bug report has been submitted successfully. Your ticket number is: <strong>{ticketNumber}</strong>
                </p>
                <p className="text-sm mt-2">
                  If you would like to add screenshots, please email them to contactquranki@gmail.com with your ticket number.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Bug Report"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 