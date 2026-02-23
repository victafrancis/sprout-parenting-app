'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProfileUpdateCandidates } from '@/lib/types/domain'
import type { CandidateGroupKey } from '@/components/daily-log/daily-log-utils'

type ProfileCandidateReviewDialogProps = {
  isOpen: boolean
  pendingCandidates: ProfileUpdateCandidates | null
  isApplyingProfileUpdates: boolean
  onOpenChange: (nextOpen: boolean) => void
  onRemoveCandidate: (groupKey: CandidateGroupKey, value: string) => void
  onSkipCandidates: () => void
  onAcceptCandidates: () => void
}

export function ProfileCandidateReviewDialog({
  isOpen,
  pendingCandidates,
  isApplyingProfileUpdates,
  onOpenChange,
  onRemoveCandidate,
  onSkipCandidates,
  onAcceptCandidates,
}: ProfileCandidateReviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                        onClick={() => onRemoveCandidate('milestones', candidate.value)}
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
                        onClick={() => onRemoveCandidate('activeSchemas', candidate.value)}
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
                        onClick={() => onRemoveCandidate('interests', candidate.value)}
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
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onSkipCandidates}
              disabled={isApplyingProfileUpdates}
            >
              Skip for now
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={onAcceptCandidates}
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}