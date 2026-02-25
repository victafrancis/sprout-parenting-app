import ReactMarkdown from 'react-markdown'
import type { PlanReference } from '@/lib/types/domain'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type PlanReferencePreviewDialogProps = {
  isOpen: boolean
  planReference: PlanReference | null
  onClose: () => void
}

const markdownComponents = {
  h1: ({ node, ...props }: any) => <h1 className="text-3xl font-bold mt-6 mb-3" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
  p: ({ node, ...props }: any) => <p className="text-base text-foreground mb-3 leading-relaxed" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="text-base list-disc list-inside space-y-2 mb-4 ml-4" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="text-base list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />,
  li: ({ node, ...props }: any) => <li className="text-muted-foreground text-base" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4" {...props} />
  ),
}

function getReferenceLabel(planReference: PlanReference | null) {
  if (!planReference) {
    return 'No reference selected'
  }

  if (planReference.referenceLabel && planReference.referenceLabel.trim().length > 0) {
    return planReference.referenceLabel
  }

  if (planReference.subsectionTitle) {
    return `${planReference.sectionTitle} > ${planReference.subsectionTitle}`
  }

  return planReference.sectionTitle
}

export function PlanReferencePreviewDialog({
  isOpen,
  planReference,
  onClose,
}: PlanReferencePreviewDialogProps) {
  const fullReferenceMarkdown = planReference?.referenceContentMarkdown?.trim() || ''
  const referenceSnippet = planReference?.referenceSnippet?.trim() || ''
  const hasFullReferenceMarkdown = fullReferenceMarkdown.length > 0
  const hasReferenceSnippet = referenceSnippet.length > 0

  let previewMarkdown = ''
  if (hasFullReferenceMarkdown) {
    previewMarkdown = fullReferenceMarkdown
  } else if (hasReferenceSnippet) {
    previewMarkdown = referenceSnippet
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isDialogOpen) => {
        if (!isDialogOpen) {
          onClose()
        }
      }}
    >
      <DialogContent className="top-4 w-[calc(100%-1rem)] translate-y-0 max-h-[calc(100dvh-2rem)] overflow-y-auto sm:top-[50%] sm:w-full sm:max-w-2xl sm:translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>Plan reference details</DialogTitle>
          <DialogDescription>
            This is the plan content linked to the reference pill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Referenced plan block
            </p>
            <p className="rounded-md border bg-muted/20 p-2 text-sm text-foreground">
              {getReferenceLabel(planReference)}
            </p>
          </div>

          {!hasFullReferenceMarkdown && hasReferenceSnippet ? (
            <p className="text-xs text-muted-foreground">
              Full reference content is not available for this log. Showing saved snippet instead.
            </p>
          ) : null}

          {previewMarkdown.length > 0 ? (
            <div className="rounded-md border bg-background p-3">
              <ReactMarkdown components={markdownComponents}>{previewMarkdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              No saved reference content is available for this item.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
