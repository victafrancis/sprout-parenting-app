import type {
  AppliedProfileUpdates,
  ChildProfile,
  CreateDailyLogInput,
  DailyLogEntry,
  RemoveProfileValueInput,
  UpdateProfileCandidatesInput,
  WeeklyPlanJob,
  WeeklyPlanListItem,
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
  updateDailyLogNote(input: {
    childId: string
    storageKey: string
    rawText: string
  }): Promise<void>
  saveAppliedProfileUpdates(input: {
    childId: string
    storageKey: string
    appliedProfileUpdates: AppliedProfileUpdates
  }): Promise<void>
  deleteDailyLog(input: { childId: string; storageKey: string }): Promise<void>
}

export interface WeeklyPlanRepository {
  getWeeklyPlanMarkdown(input: { childId: string; objectKey?: string }): Promise<WeeklyPlanMarkdownPayload>
  listWeeklyPlans(input: { childId: string }): Promise<WeeklyPlanListItem[]>
  getPlanJob(input: { childId: string }): Promise<WeeklyPlanJob>
  putPlanJobInProgress(input: { childId: string; startedAt: string }): Promise<WeeklyPlanJob>
  putPlanJobCompleted(input: {
    childId: string
    completedAt: string
    outputObjectKey: string | null
  }): Promise<WeeklyPlanJob>
  putPlanJobFailed(input: {
    childId: string
    failedAt: string
    errorMessage: string
  }): Promise<WeeklyPlanJob>
  deleteWeeklyPlanObject(input: { childId: string; objectKey: string }): Promise<void>
}
