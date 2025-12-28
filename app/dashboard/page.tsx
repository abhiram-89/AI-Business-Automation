"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { TaskInput } from "@/components/task-input"
import { AgentActivity } from "@/components/agent-activity"
import { ResultsPanel } from "@/components/results-panel"
import { StatsOverview } from "@/components/stats-overview"

const API_BASE = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

export default function DashboardPage() {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const taskIdRef = useRef<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [agentLogs, setAgentLogs] = useState<any[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const getToken = () => localStorage.getItem('access_token')

  // Setup WebSocket
  const setupWebSocket = (uid: string) => {
    if (!uid || uid === 'undefined' || uid === 'null' || uid.trim() === '') {
      console.error('❌ Invalid user ID for WebSocket:', uid)
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected')
      return
    }

    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch (e) {
        console.error('Error closing WebSocket:', e)
      }
      wsRef.current = null
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔌 CONNECTING WEBSOCKET')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 User ID:', uid)
    
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const wsUrl = `${protocol}://${window.location.hostname}:8000/ws/${uid}`
    console.log('📡 URL:', wsUrl)
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket CONNECTED')
        setWsConnected(true)
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, 30000)
      }

      ws.onmessage = (ev) => {
        if (ev.data === 'pong') {
          console.log('💓 Pong')
          return
        }

        try {
          const msg = JSON.parse(ev.data)
          console.log('📩 Message:', msg.type)

          if (taskIdRef.current && msg.task_id && msg.task_id !== taskIdRef.current) {
            return
          }

          if (msg.type === "agent_log") {
            console.log('📝 Log:', msg.log.agent, '-', msg.log.message)
            setAgentLogs(prev => [...prev, msg.log])
          }

          if (msg.type === "task_completed") {
            console.log('✅ COMPLETED VIA WEBSOCKET')
            setResult(msg.result)
            setShowResults(true)
            setIsRunning(false)
            taskIdRef.current = null
            
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }

          if (msg.type === "task_error") {
            console.error('❌ Error:', msg.error)
            setResult({ 
              error: msg.error, 
              status: 'error',
              summary: `Error: ${msg.error}`,
              insights: ['An error occurred'],
              recommendations: ['Please try again']
            })
            setShowResults(true)
            setIsRunning(false)
            taskIdRef.current = null
            
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        } catch (e) {
          console.error('❌ Parse error:', e)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error')
        setWsConnected(false)
      }

      ws.onclose = (event) => {
        console.log('🔌 Disconnected:', event.code)
        wsRef.current = null
        setWsConnected(false)
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
        
        if (uid && !reconnectTimeoutRef.current) {
          console.log('⏳ Reconnecting in 3s...')
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            setupWebSocket(uid)
          }, 3000)
        }
      }
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
    }
  }

  // Fetch user and setup WebSocket
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken()
        if (!token) {
          console.log('❌ No token')
          router.push('/login')
          return
        }

        console.log('🔑 Fetching user...')
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
          console.log('❌ Auth failed')
          localStorage.removeItem('access_token')
          router.push('/login')
          return
        }

        const data = await response.json()
        console.log('📦 User data received:', data)
        
        // Get user ID from response - it's in data.user._id
        const uid = data.user?._id || data.user?.id
        
        console.log('✅ Authenticated:', data.user?.email)
        console.log('🆔 User ID extracted:', uid)
        console.log('🔍 User ID type:', typeof uid)
        console.log('🔍 User ID length:', uid?.length)
        
        if (!uid || uid === 'undefined' || uid === 'null' || uid.trim() === '') {
          console.error('❌ INVALID USER ID!')
          console.error('   Received:', uid)
          console.error('   User object:', data.user)
          alert('Failed to get user ID. Please login again.')
          router.push('/login')
          return
        }
        
        setUserId(uid)
        setupWebSocket(uid)
        
      } catch (error) {
        console.error('❌ Failed to fetch user:', error)
        router.push('/login')
      }
    }

    fetchUser()

    return () => {
      console.log('🧹 Cleanup')
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [router])

  const handleStartTaskWithFiles = async (taskText: string, files: File[]) => {
    if (!taskText.trim()) {
      alert('Please enter a task description')
      return
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 STARTING TASK')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📝 Description:', taskText.substring(0, 60) + '...')
    console.log('📁 Files:', files.length)
    console.log('👤 User ID:', userId)
    console.log('🔌 WebSocket:', wsConnected ? 'Connected' : 'Disconnected')

    setIsRunning(true)
    setShowResults(false)
    setResult(null)
    setAgentLogs([])
    setUploadProgress({})
    taskIdRef.current = null

    const token = getToken()
    if (!token) {
      console.error('❌ No token')
      router.push('/login')
      return
    }

    try {
      // Upload files
      const uploadedFiles: string[] = []

      for (const file of files) {
        console.log(`⬆️  Uploading: ${file.name}`)
        try {
          const formData = new FormData()
          formData.append('file', file)

          const uploadPromise = new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', `${API_BASE}/api/upload`)
            xhr.setRequestHeader('Authorization', `Bearer ${token}`)

            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable) {
                const percent = Math.round((ev.loaded / ev.total) * 100)
                setUploadProgress(prev => ({ ...prev, [file.name]: percent }))
              }
            }

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText)
                  if (data.document?.name) {
                    resolve(data.document.name)
                  } else {
                    reject(new Error('No document name'))
                  }
                } catch (e) {
                  reject(e)
                }
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`))
              }
            }

            xhr.onerror = () => reject(new Error('Upload failed'))
            xhr.send(formData)
          })

          const fileName = await uploadPromise
          uploadedFiles.push(fileName)
          console.log(`✅ Uploaded: ${fileName}`)
        } catch (error) {
          console.error(`❌ Upload failed:`, error)
          alert(`Failed to upload ${file.name}`)
          setIsRunning(false)
          return
        }
      }

      setUploadProgress({})

      if (!wsConnected && userId) {
        console.log('⚠️  Reconnecting WebSocket...')
        setupWebSocket(userId)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Create task
      console.log('📤 Creating task...')
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: taskText,
          files: uploadedFiles,
          priority: 'medium'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create task')
      }

      const data = await response.json()
      const newTaskId = data.task._id
      taskIdRef.current = newTaskId
      
      console.log('✅ Task created:', newTaskId)
      console.log('⏳ Waiting for results...')

      // Start polling
      let pollCount = 0
      const maxPolls = 30
      
      pollIntervalRef.current = setInterval(async () => {
        pollCount++
        
        if (showResults || agentLogs.length > 0) {
          console.log('✅ Got results, stopping poll')
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          return
        }
        
        console.log(`🔄 Poll ${pollCount}/${maxPolls}`)
        
        try {
          const pollResponse = await fetch(`${API_BASE}/api/tasks/${newTaskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (pollResponse.ok) {
            const taskData = await pollResponse.json()
            const status = taskData.task.status
            
            console.log(`   Status: ${status}`)
            
            if (status === 'completed' && taskData.task.result) {
              console.log('✅ COMPLETED (polling)')
              
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              
              setResult(taskData.task.result)
              setShowResults(true)
              setIsRunning(false)
              taskIdRef.current = null
              
              setAgentLogs(prev => [...prev, {
                agent: 'System',
                action: 'completed',
                message: 'Task completed (fallback retrieval)',
                timestamp: new Date().toISOString()
              }])
              
            } else if (status === 'error') {
              console.error('❌ Failed (polling)')
              
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              
              setResult(taskData.task.result || { 
                error: 'Task failed', 
                status: 'error',
                summary: 'Task failed',
                insights: ['Error occurred'],
                recommendations: ['Try again']
              })
              setShowResults(true)
              setIsRunning(false)
              taskIdRef.current = null
            }
          }
        } catch (pollError) {
          console.error('❌ Poll error:', pollError)
        }
        
        if (pollCount >= maxPolls) {
          console.warn('⏰ Timeout')
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          
          setResult({
            status: 'error',
            summary: 'Task taking longer than expected',
            insights: ['May still be processing'],
            recommendations: ['Check History page later']
          })
          setShowResults(true)
          setIsRunning(false)
        }
      }, 3000)

    } catch (error: any) {
      console.error('❌ Task failed:', error)
      alert(error.message || 'Failed to start task')
      setIsRunning(false)
      setAgentLogs([])
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Automate your business tasks with AI agents
                {wsConnected ? (
                  <span className="ml-2 text-green-500 font-semibold">● Connected</span>
                ) : (
                  <span className="ml-2 text-red-500 font-semibold">● Disconnected</span>
                )}
                {userId && <span className="ml-2 text-xs text-muted-foreground">ID: {userId.slice(0, 8)}...</span>}
              </p>
            </div>
          </div>

          <StatsOverview />

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <TaskInput 
                onStart={handleStartTaskWithFiles} 
                isRunning={isRunning} 
                uploadProgress={uploadProgress} 
              />
              <AgentActivity isRunning={isRunning} agentLogs={agentLogs} />
            </div>

            <div>
              <ResultsPanel showResults={showResults} result={result} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}