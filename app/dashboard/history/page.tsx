"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, Download, Eye, Loader2 } from "lucide-react"

const API_BASE = (typeof window !== 'undefined') ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

export default function HistoryPage() {
  const router = useRouter()
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Get auth token
  const getToken = () => {
    return localStorage.getItem('access_token')
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const token = getToken()

      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${API_BASE}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      const data = await response.json()
      if (data?.tasks) {
        setHistoryItems(data.tasks)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-8 w-8 text-green-500" />
      case 'error':
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />
      case 'running':
      case 'pending':
        return <Clock className="h-8 w-8 text-yellow-500 animate-pulse" />
      default:
        return <Clock className="h-8 w-8 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'error':
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'running':
        return <Badge className="bg-yellow-500">Running</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const calculateDuration = (createdAt: string, updatedAt: string) => {
    try {
      const start = new Date(createdAt)
      const end = new Date(updatedAt)
      const diffMs = end.getTime() - start.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      
      if (diffSec < 60) return `${diffSec}s`
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`
      const diffHr = Math.floor(diffMin / 60)
      return `${diffHr}h ${diffMin % 60}m`
    } catch {
      return '—'
    }
  }

  const exportHistory = () => {
    const csvContent = [
      ['Task', 'Status', 'Created', 'Duration', 'Files'].join(','),
      ...historyItems.map(item => [
        `"${(item.description || '').replace(/"/g, '""')}"`,
        item.status,
        new Date(item.created_at).toLocaleString(),
        item.updated_at ? calculateDuration(item.created_at, item.updated_at) : '—',
        item.files?.length || 0
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `task-history-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">History</h1>
              <p className="text-muted-foreground mt-1">View all your completed and running tasks</p>
            </div>
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={exportHistory}
              disabled={historyItems.length === 0}
            >
              <Download className="h-4 w-4" />
              Export History
            </Button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{historyItems.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {historyItems.filter((h) => h.status === "completed").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {historyItems.filter((h) => h.status === "error" || h.status === "failed").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Files Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {historyItems.reduce((acc, h) => acc + (h.files?.length || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>All task executions ordered by date</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No task history yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start a task from the dashboard to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item, index) => (
                    <div
                      key={item._id || index}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">
                              {item.description || 'Task'}
                            </h3>
                            {getStatusBadge(item.status)}
                            {item.priority && (
                              <Badge variant="outline" className="text-xs">
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span>
                              {new Date(item.created_at || Date.now()).toLocaleString()}
                            </span>
                            {item.updated_at && (
                              <span>
                                Duration: {calculateDuration(item.created_at, item.updated_at)}
                              </span>
                            )}
                            <span>Files: {item.files?.length || 0}</span>
                            {item.result?.agents_involved && (
                              <span>Agents: {item.result.agents_involved}</span>
                            )}
                          </div>
                          {item.result?.error && (
                            <p className="text-xs text-red-500 mt-1 truncate">
                              Error: {item.result.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => router.push(`/dashboard?task=${item._id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}