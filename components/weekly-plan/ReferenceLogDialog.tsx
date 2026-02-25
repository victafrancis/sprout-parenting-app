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
import { Badge } from '@/components/ui/badge'

type ReferenceLogDialogProps = {
  isOpen: boolean
  previewTitle: string | undefined
  referenceLabel: string | undefined
  entryText: string
  errorMessage: string | null
  isSaving: boolean
  onEntryTextChange: (nextText: string) => void
  onOpenReferencePreview: () => void
  onClose: () => void
  onSave: () => void
}

export function ReferenceLogDialog({
  isOpen,
  previewTitle,
  referenceLabel,
  entryText,
  errorMessage,
  isSaving,
  onEntryTextChange,
  onOpenReferencePreview,
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
        className="top-4 w-[calc(100%-1rem)] translate-y-0 max-h-[calc(100dvh-2rem)] overflow-y-auto sm:top-[50%] sm:w-full sm:translate-y-[-50%]"
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
            <button type="button" onClick={onOpenReferencePreview} className="rounded-md">
              <Badge
                variant="outline"
                className="max-w-full cursor-pointer text-left whitespace-normal hover:bg-muted"
              >
                Plan reference: {referenceLabel || previewTitle || 'No reference selected'}
              </Badge>
            </button>
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
              className="min-h-[140px] max-h-[40dvh]"
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
