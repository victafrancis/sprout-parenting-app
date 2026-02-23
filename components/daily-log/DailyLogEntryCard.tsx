'use client'

import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyLogEntry } from '@/lib/types/domain'
import {
  getPlanReferenceSummary,
  hasAnyAppliedProfileUpdates,
} from '@/components/daily-log/daily-log-utils'

type DailyLogEntryCardProps = {
  entry: DailyLogEntry
  onRequestDelete: (entry: DailyLogEntry) => void
}

export function DailyLogEntryCard({
  entry,
  onRequestDelete,
}: DailyLogEntryCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="text-xs">{entry.timeLabel}</CardDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              onRequestDelete(entry)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-sm font-medium leading-relaxed">{entry.entry}</CardTitle>

        {entry.planReference ? (
          <div className="pt-2">
            <Badge variant="outline" className="text-xs">
              Plan reference: {getPlanReferenceSummary(entry)}
            </Badge>
          </div>
        ) : null}

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
  )
}