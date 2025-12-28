"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Search, Download, Trash2, Eye, Filter, Loader2 } from "lucide-react"

const API_BASE = (typeof window !== 'undefined') ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Get auth token
  const getToken = () => {
    return localStorage.getItem('access_token')
  }

  // Check authentication
  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    fetchDocs()
  }, [])

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const token = getToken()
      
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${API_BASE}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()
      if (data?.documents) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', `${API_BASE}/api/upload`)
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const percent = Math.round((ev.loaded / ev.total) * 100)
              setUploadProgress((prev) => ({ ...prev, [file.name]: percent }))
            }
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              console.log('Upload successful')
              setUploadProgress((prev) => {
                const updated = { ...prev }
                delete updated[file.name]
                return updated
              })
              resolve()
            } else if (xhr.status === 401) {
              router.push('/login')
              reject(new Error('Unauthorized'))
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`))
            }
          }

          xhr.onerror = () => reject(new Error('Upload failed'))
          xhr.send(formData)
        })

        console.log(`✓ Uploaded: ${file.name}`)
      } catch (error) {
        console.error(`✗ Failed to upload ${file.name}:`, error)
        alert(`Failed to upload ${file.name}`)
      }
    }

    // Refresh document list
    await fetchDocs()

    // Reset file input
    if (e.target) {
      e.target.value = ''
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${API_BASE}/api/documents/${docId}`, {
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
        throw new Error('Failed to delete document')
      }

      await fetchDocs()
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert('Failed to delete document')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
              <p className="text-muted-foreground mt-1">Manage all your uploaded and processed documents</p>
            </div>
            <div className="flex items-center gap-2">
              <input 
                ref={fileInputRef} 
                type="file" 
                multiple
                onChange={handleFileChange} 
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json"
              />
              <Button onClick={handleUploadClick} className="gap-2" disabled={Object.keys(uploadProgress).length > 0}>
                {Object.keys(uploadProgress).length > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Documents
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {Object.entries(uploadProgress).map(([filename, progress]) => (
                    <div key={filename} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{filename}</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documents.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Uploaded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {documents.filter((d) => d.status === "uploaded").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {documents.filter((d) => d.status === "processing").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(documents.reduce((acc, d) => acc + (d.size || 0), 0) / (1024 * 1024)).toFixed(2)} MB
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>Recently uploaded and processed files</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                  <Button onClick={handleUploadClick} variant="outline" className="mt-4">
                    Upload your first document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                              {doc.original_name || doc.name}
                            </h3>
                            <Badge
                              variant={
                                doc.status === "uploaded"
                                  ? "default"
                                  : doc.status === "processing"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{doc.type || 'Unknown type'}</span>
                            <span>{formatFileSize(doc.size || 0)}</span>
                            <span>Uploaded: {new Date(doc.uploaded_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {doc.url && (
                          <a href={`${API_BASE}${doc.url}`} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(doc._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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