'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getProfile } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import type { ChildProfile } from '@/lib/types/domain'

export function Profile() {
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getProfile('Yumi')
        if (isMounted) {
          setProfile(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load profile')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto flex items-center justify-center min-h-[240px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <p className="text-sm text-destructive">{error || 'Profile unavailable.'}</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold">{`${profile.name}'s Profile`}</h2>
      
      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Age</h3>
          <div className="text-3xl font-semibold text-foreground">{profile.ageMonths} Months</div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Milestones</h3>
          <div className="flex flex-wrap gap-2">
            {profile.milestones.map((milestone) => (
              <Badge key={milestone} variant="secondary" className="text-sm px-3 py-1.5">
                {milestone}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active Schemas</h3>
          <div className="flex flex-wrap gap-2">
            {profile.activeSchemas.map((schema) => (
              <Badge key={schema} variant="outline" className="text-sm px-3 py-1.5 border-primary text-primary">
                {schema}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Badge key={interest} className="text-sm px-3 py-1.5 bg-accent text-accent-foreground">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
