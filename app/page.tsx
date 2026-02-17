'use client'

import { useState } from 'react'
import { BookOpen, User, Calendar } from 'lucide-react'
import { DailyLog } from '@/components/DailyLog'
import { Profile } from '@/components/Profile'
import { WeeklyPlan } from '@/components/WeeklyPlan'
import { Badge } from '@/components/ui/badge'

type Tab = 'daily-log' | 'profile' | 'weekly-plan'

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('daily-log')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Sprout</h1>
        <Badge variant="secondary" className="text-xs font-medium">
          Demo Mode
        </Badge>
      </header>

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
        </div>
      </nav>
    </div>
  )
}
