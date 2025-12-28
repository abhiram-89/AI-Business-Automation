"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Loader2 } from "lucide-react"

const API_BASE = (typeof window !== 'undefined') ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

interface WorkflowCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorkflowCreated: () => void
}

export function WorkflowCreateDialog({ open, onOpenChange, onWorkflowCreated }: WorkflowCreateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [trigger, setTrigger] = useState("manual")
  const [actions, setActions] = useState<Array<{type: string, description: string}>>([
    { type: "analyze", description: "" }
  ])

  const getToken = () => localStorage.getItem('access_token')

  const handleAddAction = () => {
    setActions([...actions, { type: "analyze", description: "" }])
  }

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const handleActionChange = (index: number, field: 'type' | 'description', value: string) => {
    const newActions = [...actions]
    newActions[index][field] = value
    setActions(newActions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('Please enter a workflow name')
      return
    }

    if (!description.trim()) {
      alert('Please enter a workflow description')
      return
    }

    setLoading(true)

    try {
      const token = getToken()
      if (!token) {
        alert('Please login again')
        return
      }

      const response = await fetch(`${API_BASE}/api/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          trigger,
          actions: actions.filter(a => a.description.trim()),
          is_active: true
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create workflow')
      }

      const data = await response.json()
      console.log('Workflow created:', data)

      // Reset form
      setName("")
      setDescription("")
      setTrigger("manual")
      setActions([{ type: "analyze", description: "" }])

      // Close dialog and refresh
      onOpenChange(false)
      onWorkflowCreated()

      alert('Workflow created successfully!')
    } catch (error: any) {
      console.error('Failed to create workflow:', error)
      alert(error.message || 'Failed to create workflow')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Automate repetitive tasks with custom workflows
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Monthly Sales Report"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this workflow does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="schedule">Scheduled</SelectItem>
                  <SelectItem value="file_upload">On File Upload</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="email">Email Received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Actions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAction}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>

              <div className="space-y-3">
                {actions.map((action, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Select
                        value={action.type}
                        onValueChange={(value) => handleActionChange(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="analyze">Analyze Data</SelectItem>
                          <SelectItem value="generate">Generate Content</SelectItem>
                          <SelectItem value="optimize">Optimize Process</SelectItem>
                          <SelectItem value="notify">Send Notification</SelectItem>
                          <SelectItem value="export">Export Results</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Action description..."
                        value={action.description}
                        onChange={(e) => handleActionChange(index, 'description', e.target.value)}
                      />
                    </div>

                    {actions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAction(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workflow'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}