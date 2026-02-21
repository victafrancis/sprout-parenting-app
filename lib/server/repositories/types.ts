import type {
  AppliedProfileUpdates,
  ChildProfile,
  CreateDailyLogInput,
  DailyLogEntry,
  RemoveProfileValueInput,
  UpdateProfileCandidatesInput,
  WeeklyPlanMarkdownPayload,
} from '@/lib/types/domain'

export interface ProfileRepository {
  getProfile(childId: string): Promise<ChildProfile | null>
  updateProfileWithCandidates(input: UpdateProfileCandidatesInput): Promise<ChildProfile>
  removeProfileValue(input: RemoveProfileValueInput): Promise<ChildProfile>
}

export interface DailyLogRepository {
  listDailyLogs(input: {
    childId: string
    limit: number
    cursor?: string
  }): Promise<{ items: DailyLogEntry[]; nextCursor?: string | null }>
  createDailyLog(input: CreateDailyLogInput): Promise<DailyLogEntry>
  saveAppliedProfileUpdates(input: {
    childId: string
    storageKey: string
    appliedProfileUpdates: AppliedProfileUpdates
  }): Promise<void>
  deleteDailyLog(input: { childId: string; storageKey: string }): Promise<void>
}

export interface WeeklyPlanRepository {
  getWeeklyPlanMarkdown(input: { childId: string; objectKey?: string }): Promise<WeeklyPlanMarkdownPayload>
}
