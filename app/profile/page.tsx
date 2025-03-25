'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, User, Bell, Lock, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NotificationSettings {
  optedIn: boolean;
  emailNotifications: boolean;
  dailyReminders: boolean;
  weeklyReminders: boolean;
  streakReminders: boolean;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(status === 'loading');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Add a local state for the display name to ensure UI updates
  const [displayName, setDisplayName] = useState('');

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    optedIn: false,
    emailNotifications: true,
    dailyReminders: false,
    weeklyReminders: false,
    streakReminders: false,
  });

  // Add state to keep track of the current tab
  const [currentTab, setCurrentTab] = useState('profile');

  // Listen for the custom event for name changes
  useEffect(() => {
    const handleNameChange = (event: any) => {
      const { name } = event.detail;
      
      // Update our local state
      setDisplayName(name);
      setFormData(prev => ({ ...prev, name }));
    };
    
    window.addEventListener('user:nameChanged', handleNameChange);
    
    return () => {
      window.removeEventListener('user:nameChanged', handleNameChange);
    };
  }, []);

  // Format user's name or email for display
  const getUserDisplayName = () => {
    // First check our local state
    if (displayName) return displayName;
    
    // Otherwise fall back to session data
    if (!session?.user) return '';
    return session.user.name || session.user.email || '';
  };

  // Add an effect to update the form data and display name when the session changes
  useEffect(() => {
    if (session?.user) {
      // Update both form data and display name
      const newName = session.user?.name || '';
      
      setFormData(prevData => ({
        ...prevData,
        name: newName,
        email: session.user?.email || '',
      }));
      
      setDisplayName(newName);
    }
  }, [session?.user?.name, session?.user?.email]);

  // Get initials for avatar fallback
  const getInitials = () => {
    // First check our local state
    if (displayName) {
      return displayName.split(' ').map(part => part[0]).join('').toUpperCase();
    }
    
    if (!session?.user) return '';
    if (session.user.name) {
      return session.user.name.split(' ').map(part => part[0]).join('').toUpperCase();
    }
    return session.user.email?.[0]?.toUpperCase() || '';
  };

  // Update loading state when status changes
  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
    } else if (status === 'authenticated') {
      // Don't set loading to false here, as we'll do that after fetching settings
    } else {
      setLoading(false); 
    }
  }, [status]);

  // Load user data
  useEffect(() => {
    let isMounted = true;
    
    // Set initial loading state
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    
    if (status === 'authenticated' && session?.user) {
      // Update form data with user info
      setFormData(prevData => ({
        ...prevData,
        name: session.user?.name || '',
        email: session.user?.email || '',
      }));
      
      // Only fetch if the component is still mounted
      const getSettings = async () => {
        if (isMounted) {
          await fetchNotificationSettings();
        }
      };
      
      getSettings();
    } else if (status === 'unauthenticated') {
      if (isMounted) {
        setLoading(false); // Ensure loading is false before redirecting
      }
      router.push('/login');
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  // Fetch user's notification settings
  const fetchNotificationSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile/notifications');
      
      if (!response.ok) {
        // Set default values on error
        setNotificationSettings({
          optedIn: false,
          emailNotifications: true,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false,
        });
        return;
      }
      
      if (response.status === 204) {
        setNotificationSettings({
          optedIn: false,
          emailNotifications: true,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false,
        });
        return;
      }
      
      const text = await response.text();
      
      if (!text) {
        setNotificationSettings({
          optedIn: false,
          emailNotifications: true,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false,
        });
        return;
      }
      
      try {
        const data = JSON.parse(text);
        setNotificationSettings({
          optedIn: data.optedIn ?? false,
          emailNotifications: data.emailNotifications ?? true,
          dailyReminders: data.dailyReminders ?? false,
          weeklyReminders: data.weeklyReminders ?? false,
          streakReminders: data.streakReminders ?? false,
        });
      } catch (parseError) {
        // Set default values on parsing error
        setNotificationSettings({
          optedIn: false,
          emailNotifications: true,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false,
        });
      }
    } catch (err) {
      // Set default values on any error
      setNotificationSettings({
        optedIn: false,
        emailNotifications: true,
        dailyReminders: false,
        weeklyReminders: false,
        streakReminders: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Update profile information
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate name input
    if (!formData.name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      
      setSuccess('Profile updated successfully');
      
      // Update local display name state immediately
      setDisplayName(formData.name);
      
      // Force a complete session refresh to ensure global updates
      await fetch('/api/auth/session?forceUpdate=1');
      
      // Use the update function to update the session with the new name
      await update({ name: formData.name });
      
      // Force router refresh to update navigation components
      router.refresh();
      
      // Directly update form data to ensure UI consistency
      setFormData(prevData => ({
        ...prevData,
        name: formData.name,
      }));
      
      // Publish a custom event that other components can listen for
      const nameChangeEvent = new CustomEvent('user:nameChanged', { 
        detail: { name: formData.name } 
      });
      window.dispatchEvent(nameChangeEvent);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      
      setSuccess('Password updated successfully');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    }
  };

  // Extract the notification settings save logic to a separate function
  const saveNotificationSettings = async () => {
    try {
      setLoading(true);
      setSuccess('');
      setError('');

      const response = await fetch('/api/profile/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optedIn: notificationSettings.optedIn,
          emailNotifications: notificationSettings.emailNotifications,
          dailyReminders: notificationSettings.dailyReminders,
          weeklyReminders: notificationSettings.weeklyReminders,
          streakReminders: notificationSettings.streakReminders,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update notification settings');
      }

      setSuccess('Notification settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  // Handle notification update form submission
  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveNotificationSettings();
  };

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  if (status === 'loading') {
    return (
      <div className="container flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  
  // Also show loading spinner when doing async operations, but only if authenticated
  if (loading && status === 'authenticated') {
    return (
      <div className="container flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container max-w-4xl py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to sign in to access your profile.{' '}
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10 space-y-8">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          {session?.user?.image ? (
            <AvatarImage src={session.user.image} alt={getUserDisplayName()} />
          ) : (
            <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
          )}
        </Avatar>
        <div>
          <h1 
            className="text-2xl font-bold" 
            data-testid="profile-name"
          >
            {getUserDisplayName()}
          </h1>
          <p className="text-muted-foreground">{session?.user?.email}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-400">Success</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span>Password</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Profile Information */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your name and profile information.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    You cannot change your email address.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Changes</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Password Change */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Update Password</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage how you receive notifications from QuranKi.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateNotifications}>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="notifications">Receive Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders for your Quran review sessions via email.
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notificationSettings.optedIn}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      optedIn: checked
                    }))}
                  />
                </div>
                
                {notificationSettings.optedIn && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <h3 className="font-medium mb-2">Notification Types</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Select which types of notifications you'd like to receive:
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="dailyReminders"
                            checked={notificationSettings.dailyReminders}
                            onCheckedChange={(checked) => 
                              setNotificationSettings(prev => ({
                                ...prev,
                                dailyReminders: checked
                              }))
                            }
                          />
                          <Label htmlFor="dailyReminders" className="font-medium cursor-pointer">
                            Daily Reminders
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">
                          Receive a daily reminder to maintain your streak
                        </p>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="weeklyReminders"
                            checked={notificationSettings.weeklyReminders}
                            onCheckedChange={(checked) => 
                              setNotificationSettings(prev => ({
                                ...prev,
                                weeklyReminders: checked
                              }))
                            }
                          />
                          <Label htmlFor="weeklyReminders" className="font-medium cursor-pointer">
                            Weekly Summary
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">
                          Receive a weekly summary of your progress
                        </p>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="streakReminders"
                            checked={notificationSettings.streakReminders}
                            onCheckedChange={(checked) => 
                              setNotificationSettings(prev => ({
                                ...prev,
                                streakReminders: checked
                              }))
                            }
                          />
                          <Label htmlFor="streakReminders" className="font-medium cursor-pointer">
                            Streak Alerts
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">
                          Receive a notification when you're about to lose your streak
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <div className="flex-1 space-y-1">
                        <div className="font-medium">Notification Email</div>
                        <p className="text-sm text-muted-foreground">
                          Notifications will be sent to: <span className="font-medium">{session?.user?.email}</span>
                        </p>
                      </div>
                      <div className="rounded-full bg-green-100 p-1 dark:bg-green-800">
                        <Check className="h-5 w-5 text-green-600 dark:text-green-300" />
                      </div>
                    </div>

                    {/* Dev-only test notification */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="pt-4 border-t">
                        <h3 className="font-medium mb-2">Development Testing</h3>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const response = await fetch('/api/test-notification', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  email: session?.user?.email,
                                }),
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to send test notification');
                              }
                              
                              setSuccess('Test notification sent successfully!');
                            } catch (err) {
                              setError('Failed to send test notification');
                              console.error(err);
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Send Test Notification
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          This will send a test email to your registered email address.
                          Only visible in development mode.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Notification Settings</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 