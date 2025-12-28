"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Activity, Settings, Brain, History } from "lucide-react"
import { useEffect, useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Workflows", href: "/dashboard/workflows", icon: Activity },
  { name: "History", href: "/dashboard/history", icon: History },
  { name: "Documents", href: "/dashboard/documents", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

const API_BASE = (typeof window !== 'undefined') ? `${window.location.protocol}//${window.location.hostname}:8000` : ''

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{username: string; email: string} | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setUser({ username: data.user.username, email: data.user.email })
      })
      .catch(() => setUser(null))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
    router.push('/login')
  }

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">AutomateAI</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
            {user ? user.username.slice(0, 2).toUpperCase() : 'AU'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user ? user.username : 'Guest'}</p>
            <p className="text-xs text-muted-foreground truncate">{user ? user.email : 'Not signed in'}</p>
          </div>
          <div>
            {user ? (
              <button onClick={handleLogout} className="text-xs text-red-500">Logout</button>
            ) : (
              <Link href="/login" className="text-xs text-primary">Sign in</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
