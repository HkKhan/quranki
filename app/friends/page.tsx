"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus,
  Search,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  UserX,
  Mail,
  Share2,
  AlertCircle,
  Copy,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Type definitions
interface FriendType {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  lastActive: string | null;
  friendshipId: string;
}

interface FriendRequestType {
  id: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface SentRequestType {
  id: string;
  receiver: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [friends, setFriends] = useState<FriendType[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequestType[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequestType[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTab, setActiveTab] = useState("friends");
  const [requestSent, setRequestSent] = useState<{to: string; timestamp: number} | null>(null);

  // Fetch friends data
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchFriendsData();
      
      // Update user's lastActive status
      fetch("/api/update-status", {
        method: "POST"
      }).catch(err => {
        console.error("Error updating status:", err);
      });
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, session?.user?.id, router]);

  // Auto-hide request sent notification after 5 seconds
  useEffect(() => {
    if (requestSent) {
      const timer = setTimeout(() => {
        setRequestSent(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [requestSent]);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends");
      const data = await response.json();
      
      if (response.ok) {
        setFriends(data.friends || []);
        setPendingRequests(data.pendingRequests || []);
        setSentRequests(data.sentRequests || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load friends data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching friends data:", error);
      toast({
        title: "Error",
        description: "Failed to load friends data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add friend by email
  const addFriend = async () => {
    if (!searchEmail) return;
    
    try {
      setSearchLoading(true);
      setSearchError(null);
      
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: searchEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Create a more visible toast notification
        toast({
          title: "Friend Request Sent",
          description: `Friend request sent to ${searchEmail}`,
          variant: "default",
        });
        
        // Show confirmation in UI using the temporary notification
        setRequestSent({
          to: searchEmail,
          timestamp: Date.now()
        });
        
        // Show confirmation in UI also
        setSearchError(null);
        fetchFriendsData(); // Refresh data
        setSearchEmail("");
      } else {
        if (data.notFound) {
          setSearchError("User not found. Would you like to invite them?");
        } else {
          setSearchError(data.error || "Failed to send friend request");
        }
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      setSearchError("Something went wrong. Please try again later.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Remove friend
  const removeFriend = async (friendshipId: string) => {
    try {
      const response = await fetch("/api/friends", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friendshipId }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Friend removed successfully",
        });
        fetchFriendsData(); // Refresh data
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to remove friend",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive",
      });
    }
  };

  // Handle friend request response (accept/decline)
  const respondToFriendRequest = async (requestId: string, action: "accept" | "decline") => {
    try {
      // Find the request being responded to
      const request = pendingRequests.find((req) => req.id === requestId);
      
      // Optimistically update the UI
      if (request) {
        // Remove the request from pending requests
        setPendingRequests((current) => 
          current.filter((req) => req.id !== requestId)
        );
        
        // If accepting, add to friends list optimistically
        if (action === "accept" && request.sender) {
          const optimisticFriend: FriendType = {
            id: request.sender.id,
            name: request.sender.name,
            email: request.sender.email,
            image: request.sender.image,
            lastActive: null,
            friendshipId: `temp-${requestId}`, // Temporary ID until we get the real one
          };
          
          setFriends((current) => [...current, optimisticFriend]);
        }
      }
      
      // Make the API request
      const response = await fetch("/api/friend-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId, action }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Friend request ${action === "accept" ? "accepted" : "declined"}`,
        });
        
        // Refresh the page to update the UI completely, including the badge
        router.refresh();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || `Failed to ${action} friend request`,
          variant: "destructive",
        });
        
        // Revert the optimistic update on error
        fetchFriendsData();
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} friend request`,
        variant: "destructive",
      });
      
      // Revert the optimistic update on error
      fetchFriendsData();
    }
  };

  // Cancel sent friend request
  const cancelFriendRequest = async (requestId: string) => {
    try {
      const response = await fetch("/api/friend-requests", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Friend request cancelled",
        });
        fetchFriendsData(); // Refresh data
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to cancel friend request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel friend request",
        variant: "destructive",
      });
    }
  };

  // Send invitation email/generate link
  const sendInvitation = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const inviteLink = `${baseUrl}/register?invitedBy=${encodeURIComponent(session?.user?.email || "")}`;
    
    // Copy the link to clipboard
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "Invitation link copied to clipboard",
        });
      })
      .catch(err => {
        console.error("Failed to copy link:", err);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive",
        });
      });
  };

  // Get user status indicator
  const getUserStatus = (lastActive: string | null) => {
    if (!lastActive) return "offline";
    
    const lastActiveTime = new Date(lastActive).getTime();
    const now = new Date().getTime();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    
    if (lastActiveTime > fiveMinutesAgo) {
      return "online";
    } else if (lastActiveTime > threeDaysAgo) {
      return "recently-active";
    } else {
      return "inactive";
    }
  };

  // Render status badge
  const renderStatusBadge = (lastActive: string | null) => {
    const status = getUserStatus(lastActive);
    
    switch (status) {
      case "online":
        return <Badge variant="success" className="ml-2">Online</Badge>;
      case "recently-active":
        return <Badge variant="warning" className="ml-2">Recently active</Badge>;
      case "inactive":
      default:
        return <Badge variant="secondary" className="ml-2">Inactive</Badge>;
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(part => part[0]).join("").toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  if (status === "loading" || loading) {
    return (
      <div className="container flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Friends</h1>
      
      {/* Friend request sent notification */}
      {requestSent && (
        <div className="mb-6 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-md p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
            <p className="text-green-800 dark:text-green-200">
              Friend request sent to <span className="font-bold">{requestSent.to}</span>
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setRequestSent(null)}
            className="h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      )}
      
      <Tabs defaultValue="friends" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends {friends.length > 0 && `(${friends.length})`}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Friends
          </TabsTrigger>
        </TabsList>
        
        {/* Friends List Tab */}
        <TabsContent value="friends">
          <Card>
            <CardHeader>
              <CardTitle>Your Friends</CardTitle>
              <CardDescription>
                {friends.length > 0
                  ? "Here's a list of all your friends."
                  : "You haven't added any friends yet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No friends yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Search for friends by email or invite them to join.
                  </p>
                  <Button onClick={() => setActiveTab("add")}>
                    Find Friends
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-3"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={friend.image || undefined} />
                          <AvatarFallback>
                            {getInitials(friend.name, friend.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium truncate">
                              {friend.name || friend.email}
                            </h3>
                            {renderStatusBadge(friend.lastActive)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {friend.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFriend(friend.friendshipId)}
                        className="self-start sm:self-center flex-shrink-0"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests</CardTitle>
              <CardDescription>
                Manage your incoming and outgoing friend requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 && sentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    You don't have any pending friend requests.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Received Requests</h3>
                      <div className="space-y-4">
                        {pendingRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-3"
                          >
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                <AvatarImage src={request.sender.image || undefined} />
                                <AvatarFallback>
                                  {getInitials(request.sender.name, request.sender.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium truncate">
                                  {request.sender.name || request.sender.email}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {request.sender.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 self-start sm:self-center">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => respondToFriendRequest(request.id, "accept")}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => respondToFriendRequest(request.id, "decline")}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {sentRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Sent Requests</h3>
                      <div className="space-y-4">
                        {sentRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-3"
                          >
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                <AvatarImage src={request.receiver.image || undefined} />
                                <AvatarFallback>
                                  {getInitials(request.receiver.name, request.receiver.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium truncate">
                                  {request.receiver.name || request.receiver.email}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {request.receiver.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelFriendRequest(request.id)}
                              className="self-start sm:self-center flex-shrink-0"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Add Friends Tab */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Find Friends</CardTitle>
              <CardDescription>
                Search for friends by email address or invite them to join.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Search by Email */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Search by Email</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter email address"
                        value={searchEmail}
                        onChange={(e) => {
                          setSearchEmail(e.target.value);
                          setSearchError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addFriend();
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={addFriend}
                      disabled={!searchEmail || searchLoading}
                      className="flex-shrink-0"
                    >
                      {searchLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Add Friend
                    </Button>
                  </div>
                  
                  {/* Error message and invite option */}
                  {searchError && (
                    <div className="mt-4 space-y-3">
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{searchError}</AlertDescription>
                      </Alert>
                      
                      {searchError.includes("invite") && (
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setInviteEmail(searchEmail);
                            setInviteDialogOpen(true);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Invite {searchEmail}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Invite Friends */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Invite Friends</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate an invitation link and share it with your friends.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Generate Invitation Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Invitation Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite Friends to Quranki</DialogTitle>
            <DialogDescription>
              Share this link with your friends to invite them to join Quranki
              and connect with you.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="bg-muted p-3 rounded-md">
              <div className="flex flex-col gap-2">
                <div className="text-sm break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/register?invitedBy=${encodeURIComponent(
                        session?.user?.email || ""
                      )}`
                    : "Loading..."}
                </div>
                <Button
                  size="sm"
                  onClick={sendInvitation}
                  className="w-full sm:w-auto self-end"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Invitation Link
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 