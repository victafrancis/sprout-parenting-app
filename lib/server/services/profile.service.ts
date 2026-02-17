import { getProfileRepository } from '@/lib/server/repositories'
import type { RemovableProfileField } from '@/lib/types/domain'

export async function getProfileService(input: {
  childId: string
  useDemoMode?: boolean
}) {
  const repository = getProfileRepository(Boolean(input.useDemoMode))
  return repository.getProfile(input.childId)
}

export async function updateProfileWithCandidatesService(input: {
  childId: string
  milestones: string[]
  activeSchemas: string[]
  interests: string[]
  useDemoMode?: boolean
}) {
  const repository = getProfileRepository(Boolean(input.useDemoMode))
  return repository.updateProfileWithCandidates({
    childId: input.childId,
    milestones: input.milestones,
    activeSchemas: input.activeSchemas,
    interests: input.interests,
  })
}

export async function removeProfileValueService(input: {
  childId: string
  field: RemovableProfileField
  value: string
  useDemoMode?: boolean
}) {
  const repository = getProfileRepository(Boolean(input.useDemoMode))
  return repository.removeProfileValue({
    childId: input.childId,
    field: input.field,
    value: input.value,
  })
}
