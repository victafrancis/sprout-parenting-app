import { getDailyLogRepository, getProfileRepository } from '@/lib/server/repositories'
import type {
  AcceptDailyLogCandidatesInput,
  AcceptDailyLogCandidatesResponse,
  AppliedProfileUpdates,
  DailyLogExtractionResult,
  PlanReference,
} from '@/lib/types/domain'

function normalizeTextValue(value: string) {
  return value.trim().toLowerCase()
}

function findTrulyNewValues(existingValues: string[], selectedValues: string[]) {
  const normalizedExistingValues = new Set(existingValues.map(normalizeTextValue))

  return selectedValues.filter((selectedValue) => {
    const normalizedSelectedValue = normalizeTextValue(selectedValue)
    if (!normalizedSelectedValue) {
      return false
    }

    if (normalizedExistingValues.has(normalizedSelectedValue)) {
      return false
    }

    normalizedExistingValues.add(normalizedSelectedValue)
    return true
  })
}

export async function listDailyLogsService(input: {
  childId: string
  limit: number
  cursor?: string
  useDemoMode?: boolean
}) {
  const repository = getDailyLogRepository(Boolean(input.useDemoMode))
  return repository.listDailyLogs({
    childId: input.childId,
    limit: input.limit,
    cursor: input.cursor,
  })
}

export async function createDailyLogService(input: {
  childId: string
  rawText: string
  planReference?: PlanReference
  extractionResult?: DailyLogExtractionResult
  useDemoMode?: boolean
}) {
  const repository = getDailyLogRepository(Boolean(input.useDemoMode))
  return repository.createDailyLog({
    childId: input.childId,
    rawText: input.rawText,
    planReference: input.planReference,
    extractionResult: input.extractionResult,
  })
}

export async function updateDailyLogNoteService(input: {
  childId: string
  storageKey: string
  rawText: string
  useDemoMode?: boolean
}) {
  const repository = getDailyLogRepository(Boolean(input.useDemoMode))
  return repository.updateDailyLogNote({
    childId: input.childId,
    storageKey: input.storageKey,
    rawText: input.rawText,
  })
}

export async function acceptDailyLogCandidatesService(input: {
  childId: string
  storageKey: string
  milestones: string[]
  activeSchemas: string[]
  interests: string[]
  useDemoMode?: boolean
}): Promise<AcceptDailyLogCandidatesResponse> {
  const normalizedInput: AcceptDailyLogCandidatesInput = {
    childId: input.childId,
    storageKey: input.storageKey,
    milestones: input.milestones,
    activeSchemas: input.activeSchemas,
    interests: input.interests,
  }

  const profileRepository = getProfileRepository(Boolean(input.useDemoMode))
  const dailyLogRepository = getDailyLogRepository(Boolean(input.useDemoMode))

  const currentProfile = await profileRepository.getProfile(normalizedInput.childId)

  const appliedProfileUpdates: AppliedProfileUpdates = {
    milestones: findTrulyNewValues(
      currentProfile?.milestones ?? [],
      normalizedInput.milestones,
    ),
    activeSchemas: findTrulyNewValues(
      currentProfile?.activeSchemas ?? [],
      normalizedInput.activeSchemas,
    ),
    interests: findTrulyNewValues(
      currentProfile?.interests ?? [],
      normalizedInput.interests,
    ),
  }

  const updatedProfile = await profileRepository.updateProfileWithCandidates({
    childId: normalizedInput.childId,
    milestones: normalizedInput.milestones,
    activeSchemas: normalizedInput.activeSchemas,
    interests: normalizedInput.interests,
  })

  await dailyLogRepository.saveAppliedProfileUpdates({
    childId: normalizedInput.childId,
    storageKey: normalizedInput.storageKey,
    appliedProfileUpdates,
  })

  return {
    updatedProfile,
    appliedProfileUpdates,
  }
}

export async function deleteDailyLogService(input: {
  childId: string
  storageKey: string
  useDemoMode?: boolean
}) {
  const repository = getDailyLogRepository(Boolean(input.useDemoMode))
  return repository.deleteDailyLog({
    childId: input.childId,
    storageKey: input.storageKey,
  })
}
