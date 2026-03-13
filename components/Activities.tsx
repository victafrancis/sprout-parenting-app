'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, MessageSquarePlus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import {
  acceptDailyLogCandidates,
  createDailyLog,
  getWeeklyPlan,
} from '@/lib/api/client'
import {
  getNextActivityDay,
  getPreviousActivityDay,
  getTodayActivityDayKey,
  parseWeeklyActivityMenu,
  type ActivityDayKey,
} from '@/lib/weekly-activity-menu'
import type { PlanReference, ProfileUpdateCandidates } from '@/lib/types/domain'
import {
  hasAnyCandidates,
  type CandidateGroupKey,
} from '@/components/daily-log/daily-log-utils'
import { ReferenceLogDialog } from '@/components/weekly-plan/ReferenceLogDialog'
import { PlanReferencePreviewDialog } from '@/components/plan-reference/PlanReferencePreviewDialog'
import { ProfileCandidateReviewDialog } from '@/components/daily-log/ProfileCandidateReviewDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const CHILD_ID = 'Yumi'
const ACTIVITIES_TIMEZONE = 'America/Toronto'
const ACTIVITIES_SECTION_ID = 'weekly-activity-menu'

type PendingReferenceLogContext = {
  previewTitle: string
  planReference: PlanReference
}

const activityMarkdownComponents = {
  p: ({ node, ...props }: any) => (
    <p className="text-sm leading-relaxed text-foreground mb-3" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="text-sm list-disc list-inside space-y-2 mb-3 ml-2" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="text-sm list-decimal list-inside space-y-2 mb-3 ml-2" {...props} />
  ),
  li: ({ node, ...props }: any) => <li className="text-muted-foreground" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
}

function createReferenceSnippet(markdown: string) {
  const normalizedMarkdown = markdown.trim()

  if (normalizedMarkdown.length === 0) {
    return undefined
  }

  if (normalizedMarkdown.length <= 180) {
    return normalizedMarkdown
  }

  return `${normalizedMarkdown.slice(0, 180)}...`
}

function toDaySubsectionId(day: ActivityDayKey) {
  return `day-${day.toLowerCase()}`
}

export function Activities() {
  const [markdown, setMarkdown] = useState('')
  const [activePlanObjectKey, setActivePlanObjectKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<ActivityDayKey>(
    getTodayActivityDayKey(ACTIVITIES_TIMEZONE),
  )
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [isReferenceLogDialogOpen, setIsReferenceLogDialogOpen] = useState(false)
  const [pendingReferenceLogContext, setPendingReferenceLogContext] =
    useState<PendingReferenceLogContext | null>(null)
  const [selectedReferenceForPreview, setSelectedReferenceForPreview] =
    useState<PlanReference | null>(null)
  const [referenceLogEntryText, setReferenceLogEntryText] = useState('')
  const [isSavingReferenceLog, setIsSavingReferenceLog] = useState(false)
  const [referenceLogError, setReferenceLogError] = useState<string | null>(null)
  const [pendingCandidates, setPendingCandidates] =
    useState<ProfileUpdateCandidates | null>(null)
  const [pendingCandidateLogStorageKey, setPendingCandidateLogStorageKey] =
    useState<string | null>(null)
  const [isApplyingProfileUpdates, setIsApplyingProfileUpdates] = useState(false)

  const activityMenu = useMemo(() => parseWeeklyActivityMenu(markdown), [markdown])

  const currentDayActivities = activityMenu.byDay[activeDay]

  useEffect(() => {
    let isMounted = true

    async function loadActivePlanMenu() {
      try {
        setIsLoading(true)
        setError(null)

        const initialWeeklyPlan = await getWeeklyPlan({ childId: CHILD_ID })

        let activeWeeklyPlan = initialWeeklyPlan

        if (
          initialWeeklyPlan.activeObjectKey &&
          initialWeeklyPlan.selectedObjectKey !== initialWeeklyPlan.activeObjectKey
        ) {
          activeWeeklyPlan = await getWeeklyPlan({
            childId: CHILD_ID,
            objectKey: initialWeeklyPlan.activeObjectKey,
          })
        }

        if (!isMounted) {
          return
        }

        setActivePlanObjectKey(activeWeeklyPlan.selectedObjectKey)
        setMarkdown(activeWeeklyPlan.markdown)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load activities right now',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadActivePlanMenu()

    return () => {
      isMounted = false
    }
  }, [])

  function removeCandidate(groupKey: CandidateGroupKey, value: string) {
    if (!pendingCandidates) {
      return
    }

    const updatedCandidates: ProfileUpdateCandidates = {
      ...pendingCandidates,
      [groupKey]: pendingCandidates[groupKey].filter((candidate) => {
        return candidate.value !== value
      }),
    }

    setPendingCandidates(updatedCandidates)
  }

  function handleSkipCandidates() {
    setPendingCandidates(null)
    setPendingCandidateLogStorageKey(null)
  }

  async function handleAcceptCandidates() {
    if (!pendingCandidates) {
      handleSkipCandidates()
      return
    }

    try {
      setIsApplyingProfileUpdates(true)
      setReferenceLogError(null)

      if (!pendingCandidateLogStorageKey) {
        setReferenceLogError('Unable to apply profile updates because the log key is missing.')
        return
      }

      await acceptDailyLogCandidates({
        childId: CHILD_ID,
        storageKey: pendingCandidateLogStorageKey,
        selectedCandidates: pendingCandidates,
      })

      handleSkipCandidates()
    } catch (acceptError) {
      setReferenceLogError(
        acceptError instanceof Error ? acceptError.message : 'Failed to apply profile updates',
      )
    } finally {
      setIsApplyingProfileUpdates(false)
    }
  }

  function openReferenceLogDialog(input: PendingReferenceLogContext) {
    setReferenceLogError(null)
    setReferenceLogEntryText('')
    setPendingReferenceLogContext(input)
    setIsReferenceLogDialogOpen(true)
  }

  function closeReferenceLogDialog() {
    setIsReferenceLogDialogOpen(false)
    setPendingReferenceLogContext(null)
    setReferenceLogEntryText('')
    setReferenceLogError(null)
  }

  function openReferencePreviewFromLogDialog() {
    if (!pendingReferenceLogContext) {
      return
    }

    setSelectedReferenceForPreview(pendingReferenceLogContext.planReference)
  }

  function closeReferencePreview() {
    setSelectedReferenceForPreview(null)
  }

  async function handleSaveReferencedLog() {
    if (!pendingReferenceLogContext) {
      return
    }

    const normalizedReferenceLogEntryText = referenceLogEntryText.trim()

    if (!normalizedReferenceLogEntryText) {
      setReferenceLogError('Please write a quick note before saving.')
      return
    }

    try {
      setIsSavingReferenceLog(true)
      setReferenceLogError(null)

      const createdLogResponse = await createDailyLog({
        childId: CHILD_ID,
        rawText: normalizedReferenceLogEntryText,
        planReference: pendingReferenceLogContext.planReference,
      })

      toast.success('Daily log added', {
        duration: 2800,
        className:
          '!bg-emerald-700 !text-white !border-emerald-800 dark:!bg-emerald-600 dark:!border-emerald-500 dark:!text-white',
      })

      if (hasAnyCandidates(createdLogResponse.profileCandidates)) {
        setPendingCandidates(createdLogResponse.profileCandidates)
        setPendingCandidateLogStorageKey(createdLogResponse.log.storageKey ?? null)
      }

      closeReferenceLogDialog()
    } catch (saveError) {
      setReferenceLogError(saveError instanceof Error ? saveError.message : 'Failed to save log')
    } finally {
      setIsSavingReferenceLog(false)
    }
  }

  function moveToNextDay() {
    setActiveDay((currentDay) => getNextActivityDay(currentDay))
  }

  function moveToPreviousDay() {
    setActiveDay((currentDay) => getPreviousActivityDay(currentDay))
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    setTouchStartX(touch.clientX)
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) {
      return
    }

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStartX
    const swipeThreshold = 40

    if (deltaX <= -swipeThreshold) {
      moveToNextDay()
    }

    if (deltaX >= swipeThreshold) {
      moveToPreviousDay()
    }

    setTouchStartX(null)
  }

  const showEmptyActivitiesState = !isLoading && !error && currentDayActivities.length === 0

  return (
    <div className="h-[calc(100dvh-9rem)] p-4 max-w-4xl mx-auto flex flex-col">
      <Card className="mb-4 border-border/70 bg-card/95 shadow-sm">
        <CardContent className="py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="icon" onClick={moveToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">{activeDay}</p>
            </div>

            <Button type="button" variant="ghost" size="icon" onClick={moveToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div
        className="flex-1 min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {!isLoading && error ? (
          <Card className="h-full flex items-center justify-center border-destructive/40">
            <CardContent className="py-8">
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {showEmptyActivitiesState ? (
          <Card className="h-full border-dashed bg-muted/20">
            <CardContent className="h-full flex flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No activities found for {activeDay}.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                The active plan may not include a Weekly Activity Menu entry for this day yet.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error && currentDayActivities.length > 0 ? (
          <div
            className="h-full grid gap-3"
            style={{
              gridTemplateRows: `repeat(${currentDayActivities.length}, minmax(0, 1fr))`,
            }}
          >
            {currentDayActivities.map((activityMarkdown, activityIndex) => {
              return (
                <Card
                  key={`${activeDay}-activity-${activityIndex + 1}`}
                  className="h-full overflow-hidden border-border/80 bg-card/80 backdrop-blur-sm shadow-sm"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Activity {activityIndex + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Log note for ${activeDay} activity ${activityIndex + 1}`}
                        onClick={() => {
                          openReferenceLogDialog({
                            previewTitle: `${activeDay} > Activity ${activityIndex + 1}`,
                            planReference: {
                              planObjectKey: activePlanObjectKey,
                              sectionId: ACTIVITIES_SECTION_ID,
                              sectionTitle: 'Weekly Activity Menu',
                              subsectionId: toDaySubsectionId(activeDay),
                              subsectionTitle: activeDay,
                              activityIndex: activityIndex + 1,
                              referenceLabel: `Weekly Activity Menu > ${activeDay} > Activity ${activityIndex + 1}`,
                              referenceContentMarkdown: activityMarkdown,
                              referenceSnippet: createReferenceSnippet(activityMarkdown),
                            },
                          })
                        }}
                      >
                        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="h-[calc(100%-3.25rem)] overflow-y-auto pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0">
                    <ReactMarkdown components={activityMarkdownComponents}>
                      {activityMarkdown}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : null}
      </div>

      <ReferenceLogDialog
        isOpen={isReferenceLogDialogOpen}
        previewTitle={pendingReferenceLogContext?.previewTitle}
        referenceLabel={pendingReferenceLogContext?.planReference.referenceLabel}
        entryText={referenceLogEntryText}
        errorMessage={referenceLogError}
        isSaving={isSavingReferenceLog}
        onEntryTextChange={(nextText) => {
          setReferenceLogError(null)
          setReferenceLogEntryText(nextText)
        }}
        onOpenReferencePreview={openReferencePreviewFromLogDialog}
        onClose={closeReferenceLogDialog}
        onSave={() => {
          void handleSaveReferencedLog()
        }}
      />

      <PlanReferencePreviewDialog
        isOpen={Boolean(selectedReferenceForPreview)}
        planReference={selectedReferenceForPreview}
        onClose={closeReferencePreview}
      />

      <ProfileCandidateReviewDialog
        isOpen={Boolean(pendingCandidates)}
        pendingCandidates={pendingCandidates}
        isApplyingProfileUpdates={isApplyingProfileUpdates}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleSkipCandidates()
          }
        }}
        onRemoveCandidate={removeCandidate}
        onSkipCandidates={handleSkipCandidates}
        onAcceptCandidates={() => {
          void handleAcceptCandidates()
        }}
      />
    </div>
  )
}
