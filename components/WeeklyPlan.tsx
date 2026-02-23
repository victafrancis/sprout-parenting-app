'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

type WeeklyPlanViewMode = 'document' | 'cards'

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
  const [viewMode, setViewMode] = useState<WeeklyPlanViewMode>('cards')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSectionsById, setCollapsedSectionsById] = useState<
    Record<string, boolean>
  >({})

  const parsedPlan = useMemo(() => parseWeeklyPlanMarkdown(content), [content])
  const sectionJumpItems = useMemo(() => {
    return parsedPlan.sections.map((section) => ({
      id: section.id,
      title: section.title,
    }))
  }, [parsedPlan.sections])

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

      {!isLoading && !error && content.trim().length > 0 ? (
        <div className="mt-4 space-y-4">
          <Tabs
            value={viewMode}
            onValueChange={(value) => {
              setViewMode(value as WeeklyPlanViewMode)
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="document">Document</TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === 'cards' ? (
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
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {subsection.title}
                                  </h3>

                                  <div className="space-y-2">
                                    {activityBlocks.map((activityMarkdown, index) => (
                                      <Card key={`${subsection.id}-activity-${index + 1}`}>
                                        <CardHeader className="pb-2">
                                          <Badge variant="secondary" className="w-fit">
                                            Activity {index + 1}
                                          </Badge>
                                        </CardHeader>
                                        <CardContent>
                                          <ReactMarkdown components={markdownComponents}>
                                            {activityMarkdown}
                                          </ReactMarkdown>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <Card key={subsection.id} className="bg-muted/20">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-lg">{subsection.title}</CardTitle>
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
          ) : null}

          {viewMode === 'document' ? (
            <div className="prose prose-sm prose-stone dark:prose-invert max-w-none mt-1">
              <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
