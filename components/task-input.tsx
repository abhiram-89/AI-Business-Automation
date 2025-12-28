"use client"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Upload, Play, Loader2, X } from "lucide-react"

interface TaskInputProps {
  onStart: (taskText: string, files: File[]) => void
  isRunning: boolean
  uploadProgress?: Record<string, number>
}

export function TaskInput({ onStart, isRunning, uploadProgress = {} }: TaskInputProps) {
  const [task, setTask] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handlePick = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return
    
    const fileArray = Array.from(selectedFiles)
    setFiles((prev) => [...prev, ...fileArray])
    
    // Reset input value so same file can be selected again
    e.currentTarget.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStart = () => {
    if (!task.trim()) {
      alert('Please enter a task description')
      return
    }
    onStart(task, files)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Task Input</h2>
          <p className="text-sm text-muted-foreground">Describe your task in plain English</p>
        </div>

        <Textarea
          placeholder="Example: Analyze this sales data and generate insights about top performing products..."
          className="min-h-[120px] resize-none"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          disabled={isRunning}
        />

        <input 
          ref={fileInputRef} 
          type="file" 
          multiple 
          onChange={onFileChange} 
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json"
        />

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handlePick} 
            disabled={isRunning}
            type="button"
          >
            <Upload className="h-4 w-4" />
            Attach Files
          </Button>

          <Button 
            className="gap-2 flex-1" 
            onClick={handleStart} 
            disabled={!task.trim() || isRunning}
            type="button"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Task
              </>
            )}
          </Button>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-sm font-medium text-muted-foreground">
              Attached Files ({files.length})
            </div>
            {files.map((file, index) => {
              const progress = uploadProgress[file.name]
              const hasProgress = progress !== undefined

              return (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                      {hasProgress && ` • ${progress}% uploaded`}
                    </div>
                    {hasProgress && progress < 100 && (
                      <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {!isRunning && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => removeFile(index)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">Tip:</span> Be specific about what you want the AI to do. 
            You can attach documents for analysis (PDF, Excel, CSV, etc.)
          </p>
        </div>
      </div>
    </Card>
  )
}