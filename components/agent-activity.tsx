"use client"

import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react"
import { useEffect, useRef } from "react"

interface AgentActivityProps {
  isRunning: boolean
  agentLogs: any[]
}

export function AgentActivity({ isRunning, agentLogs }: AgentActivityProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [agentLogs])

  const getAgentIcon = (agentName: string) => {
    switch (agentName?.toLowerCase()) {
      case 'coordinator':
        return '🎯'
      case 'analyst':
      case 'dataanalyst':
        return '📊'
      case 'content_generator':
      case 'contentgenerator':
        return '✍️'
      case 'optimizer':
      case 'processoptimizer':
        return '⚡'
      case 'qa':
      case 'qualityassurance':
        return '✅'
      case 'system':
        return '⚙️'
      case 'fallback':
        return '🔄'
      default:
        return '🤖'
    }
  }

  const getActionIcon = (action: string) => {
    const actionLower = action?.toLowerCase() || ''
    
    if (actionLower.includes('completed') || actionLower.includes('finished')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (actionLower.includes('error') || actionLower.includes('failed')) {
      return <AlertCircle className="h-4 w-4 text-destructive" />
    }
    if (actionLower.includes('analyzing') || actionLower.includes('processing')) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    }
    return <Info className="h-4 w-4 text-muted-foreground" />
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return ''
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Agent Activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time updates from AI agents
            </p>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        <div 
          ref={scrollRef}
          className="h-[300px] rounded-lg border bg-muted/30 overflow-y-auto"
        >
          {agentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Activity className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {isRunning ? 'Waiting for agent activity...' : 'No activity yet'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {agentLogs.map((log, index) => {
                const agentName = log.agent || 'Unknown'
                const action = log.action || ''
                const message = log.message || ''
                const timestamp = log.timestamp

                return (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-background border animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="text-2xl flex-shrink-0 mt-0.5">
                      {getAgentIcon(agentName)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm capitalize">
                          {agentName.replace('_', ' ')}
                        </span>
                        {action && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {action.replace('_', ' ')}
                            </span>
                          </>
                        )}
                        {getActionIcon(action)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {message}
                      </p>
                      
                      {timestamp && (
                        <span className="text-xs text-muted-foreground/70 mt-1 inline-block">
                          {formatTimestamp(timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {agentLogs.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {agentLogs.length} event{agentLogs.length !== 1 ? 's' : ''} logged
          </div>
        )}
      </div>
    </Card>
  )
}