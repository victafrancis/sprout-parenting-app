'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  acceptDailyLogCandidates,
  createDailyLog,
  getWeeklyPlan,
} from '@/lib/api/client'
import ReactMarkdown from 'react-markdown'
import type {
  PlanReference,
  ProfileUpdateCandidates,
  WeeklyPlanListItem,
} from '@/lib/types/domain'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ReferenceLogDialog } from '@/components/weekly-plan/ReferenceLogDialog'
import { PlanReferencePreviewDialog } from '@/components/plan-reference/PlanReferencePreviewDialog'
import { ProfileCandidateReviewDialog } from '@/components/daily-log/ProfileCandidateReviewDialog'
import {
  hasAnyCandidates,
  type CandidateGroupKey,
} from '@/components/daily-log/daily-log-utils'

type WeeklyPlanSection = {
  id: string
  title: string
  bodyMarkdown: string
  subsections: WeeklyPlanSubsection[]
}

type WeeklyPlanSubsection = {
  id: string
  title: string
  bodyMarkdown: string
}

type ParsedWeeklyPlan = {
  title: string
  introMarkdown: string
  sections: WeeklyPlanSection[]
}

type PendingReferenceLogContext = {
  previewTitle: string
  planReference: PlanReference
}

function normalizeMarkdownFromLines(lines: string[]) {
  const cleanedLines = [...lines]

  while (cleanedLines.length > 0 && cleanedLines[0].trim() === '') {
    cleanedLines.shift()
  }

  while (
    cleanedLines.length > 0 &&
    cleanedLines[cleanedLines.length - 1].trim() === ''
  ) {
    cleanedLines.pop()
  }

  return cleanedLines.join('\n').trim()
}

function createIdFromTitle(title: string, fallback: string) {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  if (normalizedTitle.length === 0) {
    return fallback
  }

  return normalizedTitle
}

function createUniqueId(baseId: string, usedIds: Set<string>) {
  let candidateId = baseId
  let duplicateCounter = 2

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}-${duplicateCounter}`
    duplicateCounter += 1
  }

  usedIds.add(candidateId)
  return candidateId
}

function parseWeeklyPlanMarkdown(markdown: string): ParsedWeeklyPlan {
  const lines = markdown.split('\n')

  let planTitle = 'Weekly Developmental Plan'
  const introLines: string[] = []
  const sections: WeeklyPlanSection[] = []

  let currentSection: WeeklyPlanSection | null = null
  let currentSubsection: WeeklyPlanSubsection | null = null
  let untitledSectionCount = 0
  const usedSectionIds = new Set<string>()
  const usedSubsectionIdsBySection = new Map<string, Set<string>>()

  function finalizeCurrentSubsection() {
    if (!currentSection || !currentSubsection) {
      return
    }

    const normalizedMarkdown = normalizeMarkdownFromLines(
      currentSubsection.bodyMarkdown.split('\n'),
    )

    currentSection.subsections.push({
      ...currentSubsection,
      bodyMarkdown: normalizedMarkdown,
    })

    currentSubsection = null
  }

  function finalizeCurrentSection() {
    if (!currentSection) {
      return
    }

    finalizeCurrentSubsection()

    const normalizedBodyMarkdown = normalizeMarkdownFromLines(
      currentSection.bodyMarkdown.split('\n'),
    )

    sections.push({
      ...currentSection,
      bodyMarkdown: normalizedBodyMarkdown,
    })

    currentSection = null
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      planTitle = line.replace('# ', '').trim()
      continue
    }

    if (line.startsWith('## ')) {
      finalizeCurrentSection()
      const sectionTitle = line.replace('## ', '').trim()
      const baseSectionId = createIdFromTitle(
        sectionTitle,
        `section-${sections.length + 1}`,
      )
      const uniqueSectionId = createUniqueId(baseSectionId, usedSectionIds)
      currentSection = {
        id: uniqueSectionId,
        title: sectionTitle,
        bodyMarkdown: '',
        subsections: [],
      }
      usedSubsectionIdsBySection.set(uniqueSectionId, new Set<string>())
      continue
    }

    if (line.startsWith('### ')) {
      if (!currentSection) {
        untitledSectionCount += 1
        const untitledBaseId = `untitled-section-${untitledSectionCount}`
        const untitledSectionId = createUniqueId(untitledBaseId, usedSectionIds)
        currentSection = {
          id: untitledSectionId,
          title: `Section ${untitledSectionCount}`,
          bodyMarkdown: '',
          subsections: [],
        }
        usedSubsectionIdsBySection.set(untitledSectionId, new Set<string>())
      }

      finalizeCurrentSubsection()

      const subsectionTitle = line.replace('### ', '').trim()
      const subsectionIdFallback = `${currentSection.id}-subsection-${currentSection.subsections.length + 1}`
      const baseSubsectionId = createIdFromTitle(subsectionTitle, subsectionIdFallback)
      const usedSubsectionIds = usedSubsectionIdsBySection.get(currentSection.id)

      if (!usedSubsectionIds) {
        usedSubsectionIdsBySection.set(currentSection.id, new Set<string>())
      }

      const safeUsedSubsectionIds =
        usedSubsectionIdsBySection.get(currentSection.id) || new Set<string>()

      const uniqueSubsectionId = createUniqueId(
        baseSubsectionId,
        safeUsedSubsectionIds,
      )

      currentSubsection = {
        id: uniqueSubsectionId,
        title: subsectionTitle,
        bodyMarkdown: '',
      }
      continue
    }

    if (currentSubsection) {
      currentSubsection.bodyMarkdown =
        currentSubsection.bodyMarkdown.length === 0
          ? line
          : `${currentSubsection.bodyMarkdown}\n${line}`
      continue
    }

    if (currentSection) {
      currentSection.bodyMarkdown =
        currentSection.bodyMarkdown.length === 0
          ? line
          : `${currentSection.bodyMarkdown}\n${line}`
      continue
    }

    introLines.push(line)
  }

  finalizeCurrentSection()

  return {
    title: planTitle,
    introMarkdown: normalizeMarkdownFromLines(introLines),
    sections,
  }
}

function splitMarkdownIntoActivityBlocks(markdown: string) {
  const lines = markdown.split('\n')
  const activityHeaderRegex = /^\*\*\d+\.\s.+\*\*\s*$/

  const chunks: string[] = []
  let currentChunkLines: string[] = []

  for (const line of lines) {
    if (activityHeaderRegex.test(line)) {
      const existingChunk = normalizeMarkdownFromLines(currentChunkLines)
      if (existingChunk.length > 0) {
        chunks.push(existingChunk)
      }
      currentChunkLines = [line]
      continue
    }

    if (currentChunkLines.length > 0) {
      currentChunkLines.push(line)
    }
  }

  const finalChunk = normalizeMarkdownFromLines(currentChunkLines)
  if (finalChunk.length > 0) {
    chunks.push(finalChunk)
  }

  if (chunks.length <= 1) {
    return []
  }

  return chunks
}

function createReferenceSnippet(markdown: string) {
  const normalizedMarkdown = normalizeMarkdownFromLines(markdown.split('\n'))

  if (normalizedMarkdown.length === 0) {
    return undefined
  }

  if (normalizedMarkdown.length <= 180) {
    return normalizedMarkdown
  }

  return `${normalizedMarkdown.slice(0, 180)}...`
}

function getActivityTitleFromMarkdown(activityMarkdown: string) {
  const activityHeadingMatch = activityMarkdown.match(/\*\*(\d+\.\s.+?)\*\*/)

  if (!activityHeadingMatch) {
    return undefined
  }

  return activityHeadingMatch[1]
}

function getFileNameFromObjectKey(objectKey: string) {
  const keyParts = objectKey.split('/')
  return keyParts[keyParts.length - 1] || objectKey
}

type PlanGeneratedInfo = {
  displayText: string
  isTimestampDate: boolean
}

const PLAN_GENERATED_TIMEZONE = 'America/Toronto'

function getPlanGeneratedOnLabel(plan: WeeklyPlanListItem | undefined) {
  if (!plan) {
    return null
  }

  const fileName =
    plan.displayName && plan.displayName.trim().length > 0
      ? plan.displayName.trim()
      : getFileNameFromObjectKey(plan.objectKey)

  const fileNameWithoutExtension = fileName.replace(/\.md$/i, '')
  const timestampMatch = fileNameWithoutExtension.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2})[-:](\d{2})(?:[-:](\d{2}))?Z)?$/,
  )

  if (!timestampMatch) {
    return null
  }

  const year = Number(timestampMatch[1])
  const month = Number(timestampMatch[2])
  const day = Number(timestampMatch[3])
  const hasTimestampTime = Boolean(timestampMatch[4] && timestampMatch[5])
  const hour = hasTimestampTime ? Number(timestampMatch[4]) : 12
  const minute = hasTimestampTime ? Number(timestampMatch[5]) : 0
  const second = timestampMatch[6] ? Number(timestampMatch[6]) : 0

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    Number.isNaN(second) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null
  }

  const generatedDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second))

  if (Number.isNaN(generatedDate.getTime())) {
    return null
  }

  return {
    displayText: new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: PLAN_GENERATED_TIMEZONE,
      timeZoneName: 'short',
    }).format(generatedDate),
    isTimestampDate: true,
  } satisfies PlanGeneratedInfo
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

export function WeeklyPlan() {
  const [content, setContent] = useState('')
  const [availablePlans, setAvailablePlans] = useState<WeeklyPlanListItem[]>([])
  const [selectedObjectKey, setSelectedObjectKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSectionsById, setCollapsedSectionsById] = useState<
    Record<string, boolean>
  >({})
  const [isReferenceLogDialogOpen, setIsReferenceLogDialogOpen] = useState(false)
  const [pendingReferenceLogContext, setPendingReferenceLogContext] =
    useState<PendingReferenceLogContext | null>(null)
  const [selectedReferenceForPreview, setSelectedReferenceForPreview] =
    useState<PlanReference | null>(null)
  const [referenceLogEntryText, setReferenceLogEntryText] = useState('')
  const [isSavingReferenceLog, setIsSavingReferenceLog] = useState(false)
  const [referenceLogError, setReferenceLogError] = useState<string | null>(null)
  const [pendingCandidates, setPendingCandidates] =
    useState<ProfileUpdateCandidates | null>(null)
  const [pendingCandidateLogStorageKey, setPendingCandidateLogStorageKey] =
    useState<string | null>(null)
  const [isApplyingProfileUpdates, setIsApplyingProfileUpdates] = useState(false)

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

  function handleSkipCandidates() {
    setPendingCandidates(null)
    setPendingCandidateLogStorageKey(null)
  }

  async function handleAcceptCandidates() {
    if (!pendingCandidates) {
      handleSkipCandidates()
      return
    }

    try {
      setIsApplyingProfileUpdates(true)
      setReferenceLogError(null)

      if (!pendingCandidateLogStorageKey) {
        setReferenceLogError('Unable to apply profile updates because the log key is missing.')
        return
      }

      await acceptDailyLogCandidates({
        childId: 'Yumi',
        storageKey: pendingCandidateLogStorageKey,
        selectedCandidates: pendingCandidates,
      })

      handleSkipCandidates()
    } catch (err) {
      setReferenceLogError(
        err instanceof Error ? err.message : 'Failed to apply profile updates',
      )
    } finally {
      setIsApplyingProfileUpdates(false)
    }
  }

  const parsedPlan = useMemo(() => parseWeeklyPlanMarkdown(content), [content])
  const sectionJumpItems = useMemo(() => {
    return parsedPlan.sections.map((section) => ({
      id: section.id,
      title: section.title,
    }))
  }, [parsedPlan.sections])
  const selectedPlan = useMemo(() => {
    if (availablePlans.length === 0) {
      return undefined
    }

    const matchingPlan = availablePlans.find((plan) => {
      return plan.objectKey === selectedObjectKey
    })

    if (matchingPlan) {
      return matchingPlan
    }

    return availablePlans[0]
  }, [availablePlans, selectedObjectKey])
  const planGeneratedOnLabel = useMemo(() => {
    return getPlanGeneratedOnLabel(selectedPlan)
  }, [selectedPlan])

  const allSectionsCollapsed =
    parsedPlan.sections.length > 0 &&
    parsedPlan.sections.every((section) => collapsedSectionsById[section.id])

  const allSectionsExpanded =
    parsedPlan.sections.length > 0 &&
    parsedPlan.sections.every((section) => !collapsedSectionsById[section.id])

  useEffect(() => {
    setCollapsedSectionsById((previousCollapsedSectionsById) => {
      const nextCollapsedSectionsById: Record<string, boolean> = {}

      for (const section of parsedPlan.sections) {
        nextCollapsedSectionsById[section.id] =
          previousCollapsedSectionsById[section.id] ?? false
      }

      return nextCollapsedSectionsById
    })
  }, [parsedPlan.sections])

  function scrollToSection(sectionId: string) {
    const targetSectionElement = document.getElementById(sectionId)

    if (!targetSectionElement) {
      return
    }

    targetSectionElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function setAllSectionsCollapsed(shouldCollapse: boolean) {
    const nextCollapsedSectionsById: Record<string, boolean> = {}

    for (const section of parsedPlan.sections) {
      nextCollapsedSectionsById[section.id] = shouldCollapse
    }

    setCollapsedSectionsById(nextCollapsedSectionsById)
  }

  function updateSingleSectionCollapseState(sectionId: string, shouldCollapse: boolean) {
    setCollapsedSectionsById((previousCollapsedSectionsById) => ({
      ...previousCollapsedSectionsById,
      [sectionId]: shouldCollapse,
    }))
  }

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

  function openReferenceLogDialog(input: PendingReferenceLogContext) {
    setReferenceLogError(null)
    setReferenceLogEntryText('')
    setPendingReferenceLogContext(input)
    setIsReferenceLogDialogOpen(true)
  }

  function closeReferenceLogDialog() {
    setIsReferenceLogDialogOpen(false)
    setPendingReferenceLogContext(null)
    setReferenceLogEntryText('')
    setReferenceLogError(null)
  }

  function openReferencePreviewFromLogDialog() {
    if (!pendingReferenceLogContext) {
      return
    }

    setSelectedReferenceForPreview(pendingReferenceLogContext.planReference)
  }

  function closeReferencePreview() {
    setSelectedReferenceForPreview(null)
  }

  async function handleSaveReferencedLog() {
    if (!pendingReferenceLogContext) {
      return
    }

    const normalizedReferenceLogEntryText = referenceLogEntryText.trim()

    if (!normalizedReferenceLogEntryText) {
      setReferenceLogError('Please write a quick note before saving.')
      return
    }

    try {
      setIsSavingReferenceLog(true)
      setReferenceLogError(null)

      const createdLogResponse = await createDailyLog({
        childId: 'Yumi',
        rawText: normalizedReferenceLogEntryText,
        planReference: pendingReferenceLogContext.planReference,
      })

      toast.success('Daily log added', {
        duration: 2800,
        className:
          '!bg-emerald-700 !text-white !border-emerald-800 dark:!bg-emerald-600 dark:!border-emerald-500 dark:!text-white',
      })

      if (hasAnyCandidates(createdLogResponse.profileCandidates)) {
        setPendingCandidates(createdLogResponse.profileCandidates)
        setPendingCandidateLogStorageKey(createdLogResponse.log.storageKey ?? null)
      }

      closeReferenceLogDialog()
    } catch (err) {
      setReferenceLogError(err instanceof Error ? err.message : 'Failed to save referenced log')
    } finally {
      setIsSavingReferenceLog(false)
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

          {planGeneratedOnLabel ? (
            <p className="mt-2 text-sm font-medium text-foreground" role="note">
              {`Plan Generated On: ${planGeneratedOnLabel.displayText}`}
            </p>
          ) : null}
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

      {!isLoading && !error && content.trim().length > 0 ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-4">
            {sectionJumpItems.length > 2 ? (
              <Card className="border-dashed bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Jump to section</CardTitle>
                  <CardDescription>
                    Quick navigation for longer weekly plans.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sectionJumpItems.map((jumpItem) => (
                      <Button
                        key={jumpItem.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          scrollToSection(jumpItem.id)
                        }}
                      >
                        {jumpItem.title}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {parsedPlan.sections.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAllSectionsCollapsed(false)
                  }}
                  disabled={allSectionsExpanded}
                >
                  Expand all sections
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAllSectionsCollapsed(true)
                  }}
                  disabled={allSectionsCollapsed}
                >
                  Collapse all sections
                </Button>
              </div>
            ) : null}

            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-3">
                <CardDescription>Weekly plan overview</CardDescription>
                <CardTitle className="text-2xl">{parsedPlan.title}</CardTitle>
              </CardHeader>
              {parsedPlan.introMarkdown.length > 0 ? (
                <CardContent>
                  <ReactMarkdown components={markdownComponents}>
                    {parsedPlan.introMarkdown}
                  </ReactMarkdown>
                </CardContent>
              ) : null}
            </Card>

            {parsedPlan.sections.map((section) => {
              const isSectionCollapsed = collapsedSectionsById[section.id] ?? false

              return (
                <Collapsible
                  key={section.id}
                  open={!isSectionCollapsed}
                  onOpenChange={(isOpen) => {
                    updateSingleSectionCollapseState(section.id, !isOpen)
                  }}
                >
                  <Card id={section.id}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Log note for ${section.title}`}
                          onClick={() => {
                            openReferenceLogDialog({
                              previewTitle: section.title,
                              planReference: {
                                planObjectKey: selectedObjectKey,
                                sectionId: section.id,
                                sectionTitle: section.title,
                                referenceLabel: section.title,
                                referenceContentMarkdown: section.bodyMarkdown,
                                referenceSnippet: createReferenceSnippet(section.bodyMarkdown),
                              },
                            })
                          }}
                        >
                          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                        </Button>

                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-expanded={!isSectionCollapsed}
                            aria-label={
                              isSectionCollapsed
                                ? `Expand ${section.title}`
                                : `Collapse ${section.title}`
                            }
                          >
                            {isSectionCollapsed ? (
                              <>
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                <span>Expand</span>
                              </>
                            ) : (
                              <>
                                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                <span>Collapse</span>
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        {section.bodyMarkdown.length > 0 ? (
                          <ReactMarkdown components={markdownComponents}>
                            {section.bodyMarkdown}
                          </ReactMarkdown>
                        ) : null}

                        {section.subsections.map((subsection) => {
                          const activityBlocks = splitMarkdownIntoActivityBlocks(
                            subsection.bodyMarkdown,
                          )

                          if (activityBlocks.length > 0) {
                            return (
                              <div
                                key={subsection.id}
                                className="space-y-3 rounded-md border border-border bg-muted/30 p-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {subsection.title}
                                  </h3>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Log note for ${subsection.title}`}
                                    onClick={() => {
                                      openReferenceLogDialog({
                                        previewTitle: `${section.title} > ${subsection.title}`,
                                        planReference: {
                                          planObjectKey: selectedObjectKey,
                                          sectionId: section.id,
                                          sectionTitle: section.title,
                                          subsectionId: subsection.id,
                                          subsectionTitle: subsection.title,
                                          referenceLabel: `${section.title} > ${subsection.title}`,
                                          referenceContentMarkdown:
                                            subsection.bodyMarkdown,
                                          referenceSnippet: createReferenceSnippet(
                                            subsection.bodyMarkdown,
                                          ),
                                        },
                                      })
                                    }}
                                  >
                                    <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {activityBlocks.map((activityMarkdown, index) => {
                                    const activityTitle = getActivityTitleFromMarkdown(
                                      activityMarkdown,
                                    )

                                    return (
                                      <Card key={`${subsection.id}-activity-${index + 1}`}>
                                        <CardHeader className="pb-2">
                                          <div className="flex items-center justify-between gap-2">
                                            <Badge variant="secondary" className="w-fit">
                                              Activity {index + 1}
                                            </Badge>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              aria-label={`Log note for ${subsection.title} activity ${index + 1}`}
                                              onClick={() => {
                                                openReferenceLogDialog({
                                                  previewTitle: `${section.title} > ${subsection.title} > Activity ${index + 1}`,
                                                  planReference: {
                                                    planObjectKey: selectedObjectKey,
                                                    sectionId: section.id,
                                                    sectionTitle: section.title,
                                                    subsectionId: subsection.id,
                                                    subsectionTitle: subsection.title,
                                                    activityIndex: index + 1,
                                                    activityTitle,
                                                    referenceLabel: `${section.title} > ${subsection.title} > Activity ${index + 1}`,
                                                    referenceContentMarkdown:
                                                      activityMarkdown,
                                                    referenceSnippet: createReferenceSnippet(
                                                      activityMarkdown,
                                                    ),
                                                  },
                                                })
                                              }}
                                            >
                                              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                          </div>
                                        </CardHeader>
                                        <CardContent>
                                          <ReactMarkdown components={markdownComponents}>
                                            {activityMarkdown}
                                          </ReactMarkdown>
                                        </CardContent>
                                      </Card>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <Card key={subsection.id} className="bg-muted/20">
                              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                                <CardTitle className="text-lg">{subsection.title}</CardTitle>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Log note for ${subsection.title}`}
                                  onClick={() => {
                                    openReferenceLogDialog({
                                      previewTitle: `${section.title} > ${subsection.title}`,
                                      planReference: {
                                        planObjectKey: selectedObjectKey,
                                        sectionId: section.id,
                                        sectionTitle: section.title,
                                        subsectionId: subsection.id,
                                        subsectionTitle: subsection.title,
                                        referenceLabel: `${section.title} > ${subsection.title}`,
                                        referenceContentMarkdown:
                                          subsection.bodyMarkdown,
                                        referenceSnippet: createReferenceSnippet(
                                          subsection.bodyMarkdown,
                                        ),
                                      },
                                    })
                                  }}
                                >
                                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </CardHeader>
                              {subsection.bodyMarkdown.length > 0 ? (
                                <CardContent>
                                  <ReactMarkdown components={markdownComponents}>
                                    {subsection.bodyMarkdown}
                                  </ReactMarkdown>
                                </CardContent>
                              ) : null}
                            </Card>
                          )
                        })}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        </div>
      ) : null}

      <ReferenceLogDialog
        isOpen={isReferenceLogDialogOpen}
        previewTitle={pendingReferenceLogContext?.previewTitle}
        referenceLabel={pendingReferenceLogContext?.planReference.referenceLabel}
        entryText={referenceLogEntryText}
        errorMessage={referenceLogError}
        isSaving={isSavingReferenceLog}
        onEntryTextChange={(nextText) => {
          setReferenceLogError(null)
          setReferenceLogEntryText(nextText)
        }}
        onOpenReferencePreview={openReferencePreviewFromLogDialog}
        onClose={closeReferenceLogDialog}
        onSave={() => {
          void handleSaveReferencedLog()
        }}
      />

      <PlanReferencePreviewDialog
        isOpen={Boolean(selectedReferenceForPreview)}
        planReference={selectedReferenceForPreview}
        onClose={closeReferencePreview}
      />

      <ProfileCandidateReviewDialog
        isOpen={Boolean(pendingCandidates)}
        pendingCandidates={pendingCandidates}
        isApplyingProfileUpdates={isApplyingProfileUpdates}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleSkipCandidates()
          }
        }}
        onRemoveCandidate={removeCandidate}
        onSkipCandidates={handleSkipCandidates}
        onAcceptCandidates={() => {
          void handleAcceptCandidates()
        }}
      />
    </div>
  )
}
