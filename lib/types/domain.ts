export type ChildProfile = {
  name: string
  birthDate: string
  ageMonths: number
  milestones: string[]
  activeSchemas: string[]
  interests: string[]
}

export type ProfileCandidateItem = {
  value: string
  reason: string
  confidence: number
}

export type ProfileUpdateCandidates = {
  milestones: ProfileCandidateItem[]
  activeSchemas: ProfileCandidateItem[]
  interests: ProfileCandidateItem[]
}

export type DailyLogStructuredInsights = {
  keyTakeaways: string[]
  sentiment: string
}

export type PlanReference = {
  planObjectKey?: string | null
  sectionId: string
  sectionTitle: string
  subsectionId?: string
  subsectionTitle?: string
  activityIndex?: number
  activityTitle?: string
  referenceLabel: string
  referenceContentMarkdown?: string
  referenceSnippet?: string
}

export type DailyLogExtractionResult = {
  structuredLog: DailyLogStructuredInsights
  profileCandidates: ProfileUpdateCandidates
  model: string
  source: 'openrouter' | 'fallback'
}

export type DailyLogEntry = {
  id: string
  timeLabel: string
  entry: string
  createdAt?: string
  storageKey?: string
  planReference?: PlanReference
  appliedProfileUpdates?: AppliedProfileUpdates
}

export type AppliedProfileUpdates = {
  milestones: string[]
  activeSchemas: string[]
  interests: string[]
}

export type CreateDailyLogInput = {
  childId: string
  rawText: string
  planReference?: PlanReference
  extractionResult?: DailyLogExtractionResult
}

export type CreateDailyLogResponse = {
  log: DailyLogEntry
  profileCandidates: ProfileUpdateCandidates
  extractionSource: 'openrouter' | 'fallback'
}

export type UpdateProfileCandidatesInput = {
  childId: string
  milestones: string[]
  activeSchemas: string[]
  interests: string[]
}

export type AcceptDailyLogCandidatesInput = {
  childId: string
  storageKey: string
  milestones: string[]
  activeSchemas: string[]
  interests: string[]
}

export type AcceptDailyLogCandidatesResponse = {
  updatedProfile: ChildProfile
  appliedProfileUpdates: AppliedProfileUpdates
}

export type RemovableProfileField =
  | 'milestones'
  | 'activeSchemas'
  | 'interests'

export type RemoveProfileValueInput = {
  childId: string
  field: RemovableProfileField
  value: string
}

export type WeeklyPlanMarkdownPayload = {
  childId: string
  selectedObjectKey: string | null
  availablePlans: WeeklyPlanListItem[]
  markdown: string
  planJob: WeeklyPlanJob
  source: 'mock' | 's3'
}

export type WeeklyPlanJobStatus = 'idle' | 'in_progress' | 'completed' | 'failed'

export type WeeklyPlanJob = {
  childId: string
  status: WeeklyPlanJobStatus
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  outputObjectKey: string | null
  errorMessage: string | null
}

export type WeeklyPlanListItem = {
  objectKey: string
  displayName: string
  lastModified: string | null
}

export type AuthMode = 'authenticated' | 'demo' | 'unauthenticated'

export type AuthStatusResponse = {
  mode: AuthMode
  isAuthenticated: boolean
  isDemo: boolean
}
