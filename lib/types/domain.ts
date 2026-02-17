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
}

export type CreateDailyLogInput = {
  childId: string
  rawText: string
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

export type WeeklyPlanMarkdownPayload = {
  childId: string
  week: string
  markdown: string
  source: 'mock' | 's3'
}
