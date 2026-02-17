'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getWeeklyPlan } from '@/lib/api/client'
import ReactMarkdown from 'react-markdown'
import type { WeeklyPlanListItem } from '@/lib/types/domain'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const markdownComponents = {
  h1: ({ node, ...props }: any) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-2xl font-bold mt-8 mb-4" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-xl font-semibold mt-6 mb-3" {...props} />,
  p: ({ node, ...props }: any) => <p className="text-foreground mb-3 leading-relaxed" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />,
  li: ({ node, ...props }: any) => <li className="text-muted-foreground" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4" {...props} />
  ),
}

export function WeeklyPlan() {
  const [content, setContent] = useState('')
  const [availablePlans, setAvailablePlans] = useState<WeeklyPlanListItem[]>([])
  const [selectedObjectKey, setSelectedObjectKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadWeeklyPlan() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getWeeklyPlan({ childId: 'Yumi' })

        if (isMounted) {
          setAvailablePlans(result.availablePlans)
          setSelectedObjectKey(result.selectedObjectKey)
          setContent(result.markdown)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load weekly plan')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadWeeklyPlan()

    return () => {
      isMounted = false
    }
  }, [])

  async function handlePlanChange(nextObjectKey: string) {
    try {
      setIsLoading(true)
      setError(null)

      const result = await getWeeklyPlan({
        childId: 'Yumi',
        objectKey: nextObjectKey,
      })

      setAvailablePlans(result.availablePlans)
      setSelectedObjectKey(result.selectedObjectKey)
      setContent(result.markdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekly plan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      {!error && availablePlans.length > 0 ? (
        <div className="mb-4">
          <Select
            value={selectedObjectKey || undefined}
            onValueChange={(value) => {
              void handlePlanChange(value)
            }}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a weekly plan" />
            </SelectTrigger>
            <SelectContent>
              {availablePlans.map((plan) => (
                <SelectItem key={plan.objectKey} value={plan.objectKey}>
                  {plan.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!isLoading && error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && availablePlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weekly plans generated yet.</p>
      ) : null}

      <div className="prose prose-sm prose-stone dark:prose-invert max-w-none mt-4">
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
