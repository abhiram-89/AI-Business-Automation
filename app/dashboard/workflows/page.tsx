"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Edit, Trash2, Plus, Clock, CheckCircle2, Loader2 } from "lucide-react"
import { WorkflowCreateDialog } from "@/components/workflow-create-dialog"

const API_BASE = (typeof window !== 'undefined') ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

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
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      const token = getToken()

      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${API_BASE}/api/workflows`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch workflows')
      }

      const data = await response.json()
      if (data?.workflows) {
        setWorkflows(data.workflows)
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (workflowId: string, currentStatus: boolean) => {
    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${API_BASE}/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (response.ok) {
        await fetchWorkflows()
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error)
    }
  }

  const handleDelete = async (workflowId: string, workflowName: string) => {
    if (!confirm(`Are you sure you want to delete "${workflowName}"?`)) {
      return
    }

    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${API_BASE}/api/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to delete workflow')
      }

      await fetchWorkflows()
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      alert('Failed to delete workflow')
    }
  }

  const calculateSuccessRate = (workflow: any): number => {
    // If workflow has successRate field, use it
    if (workflow.successRate !== undefined) {
      return workflow.successRate
    }
    
    // Otherwise calculate from runs
    const totalRuns = workflow.runs || 0
    const successfulRuns = workflow.successful_runs || 0
    
    if (totalRuns === 0) return 0
    return Math.round((successfulRuns / totalRuns) * 100)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
              <p className="text-muted-foreground mt-1">Manage and monitor your automated workflows</p>
            </div>
            <Button 
              className="gap-2" 
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Workflow
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workflows.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {workflows.filter((w) => w.is_active).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {workflows.reduce((acc, w) => acc + (w.runs || 0), 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {workflows.length > 0 
                    ? Math.round(workflows.reduce((acc, w) => acc + calculateSuccessRate(w), 0) / workflows.length)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflows List */}
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : workflows.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">No Workflows Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first workflow to automate repetitive tasks
                      </p>
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Workflow
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              workflows.map((workflow) => (
                <Card key={workflow._id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <CardTitle>{workflow.name}</CardTitle>
                          <Badge variant={workflow.is_active ? "default" : "secondary"}>
                            {workflow.is_active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <Pause className="h-3 w-3 mr-1" />
                                Paused
                              </>
                            )}
                          </Badge>
                          {workflow.trigger && (
                            <Badge variant="outline" className="text-xs">
                              Trigger: {workflow.trigger}
                            </Badge>
                          )}
                        </div>
                        <CardDescription>{workflow.description}</CardDescription>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleToggleActive(workflow._id, workflow.is_active)}
                          title={workflow.is_active ? "Pause workflow" : "Activate workflow"}
                        >
                          {workflow.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => alert('Edit workflow feature coming soon!')}
                          title="Edit workflow"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(workflow._id, workflow.name)}
                          title="Delete workflow"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Last run: {workflow.last_run 
                          ? new Date(workflow.last_run).toLocaleString() 
                          : 'Never'}
                      </div>
                      <div>Total runs: {workflow.runs || 0}</div>
                      <div className="flex items-center gap-2">
                        Success rate: 
                        <span className={`font-semibold ${
                          calculateSuccessRate(workflow) >= 80 
                            ? 'text-green-500' 
                            : calculateSuccessRate(workflow) >= 50 
                              ? 'text-yellow-500' 
                              : 'text-red-500'
                        }`}>
                          {calculateSuccessRate(workflow)}%
                        </span>
                      </div>
                      {workflow.actions && workflow.actions.length > 0 && (
                        <div>
                          Actions: {workflow.actions.length}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Create Workflow Dialog */}
      <WorkflowCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onWorkflowCreated={fetchWorkflows}
      />
    </div>
  )
}