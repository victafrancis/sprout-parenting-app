'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type EditDailyLogDialogProps = {
  isOpen: boolean
  noteText: string
  errorMessage: string | null
  isSaving: boolean
  onOpenChange: (nextOpen: boolean) => void
  onNoteTextChange: (nextText: string) => void
  onCancel: () => void
  onSave: () => void
}

export function EditDailyLogDialog({
  isOpen,
  noteText,
  errorMessage,
  isSaving,
  onOpenChange,
  onNoteTextChange,
  onCancel,
  onSave,
}: EditDailyLogDialogProps) {
  const isSaveDisabled = isSaving || noteText.trim().length === 0

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 w-[calc(100%-1rem)] translate-y-0 max-h-[calc(100dvh-2rem)] overflow-y-auto sm:top-[50%] sm:w-full sm:translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>Edit log note</DialogTitle>
          <DialogDescription>
            Update this note text only. Profile suggestions will not be recalculated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={noteText}
            onChange={(event) => {
              onNoteTextChange(event.target.value)
            }}
            className="min-h-[180px]"
            placeholder="Edit your daily log note"
          />

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaveDisabled}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
