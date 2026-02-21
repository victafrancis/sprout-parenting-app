'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  acceptDailyLogCandidates,
  createDailyLog,
  deleteDailyLog,
  getDailyLogs,
  getProfile,
} from '@/lib/api/client'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DailyLogEntry, ProfileUpdateCandidates } from '@/lib/types/domain'

type CandidateGroupKey = keyof ProfileUpdateCandidates
const DAILY_LOG_PAGE_SIZE = 5

export function DailyLog() {
  const [isSaving, setIsSaving] = useState(false)
  const [isApplyingProfileUpdates, setIsApplyingProfileUpdates] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [childName, setChildName] = useState('your child')
  const [entries, setEntries] = useState<DailyLogEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [logEntry, setLogEntry] = useState('')
  const [candidateReviewOpen, setCandidateReviewOpen] = useState(false)
  const [isDeletingLog, setIsDeletingLog] = useState(false)
  const [pendingLogDeletion, setPendingLogDeletion] =
    useState<DailyLogEntry | null>(null)
  const [pendingCandidates, setPendingCandidates] = useState<ProfileUpdateCandidates | null>(
    null,
  )
  const [pendingCandidateLogStorageKey, setPendingCandidateLogStorageKey] =
    useState<string | null>(null)

  function removeCandidate(groupKey: CandidateGroupKey, value: string) {
    if (!pendingCandidates) {
      return
    }

    const updatedCandidates: ProfileUpdateCandidates = {
      ...pendingCandidates,
      [groupKey]: pendingCandidates[groupKey].filter(
        (candidate) => candidate.value !== value,
      ),
    }

    setPendingCandidates(updatedCandidates)
  }

  function hasAnyCandidates(candidates: ProfileUpdateCandidates) {
    if (candidates.milestones.length > 0) {
      return true
    }

    if (candidates.activeSchemas.length > 0) {
      return true
    }

    if (candidates.interests.length > 0) {
      return true
    }

    return false
  }

  function hasAnyAppliedProfileUpdates(entry: DailyLogEntry) {
    if (!entry.appliedProfileUpdates) {
      return false
    }

    if (entry.appliedProfileUpdates.milestones.length > 0) {
      return true
    }

    if (entry.appliedProfileUpdates.activeSchemas.length > 0) {
      return true
    }

    if (entry.appliedProfileUpdates.interests.length > 0) {
      return true
    }

    return false
  }

  async function loadRecentActivityFirstPage() {
    const recentLogs = await getDailyLogs({
      childId: 'Yumi',
      limit: DAILY_LOG_PAGE_SIZE,
    })

    setEntries(recentLogs.items)
    setNextCursor(recentLogs.nextCursor)
  }

  async function loadInitialData() {
    try {
      setIsLoading(true)
      setError(null)
      const [profile, recentLogs] = await Promise.all([
        getProfile('Yumi'),
        getDailyLogs({ childId: 'Yumi', limit: DAILY_LOG_PAGE_SIZE }),
      ])

      setChildName(profile.name)
      setEntries(recentLogs.items)
      setNextCursor(recentLogs.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily log data')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLoadMoreLogs() {
    if (!nextCursor || isLoadingMore) {
      return
    }

    try {
      setIsLoadingMore(true)
      setError(null)

      const nextPage = await getDailyLogs({
        childId: 'Yumi',
        limit: DAILY_LOG_PAGE_SIZE,
        cursor: nextCursor,
      })

      setEntries((previousEntries) => {
        return [...previousEntries, ...nextPage.items]
      })
      setNextCursor(nextPage.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more recent activity')
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    void loadInitialData()
  }, [])

  const handleSaveLog = async () => {
    try {
      setIsSaving(true)
      setError(null)
      const createdLogResponse = await createDailyLog({
        childId: 'Yumi',
        rawText: logEntry,
      })

      if (hasAnyCandidates(createdLogResponse.profileCandidates)) {
        setPendingCandidates(createdLogResponse.profileCandidates)
        setPendingCandidateLogStorageKey(createdLogResponse.log.storageKey ?? null)
        setCandidateReviewOpen(true)
      }

      setLogEntry('')
      await loadRecentActivityFirstPage()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save log entry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAcceptCandidates = async () => {
    if (!pendingCandidates) {
      setCandidateReviewOpen(false)
      return
    }

    try {
      setIsApplyingProfileUpdates(true)
      setError(null)

      if (!pendingCandidateLogStorageKey) {
        setError('Unable to apply profile updates because the log key is missing.')
        return
      }

      await acceptDailyLogCandidates({
        childId: 'Yumi',
        storageKey: pendingCandidateLogStorageKey,
        selectedCandidates: pendingCandidates,
      })

      setCandidateReviewOpen(false)
      setPendingCandidates(null)
      setPendingCandidateLogStorageKey(null)
      await loadRecentActivityFirstPage()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to apply profile updates',
      )
    } finally {
      setIsApplyingProfileUpdates(false)
    }
  }

  const handleSkipCandidates = () => {
    setCandidateReviewOpen(false)
    setPendingCandidates(null)
    setPendingCandidateLogStorageKey(null)
  }

  async function handleConfirmDeleteLog() {
    if (!pendingLogDeletion) {
      return
    }

    if (!pendingLogDeletion.storageKey) {
      setError('This log cannot be deleted because it has no storage key.')
      setPendingLogDeletion(null)
      return
    }

    try {
      setIsDeletingLog(true)
      setError(null)

      await deleteDailyLog({
        childId: 'Yumi',
        storageKey: pendingLogDeletion.storageKey,
      })

      setEntries((previousEntries) =>
        previousEntries.filter((entry) => {
          return entry.storageKey !== pendingLogDeletion.storageKey
        }),
      )

      setPendingLogDeletion(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log entry')
    } finally {
      setIsDeletingLog(false)
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-balance">
        {`How was ${childName}'s day?`}
      </h2>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      
      <div className="space-y-4">
        <Textarea
          placeholder="Brain-dump today's events, milestones, or struggles..."
          className="min-h-[240px] text-base resize-none"
          value={logEntry}
          onChange={(e) => setLogEntry(e.target.value)}
        />
        
        <Button 
          onClick={handleSaveLog}
          disabled={isSaving || !logEntry.trim()}
          className="w-full h-12 text-base font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Extracting insights...
            </>
          ) : (
            'Save Log'
          )}
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Recent Activity</h3>
        <div className="space-y-2">
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity yet.</p>
          ) : entries.map((entry) => (
            <Card key={entry.id} className="border-border">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardDescription className="text-xs">{entry.timeLabel}</CardDescription>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setPendingLogDeletion(entry)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-sm font-medium leading-relaxed">
                  {entry.entry}
                </CardTitle>

                {hasAnyAppliedProfileUpdates(entry) ? (
                  <div className="space-y-2 pt-2">
                    {entry.appliedProfileUpdates?.milestones.length ? (
                      <div className="flex flex-wrap gap-2">
                        {entry.appliedProfileUpdates.milestones.map((milestone) => (
                          <Badge key={`${entry.id}-milestone-${milestone}`} variant="secondary">
                            Milestone: {milestone}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    {entry.appliedProfileUpdates?.activeSchemas.length ? (
                      <div className="flex flex-wrap gap-2">
                        {entry.appliedProfileUpdates.activeSchemas.map((schema) => (
                          <Badge key={`${entry.id}-schema-${schema}`} variant="outline">
                            Schema: {schema}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    {entry.appliedProfileUpdates?.interests.length ? (
                      <div className="flex flex-wrap gap-2">
                        {entry.appliedProfileUpdates.interests.map((interest) => (
                          <Badge key={`${entry.id}-interest-${interest}`} variant="outline">
                            Interest: {interest}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardHeader>
            </Card>
          ))}

          {!isLoading && entries.length > 0 && nextCursor ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void handleLoadMoreLogs()
              }}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                'Load more'
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={candidateReviewOpen} onOpenChange={setCandidateReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review profile suggestions</DialogTitle>
            <DialogDescription>
              Sprout found potential profile updates from your latest log. Remove
              anything you do not want before accepting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Milestones</h4>
              {pendingCandidates?.milestones.length ? (
                <div className="space-y-2">
                  {pendingCandidates.milestones.map((candidate) => (
                    <div
                      key={`milestone-${candidate.value}`}
                      className="border rounded-md p-2 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{candidate.value}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCandidate('milestones', candidate.value)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{candidate.reason}</p>
                      <Badge variant="outline" className="text-xs">
                        Confidence: {Math.round(candidate.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No milestone suggestions.</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active Schemas</h4>
              {pendingCandidates?.activeSchemas.length ? (
                <div className="space-y-2">
                  {pendingCandidates.activeSchemas.map((candidate) => (
                    <div
                      key={`schema-${candidate.value}`}
                      className="border rounded-md p-2 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{candidate.value}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            removeCandidate('activeSchemas', candidate.value)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{candidate.reason}</p>
                      <Badge variant="outline" className="text-xs">
                        Confidence: {Math.round(candidate.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No schema suggestions.</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Interests</h4>
              {pendingCandidates?.interests.length ? (
                <div className="space-y-2">
                  {pendingCandidates.interests.map((candidate) => (
                    <div
                      key={`interest-${candidate.value}`}
                      className="border rounded-md p-2 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{candidate.value}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCandidate('interests', candidate.value)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{candidate.reason}</p>
                      <Badge variant="outline" className="text-xs">
                        Confidence: {Math.round(candidate.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No interest suggestions.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipCandidates}
              disabled={isApplyingProfileUpdates}
            >
              Skip for now
            </Button>
            <Button
              type="button"
              onClick={handleAcceptCandidates}
              disabled={isApplyingProfileUpdates}
            >
              {isApplyingProfileUpdates ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying changes...
                </>
              ) : (
                'Accept changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingLogDeletion)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLogDeletion(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action removes the selected daily log entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDeleteLog()
              }}
              disabled={isDeletingLog}
            >
              {isDeletingLog ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
