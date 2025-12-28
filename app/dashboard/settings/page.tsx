"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { User, Bell, Lock, Database, CreditCard, Check, X, Copy } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const API_BASE = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

interface Snackbar {
  message: string
  type: 'success' | 'error' | 'info'
  show: boolean
}

export default function SettingsPage() {
  // Profile state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [username, setUsername] = useState("")
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Notification state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskCompletionAlerts: true,
    failureAlerts: true,
    weeklyReports: false
  })
  
  // API Key state
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  
  // Subscription state
  const [subscription, setSubscription] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<Snackbar>({
    message: "",
    type: "info",
    show: false
  })

  // Show snackbar helper
  const showSnackbar = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setSnackbar({ message, type, show: true })
    setTimeout(() => {
      setSnackbar(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  // Get auth token
  const getToken = () => {
    return localStorage.getItem('access_token')
  }

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/settings/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFirstName(data.firstName || "")
        setLastName(data.lastName || "")
        setEmail(data.email || "")
        setCompany(data.company || "")
        setUsername(data.username || "")
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  // Fetch notification settings
  const fetchNotifications = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/settings/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Fetch API key
  const fetchApiKey = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/settings/api-key`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApiKey(data.apiKey || "")
      }
    } catch (error) {
      console.error('Failed to fetch API key:', error)
    }
  }

  // Fetch subscription
  const fetchSubscription = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/api/settings/subscription`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
        setPaymentMethod(data.paymentMethod)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  // Load all settings on mount
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchProfile(),
      fetchNotifications(),
      fetchApiKey(),
      fetchSubscription()
    ]).finally(() => setLoading(false))
  }, [])

  // Update profile
  const handleUpdateProfile = async () => {
    setProfileLoading(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/api/settings/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          company
        })
      })

      const data = await response.json()

      if (response.ok) {
        showSnackbar('Profile updated successfully!', 'success')
      } else {
        showSnackbar(data.detail || 'Failed to update profile', 'error')
      }
    } catch (error) {
      showSnackbar('Network error. Please try again.', 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  // Update password
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showSnackbar('Passwords do not match', 'error')
      return
    }

    if (newPassword.length < 6) {
      showSnackbar('Password must be at least 6 characters', 'error')
      return
    }

    setPasswordLoading(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/api/settings/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        showSnackbar('Password updated successfully!', 'success')
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        showSnackbar(data.detail || 'Failed to update password', 'error')
      }
    } catch (error) {
      showSnackbar('Network error. Please try again.', 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Update notifications
  const handleUpdateNotifications = async (key: string, value: boolean) => {
    const updatedNotifications = { ...notifications, [key]: value }
    setNotifications(updatedNotifications)

    setNotificationLoading(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/api/settings/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedNotifications)
      })

      if (response.ok) {
        showSnackbar('Notification settings updated!', 'success')
      } else {
        // Revert on error
        setNotifications(notifications)
        showSnackbar('Failed to update notifications', 'error')
      }
    } catch (error) {
      setNotifications(notifications)
      showSnackbar('Network error. Please try again.', 'error')
    } finally {
      setNotificationLoading(false)
    }
  }

  // Copy API key
  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    showSnackbar('API key copied to clipboard!', 'success')
  }

  // Regenerate API key
  const handleRegenerateApiKey = async () => {
    if (!confirm('Are you sure? This will invalidate your current API key.')) {
      return
    }

    setApiKeyLoading(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/api/settings/api-key/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setApiKey(data.apiKey)
        showSnackbar('API key regenerated successfully!', 'success')
      } else {
        showSnackbar('Failed to regenerate API key', 'error')
      }
    } catch (error) {
      showSnackbar('Network error. Please try again.', 'error')
    } finally {
      setApiKeyLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6 max-w-4xl">
          {/* Snackbar */}
          {snackbar.show && (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
              <Alert className={`min-w-[300px] ${
                snackbar.type === 'success' ? 'bg-green-50 border-green-200' :
                snackbar.type === 'error' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  {snackbar.type === 'success' && <Check className="h-4 w-4 text-green-600" />}
                  {snackbar.type === 'error' && <X className="h-4 w-4 text-red-600" />}
                  <AlertDescription className={
                    snackbar.type === 'success' ? 'text-green-800' :
                    snackbar.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }>
                    {snackbar.message}
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
          </div>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Profile Settings</CardTitle>
              </div>
              <CardDescription>Update your personal information and profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} disabled className="bg-muted" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={profileLoading}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates about your workflows</p>
                </div>
                <Switch 
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => handleUpdateNotifications('emailNotifications', checked)}
                  disabled={notificationLoading}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Task Completion Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when tasks complete</p>
                </div>
                <Switch 
                  checked={notifications.taskCompletionAlerts}
                  onCheckedChange={(checked) => handleUpdateNotifications('taskCompletionAlerts', checked)}
                  disabled={notificationLoading}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Failure Alerts</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts for failed workflows</p>
                </div>
                <Switch 
                  checked={notifications.failureAlerts}
                  onCheckedChange={(checked) => handleUpdateNotifications('failureAlerts', checked)}
                  disabled={notificationLoading}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Get weekly summary of automation activity</p>
                </div>
                <Switch 
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) => handleUpdateNotifications('weeklyReports', checked)}
                  disabled={notificationLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>Manage your password and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input 
                  id="currentPassword" 
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button onClick={handleUpdatePassword} disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Button variant="outline" onClick={() => showSnackbar('2FA coming soon!', 'info')}>
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>API Settings</CardTitle>
              </div>
              <CardDescription>Manage API keys and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    id="apiKey" 
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    readOnly 
                    className="font-mono"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleCopyApiKey}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showApiKey"
                  checked={showApiKey}
                  onChange={(e) => setShowApiKey(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showApiKey" className="cursor-pointer">Show API key</Label>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleRegenerateApiKey}
                disabled={apiKeyLoading}
              >
                {apiKeyLoading ? 'Regenerating...' : 'Regenerate API Key'}
              </Button>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Billing & Subscription</CardTitle>
              </div>
              <CardDescription>Manage your subscription and payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{subscription?.plan || 'Free'} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    {subscription?.price ? `$${subscription.price}/month` : 'Free forever'}
                    {subscription?.renewsOn && ` • Renews on ${new Date(subscription.renewsOn).toLocaleDateString()}`}
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => showSnackbar('Plan management coming soon!', 'info')}
                >
                  Manage Plan
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Payment Method</Label>
                {paymentMethod ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{paymentMethod.lastFour}</p>
                        <p className="text-sm text-muted-foreground">Expires {paymentMethod.expiry}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => showSnackbar('Payment update coming soon!', 'info')}
                    >
                      Update
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg border-dashed">
                    <p className="text-sm text-muted-foreground text-center">No payment method on file</p>
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => showSnackbar('Payment setup coming soon!', 'info')}
                    >
                      Add Payment Method
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}