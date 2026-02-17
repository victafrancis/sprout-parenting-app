import type {
  ChildProfile,
  CreateDailyLogInput,
  DailyLogEntry,
  UpdateProfileCandidatesInput,
  WeeklyPlanMarkdownPayload,
} from '@/lib/types/domain'

export interface ProfileRepository {
  getProfile(childId: string): Promise<ChildProfile | null>
  updateProfileWithCandidates(input: UpdateProfileCandidatesInput): Promise<ChildProfile>
}

export interface DailyLogRepository {
  listDailyLogs(input: {
    childId: string
    limit: number
    cursor?: string
  }): Promise<{ items: DailyLogEntry[]; nextCursor?: string | null }>
  createDailyLog(input: CreateDailyLogInput): Promise<DailyLogEntry>
}

export interface WeeklyPlanRepository {
  getWeeklyPlanMarkdown(input: {
    childId: string
    week: string
  }): Promise<WeeklyPlanMarkdownPayload>
}
