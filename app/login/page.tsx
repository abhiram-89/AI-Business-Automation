"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, X, AlertCircle } from "lucide-react"

const API_BASE = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

interface Snackbar {
  message: string
  type: 'success' | 'error' | 'info'
  show: boolean
}

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [snackbar, setSnackbar] = useState<Snackbar>({
    message: "",
    type: "info",
    show: false
  })

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setSnackbar({ message, type, show: true })
    setTimeout(() => {
      setSnackbar(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  const validateInputs = () => {
    if (isRegister && !username.trim()) {
      showSnackbar('Username is required', 'error')
      return false
    }
    
    if (!email.trim()) {
      showSnackbar('Email is required', 'error')
      return false
    }
    
    if (!email.includes('@')) {
      showSnackbar('Please enter a valid email', 'error')
      return false
    }
    
    if (!password) {
      showSnackbar('Password is required', 'error')
      return false
    }
    
    if (isRegister && password.length < 6) {
      showSnackbar('Password must be at least 6 characters', 'error')
      return false
    }
    
    return true
  }

  const submit = async () => {
    if (!validateInputs()) return

    setLoading(true)

    try {
      const url = isRegister ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`
      const payload = isRegister 
        ? { username, email, password } 
        : { email, password }

      console.log('Submitting to:', url)
      console.log('Payload:', isRegister ? { username, email, password: '***' } : { email, password: '***' })

      const resp = await fetch(url, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }, 
        body: JSON.stringify(payload)
      })

      console.log('Response status:', resp.status)
      
      const data = await resp.json()
      console.log('Response data:', data)

      if (!resp.ok) {
        showSnackbar(data.detail || 'Authentication failed', 'error')
        return
      }

      const token = data.access_token || data.accessToken || data.token
      
      if (!token) {
        showSnackbar('No access token received', 'error')
        return
      }

      // Store token
      localStorage.setItem('access_token', token)
      
      // Show success message
      showSnackbar(isRegister ? 'Registration successful!' : 'Login successful!', 'success')
      
      // Navigate to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)

    } catch (e: any) {
      console.error('Error:', e)
      showSnackbar(e?.message || 'Network error. Please check your connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      submit()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted p-4">
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
              {snackbar.type === 'info' && <AlertCircle className="h-4 w-4 text-blue-600" />}
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

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-center">
            {isRegister 
              ? 'Sign up to start automating your business' 
              : 'Sign in to your account to continue'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter username"
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your password"
              disabled={loading}
            />
            {isRegister && (
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <Button 
              onClick={submit} 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isRegister ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRegister(!isRegister)
                setUsername("")
                setEmail("")
                setPassword("")
              }}
              className="w-full"
              disabled={loading}
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </div>

          {/* Info message */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}