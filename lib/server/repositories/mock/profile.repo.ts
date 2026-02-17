import { mockChildProfile } from '@/lib/data/profile'
import type { ProfileRepository } from '@/lib/server/repositories/types'
import type { ChildProfile } from '@/lib/types/domain'
import {
  calculateAgeMonthsFromBirthDate,
  createApproxBirthDateFromAgeMonths,
} from '@/lib/server/utils/profile-age'

const inMemoryProfile = {
  ...mockChildProfile,
}

function mergeUniqueTextValues(existingValues: string[], incomingValues: string[]) {
  const normalizedExistingValues = new Map<string, string>()

  for (const existingValue of existingValues) {
    const normalizedValue = existingValue.trim().toLowerCase()
    if (!normalizedValue) {
      continue
    }

    if (!normalizedExistingValues.has(normalizedValue)) {
      normalizedExistingValues.set(normalizedValue, existingValue)
    }
  }

  for (const incomingValue of incomingValues) {
    const normalizedValue = incomingValue.trim().toLowerCase()
    if (!normalizedValue) {
      continue
    }

    if (!normalizedExistingValues.has(normalizedValue)) {
      normalizedExistingValues.set(normalizedValue, incomingValue.trim())
    }
  }

  return Array.from(normalizedExistingValues.values())
}

export class MockProfileRepository implements ProfileRepository {
  async getProfile(childId: string): Promise<ChildProfile | null> {
    const fallbackBirthDate = createApproxBirthDateFromAgeMonths(0)
    const profileBirthDate = inMemoryProfile.birthDate || fallbackBirthDate

    return {
      ...inMemoryProfile,
      name: inMemoryProfile.name || childId,
      birthDate: profileBirthDate,
      ageMonths: calculateAgeMonthsFromBirthDate(profileBirthDate),
    }
  }

  async updateProfileWithCandidates(input: {
    childId: string
    milestones: string[]
    activeSchemas: string[]
    interests: string[]
  }): Promise<ChildProfile> {
    void input.childId

    inMemoryProfile.milestones = mergeUniqueTextValues(
      inMemoryProfile.milestones,
      input.milestones,
    )

    inMemoryProfile.activeSchemas = mergeUniqueTextValues(
      inMemoryProfile.activeSchemas,
      input.activeSchemas,
    )

    inMemoryProfile.interests = mergeUniqueTextValues(
      inMemoryProfile.interests,
      input.interests,
    )

    return {
      ...inMemoryProfile,
      name: inMemoryProfile.name || input.childId,
      ageMonths: calculateAgeMonthsFromBirthDate(inMemoryProfile.birthDate),
    }
  }
}
