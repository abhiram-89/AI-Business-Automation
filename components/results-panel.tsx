"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, CheckCircle, AlertCircle } from "lucide-react"

interface ResultsPanelProps {
  showResults: boolean
  result?: any
}

export function ResultsPanel({ showResults, result }: ResultsPanelProps) {
  if (!showResults) {
    return (
      <Card className="p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Start a task to see AI-generated results and insights here
          </p>
        </div>
      </Card>
    )
  }

  // Handle error state
  if (result?.status === 'error' || result?.error) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-semibold">Task Failed</h2>
              </div>
              <p className="text-sm text-muted-foreground">An error occurred during processing</p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h3 className="font-semibold mb-2 text-destructive">Error Details</h3>
            <p className="text-sm text-muted-foreground">
              {result.error || result.message || 'Unknown error occurred'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Extract results
  const summary = result?.summary || "The AI has completed processing your task."
  const insights = result?.insights || []
  const recommendations = result?.recommendations || []
  const agentsInvolved = result?.agents_involved || 0
  const filesProcessed = result?.files_processed || 0
  const timestamp = result?.timestamp

  const handleDownload = () => {
    // Create downloadable report
    const reportContent = `
AI TASK REPORT
==============

Summary:
${summary}

Key Insights:
${insights.map((i: string, idx: number) => `${idx + 1}. ${i}`).join('\n')}

Recommendations:
${recommendations.map((r: string, idx: number) => `${idx + 1}. ${r}`).join('\n')}

---
Generated: ${timestamp || new Date().toISOString()}
Agents: ${agentsInvolved}
Files: ${filesProcessed}
    `.trim()

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `task-report-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h2 className="text-xl font-semibold">Task Completed</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-generated analysis and insights
              {agentsInvolved > 0 && ` • ${agentsInvolved} agents involved`}
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>

        <div className="space-y-4">
          {/* Executive Summary */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h3 className="font-semibold mb-2">Executive Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
          </div>

          {/* Key Insights */}
          {insights.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h3 className="font-semibold mb-3">Key Insights</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {insights.map((insight: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1 font-bold">•</span>
                    <span className="flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h3 className="font-semibold mb-3">Recommendations</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1 font-semibold">{idx + 1}.</span>
                    <span className="flex-1">{rec}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Processing Info */}
          {(filesProcessed > 0 || timestamp) && (
            <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                {filesProcessed > 0 && <span>Files processed: {filesProcessed}</span>}
                {timestamp && (
                  <span>
                    Completed: {new Date(timestamp).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              New Task
            </Button>
            <Button className="flex-1" onClick={handleDownload}>
              Export Report
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}