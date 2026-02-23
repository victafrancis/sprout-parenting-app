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

type ReferenceLogDialogProps = {
  isOpen: boolean
  previewTitle: string | undefined
  entryText: string
  errorMessage: string | null
  isSaving: boolean
  onEntryTextChange: (nextText: string) => void
  onClose: () => void
  onSave: () => void
}

export function ReferenceLogDialog({
  isOpen,
  previewTitle,
  entryText,
  errorMessage,
  isSaving,
  onEntryTextChange,
  onClose,
  onSave,
}: ReferenceLogDialogProps) {
  const isSaveDisabled = isSaving || entryText.trim().length === 0

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isDialogOpen) => {
        if (!isDialogOpen) {
          onClose()
        }
      }}
    >
      <DialogContent
        onInteractOutside={(event) => {
          event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Log note for this plan item</DialogTitle>
          <DialogDescription>
            Save a daily log with a direct reference to the selected plan block.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Referenced plan block
            </p>
            <p className="rounded-md border bg-muted/20 p-2 text-sm text-foreground">
              {previewTitle || 'No reference selected'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your daily log note
            </p>
            <Textarea
              value={entryText}
              onChange={(event) => {
                onEntryTextChange(event.target.value)
              }}
              placeholder="Example: Activity 2 went very well today. She focused for 10 minutes and smiled throughout."
              className="min-h-[140px]"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaveDisabled}>
            {isSaving ? 'Saving...' : 'Save referenced log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}