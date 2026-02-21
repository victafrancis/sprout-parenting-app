'use client'

import { useEffect, useState } from 'react'
import { BookOpen, User, Calendar } from 'lucide-react'
import { DailyLog } from '@/components/DailyLog'
import { Profile } from '@/components/Profile'
import { WeeklyPlan } from '@/components/WeeklyPlan'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getAuthStatus,
  loginWithPasscode,
  logout,
} from '@/lib/api/client'
import type { AuthMode } from '@/lib/types/domain'

type Tab = 'daily-log' | 'profile' | 'weekly-plan'

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('weekly-plan')
  const [authMode, setAuthMode] = useState<AuthMode>('demo')
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [globalAuthError, setGlobalAuthError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadAuthStatus() {
      try {
        const status = await getAuthStatus()
        if (isMounted) {
          setAuthMode(status.mode)
        }
      } catch (error) {
        if (isMounted) {
          setAuthMode('demo')
        }
      }
    }

    void loadAuthStatus()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLogin() {
    try {
      setIsAuthenticating(true)
      setLoginError(null)
      setGlobalAuthError(null)

      const status = await loginWithPasscode({
        passcode,
        rememberMe,
      })

      setAuthMode(status.mode)
      setLoginDialogOpen(false)
      setPasscode('')
      window.location.reload()
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'Unable to login right now',
      )
    } finally {
      setIsAuthenticating(false)
    }
  }

  async function handleLogout() {
    try {
      setGlobalAuthError(null)
      await logout()
      setAuthMode('demo')
      window.location.reload()
    } catch (error) {
      setGlobalAuthError(
        error instanceof Error ? error.message : 'Unable to logout right now',
      )
    }
  }

  const isAuthenticated = authMode === 'authenticated'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Sprout</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isAuthenticated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void handleLogout()
              }}
            >
              Log out
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLoginError(null)
                setLoginDialogOpen(true)
              }}
            >
              <Badge variant="secondary" className="text-xs font-medium">
                Demo Mode (click to login)
              </Badge>
            </button>
          )}
        </div>
      </header>

      {globalAuthError ? (
        <div className="px-4 pt-3 max-w-2xl mx-auto w-full">
          <p className="text-sm text-destructive" role="alert">
            {globalAuthError}
          </p>
        </div>
      ) : null}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'daily-log' && <DailyLog />}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'weekly-plan' && <WeeklyPlan />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
          <button
            onClick={() => setActiveTab('weekly-plan')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeTab === 'weekly-plan' 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs font-medium">Weekly Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('daily-log')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeTab === 'daily-log' 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-medium">Daily Log</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeTab === 'profile' 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>
              Enter your admin passcode to unlock live AWS data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-passcode">Passcode</Label>
              <Input
                id="admin-passcode"
                type="password"
                value={passcode}
                onChange={(event) => {
                  setLoginError(null)
                  setPasscode(event.target.value)
                }}
                placeholder="Enter passcode"
              />
              {loginError ? (
                <p className="text-sm text-destructive" role="alert">
                  {loginError}
                </p>
              ) : null}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => {
                  setRememberMe(Boolean(checked))
                }}
              />
              <Label htmlFor="remember-me">Remember me on this device</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLoginError(null)
                setLoginDialogOpen(false)
              }}
              disabled={isAuthenticating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleLogin()
              }}
              disabled={isAuthenticating || passcode.trim().length === 0}
            >
              {isAuthenticating ? 'Signing in...' : 'Sign in'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
