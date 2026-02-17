import { getProfileRepository } from '@/lib/server/repositories'

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
