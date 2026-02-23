'use client'

import { Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type DailyLogComposerProps = {
  logEntryText: string
  isSaving: boolean
  onLogEntryTextChange: (nextText: string) => void
  onSaveLog: () => void
}

export function DailyLogComposer({
  logEntryText,
  isSaving,
  onLogEntryTextChange,
  onSaveLog,
}: DailyLogComposerProps) {
  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Brain-dump today's events, milestones, or struggles..."
        className="min-h-[240px] text-base resize-none"
        value={logEntryText}
        onChange={(event) => onLogEntryTextChange(event.target.value)}
      />

      <Button
        onClick={onSaveLog}
        disabled={isSaving || !logEntryText.trim()}
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
  )
}