'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  acceptDailyLogCandidates,
  createDailyLog,
  deleteDailyLog,
  getDailyLogs,
  getProfile,
} from '@/lib/api/client'
import type { DailyLogEntry, ProfileUpdateCandidates } from '@/lib/types/domain'
import { DailyLogComposer } from '@/components/daily-log/DailyLogComposer'
import { DailyLogEntryCard } from '@/components/daily-log/DailyLogEntryCard'
import { ProfileCandidateReviewDialog } from '@/components/daily-log/ProfileCandidateReviewDialog'
import { DeleteDailyLogDialog } from '@/components/daily-log/DeleteDailyLogDialog'
import { LogSavedConfirmationDialog } from '@/components/daily-log/LogSavedConfirmationDialog'
import {
  hasAnyCandidates,
  type CandidateGroupKey,
} from '@/components/daily-log/daily-log-utils'

const DAILY_LOG_PAGE_SIZE = 5
const DAILY_LOG_DRAFT_STORAGE_KEY = 'sprout-daily-log-draft:Yumi'

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
  const [isLogSavedConfirmationOpen, setIsLogSavedConfirmationOpen] =
    useState(false)

  function loadDraftFromLocalStorage() {
    try {
      const savedDraft = localStorage.getItem(DAILY_LOG_DRAFT_STORAGE_KEY)

      if (savedDraft === null) {
        return ''
      }

      return savedDraft
    } catch {
      return ''
    }
  }

  function saveDraftToLocalStorage(draftText: string) {
    try {
      if (draftText.trim().length === 0) {
        localStorage.removeItem(DAILY_LOG_DRAFT_STORAGE_KEY)
        return
      }

      localStorage.setItem(DAILY_LOG_DRAFT_STORAGE_KEY, draftText)
    } catch {
      // Ignore localStorage failures so the form still works.
    }
  }

  function clearDraftFromLocalStorage() {
    try {
      localStorage.removeItem(DAILY_LOG_DRAFT_STORAGE_KEY)
    } catch {
      // Ignore localStorage failures so the form still works.
    }
  }

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

  useEffect(() => {
    const savedDraft = loadDraftFromLocalStorage()

    if (savedDraft.length > 0) {
      setLogEntry(savedDraft)
    }
  }, [])

  useEffect(() => {
    saveDraftToLocalStorage(logEntry)
  }, [logEntry])

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
      } else {
        setIsLogSavedConfirmationOpen(true)
      }

      setLogEntry('')
      clearDraftFromLocalStorage()
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
      
      <DailyLogComposer
        logEntryText={logEntry}
        isSaving={isSaving}
        onLogEntryTextChange={setLogEntry}
        onSaveLog={() => {
          void handleSaveLog()
        }}
      />

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
            <DailyLogEntryCard
              key={entry.id}
              entry={entry}
              onRequestDelete={setPendingLogDeletion}
            />
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

      <ProfileCandidateReviewDialog
        isOpen={candidateReviewOpen}
        pendingCandidates={pendingCandidates}
        isApplyingProfileUpdates={isApplyingProfileUpdates}
        onOpenChange={setCandidateReviewOpen}
        onRemoveCandidate={removeCandidate}
        onSkipCandidates={handleSkipCandidates}
        onAcceptCandidates={() => {
          void handleAcceptCandidates()
        }}
      />

      <DeleteDailyLogDialog
        isOpen={Boolean(pendingLogDeletion)}
        isDeletingLog={isDeletingLog}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLogDeletion(null)
          }
        }}
        onConfirmDelete={() => {
          void handleConfirmDeleteLog()
        }}
      />

      <LogSavedConfirmationDialog
        isOpen={isLogSavedConfirmationOpen}
        onClose={() => {
          setIsLogSavedConfirmationOpen(false)
        }}
      />
    </div>
  )
}
