'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { ChevronDown, CircleHelp, Loader2, Pencil, Trash2 } from 'lucide-react'
import { getProfile, removeProfileValue } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ChildProfile, RemovableProfileField } from '@/lib/types/domain'

type ProfileSectionHeadingProps = {
  title: string
  tooltipText?: string
}

function ProfileSectionHelpTooltip({
  title,
  tooltipText,
}: ProfileSectionHeadingProps) {
  const isMobile = useIsMobile()

  if (!tooltipText) {
    return null
  }

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground"
            aria-label={`More info about ${title}`}
          >
            <CircleHelp className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3 text-xs leading-relaxed">
          {tooltipText}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground"
          aria-label={`More info about ${title}`}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{tooltipText}</TooltipContent>
    </Tooltip>
  )
}

function ProfileSectionHeading({
  title,
  tooltipText,
}: ProfileSectionHeadingProps) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <ProfileSectionHelpTooltip title={title} tooltipText={tooltipText} />
    </div>
  )
}

type CollapsibleProfileSectionProps = {
  title: string
  tooltipText: string
  itemCount: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

function CollapsibleProfileSection({
  title,
  tooltipText,
  itemCount,
  isOpen,
  onOpenChange,
  children,
}: CollapsibleProfileSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="space-y-3 rounded-lg border border-border/70 bg-card/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={isOpen}
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-lg font-semibold tracking-tight text-foreground">{title}</span>
                <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
                  {itemCount}
                </Badge>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <ProfileSectionHelpTooltip title={title} tooltipText={tooltipText} />
        </div>

        <CollapsibleContent>{children}</CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function Profile() {
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isRemovingValue, setIsRemovingValue] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<{
    field: RemovableProfileField
    value: string
  } | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    milestones: false,
    activeSchemas: false,
    interests: false,
  })

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

  async function handleConfirmRemoveProfileValue() {
    if (!pendingRemoval) {
      return
    }

    try {
      setIsRemovingValue(true)
      setError(null)

      const updatedProfile = await removeProfileValue({
        childId: 'Yumi',
        field: pendingRemoval.field,
        value: pendingRemoval.value,
      })

      setProfile(updatedProfile)
      setPendingRemoval(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove profile value',
      )
    } finally {
      setIsRemovingValue(false)
    }
  }

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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{`${profile.name}'s Profile`}</h2>
        {isEditMode ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setPendingRemoval(null)
              setIsEditMode(false)
            }}
          >
            Done
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditMode(true)
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      
      <TooltipProvider>
        <div className="space-y-6">
          <div className="space-y-3">
            <ProfileSectionHeading title="Age" />
            <div className="text-3xl font-semibold text-foreground">
              {profile.ageMonths} Months
            </div>
          </div>

          <CollapsibleProfileSection
            title="Milestones"
            tooltipText="Skills your child is developing or already showing, such as motor, language, and social abilities."
            itemCount={profile.milestones.length}
            isOpen={expandedSections.milestones}
            onOpenChange={(isOpen) => {
              setExpandedSections((previousSections) => {
                return {
                  ...previousSections,
                  milestones: isOpen,
                }
              })
            }}
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.milestones.map((milestone) => (
                <div key={milestone} className="inline-flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-sm px-3 py-1.5">
                    {milestone}
                  </Badge>
                  {isEditMode ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setPendingRemoval({ field: 'milestones', value: milestone })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </CollapsibleProfileSection>

          <CollapsibleProfileSection
            title="Active Schemas"
            tooltipText="Current repeated learning and play patterns your child is showing. We use these patterns to tailor weekly activities."
            itemCount={profile.activeSchemas.length}
            isOpen={expandedSections.activeSchemas}
            onOpenChange={(isOpen) => {
              setExpandedSections((previousSections) => {
                return {
                  ...previousSections,
                  activeSchemas: isOpen,
                }
              })
            }}
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.activeSchemas.map((schema) => (
                <div key={schema} className="inline-flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-sm px-3 py-1.5 border-primary text-primary"
                  >
                    {schema}
                  </Badge>
                  {isEditMode ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setPendingRemoval({ field: 'activeSchemas', value: schema })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </CollapsibleProfileSection>

          <CollapsibleProfileSection
            title="Interests"
            tooltipText="Topics, objects, and activities your child is naturally drawn to right now."
            itemCount={profile.interests.length}
            isOpen={expandedSections.interests}
            onOpenChange={(isOpen) => {
              setExpandedSections((previousSections) => {
                return {
                  ...previousSections,
                  interests: isOpen,
                }
              })
            }}
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.interests.map((interest) => (
                <div key={interest} className="inline-flex items-center gap-1.5">
                  <Badge className="text-sm px-3 py-1.5 bg-accent text-accent-foreground">
                    {interest}
                  </Badge>
                  {isEditMode ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setPendingRemoval({ field: 'interests', value: interest })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </CollapsibleProfileSection>
        </div>
      </TooltipProvider>

      <AlertDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoval(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this profile value?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{pendingRemoval?.value || ''}” from the profile list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingValue}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmRemoveProfileValue()
              }}
              disabled={isRemovingValue}
            >
              {isRemovingValue ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
