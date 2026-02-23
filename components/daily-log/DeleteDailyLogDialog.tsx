'use client'

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

type DeleteDailyLogDialogProps = {
  isOpen: boolean
  isDeletingLog: boolean
  onOpenChange: (nextOpen: boolean) => void
  onConfirmDelete: () => void
}

export function DeleteDailyLogDialog({
  isOpen,
  isDeletingLog,
  onOpenChange,
  onConfirmDelete,
}: DeleteDailyLogDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
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
              onConfirmDelete()
            }}
            disabled={isDeletingLog}
          >
            {isDeletingLog ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}