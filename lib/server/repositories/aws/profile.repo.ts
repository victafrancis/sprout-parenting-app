import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDocClient } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { ProfileRepository } from '@/lib/server/repositories/types'
import type { ChildProfile } from '@/lib/types/domain'
import {
  calculateAgeMonthsFromBirthDate,
  createApproxBirthDateFromAgeMonths,
} from '@/lib/server/utils/profile-age'

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

export class AwsProfileRepository implements ProfileRepository {
  async getProfile(childId: string): Promise<ChildProfile | null> {
    const result = await dynamoDocClient.send(
      new GetCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: `USER#${childId}`,
          SK: 'PROFILE',
        },
      }),
    )

    if (!result.Item) {
      return null
    }

    const numericAgeMonths = Number(
      result.Item.age_months ?? result.Item.ageMonths ?? 0,
    )

    const fallbackBirthDate = createApproxBirthDateFromAgeMonths(numericAgeMonths)

    const profileBirthDate =
      typeof result.Item.birth_date === 'string' && result.Item.birth_date
        ? result.Item.birth_date
        : typeof result.Item.birthDate === 'string' && result.Item.birthDate
          ? result.Item.birthDate
          : fallbackBirthDate

    return {
      name: result.Item.name ?? childId,
      birthDate: profileBirthDate,
      ageMonths: calculateAgeMonthsFromBirthDate(profileBirthDate),
      milestones: Array.isArray(result.Item.milestones) ? result.Item.milestones : [],
      activeSchemas: Array.isArray(result.Item.schemas)
        ? result.Item.schemas
        : Array.isArray(result.Item.activeSchemas)
          ? result.Item.activeSchemas
          : [],
      interests: Array.isArray(result.Item.interests) ? result.Item.interests : [],
    }
  }

  async updateProfileWithCandidates(input: {
    childId: string
    milestones: string[]
    activeSchemas: string[]
    interests: string[]
  }): Promise<ChildProfile> {
    const currentProfile = await this.getProfile(input.childId)

    const mergedMilestones = mergeUniqueTextValues(
      currentProfile?.milestones ?? [],
      input.milestones,
    )

    const mergedActiveSchemas = mergeUniqueTextValues(
      currentProfile?.activeSchemas ?? [],
      input.activeSchemas,
    )

    const mergedInterests = mergeUniqueTextValues(
      currentProfile?.interests ?? [],
      input.interests,
    )

    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: `USER#${input.childId}`,
          SK: 'PROFILE',
        },
        UpdateExpression:
          'SET #name = if_not_exists(#name, :defaultName), birth_date = if_not_exists(birth_date, :defaultBirthDate), milestones = :milestones, schemas = :schemas, interests = :interests',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':defaultName': input.childId,
          ':defaultBirthDate':
            currentProfile?.birthDate ?? createApproxBirthDateFromAgeMonths(0),
          ':milestones': mergedMilestones,
          ':schemas': mergedActiveSchemas,
          ':interests': mergedInterests,
        },
      }),
    )

    return {
      name: currentProfile?.name || input.childId,
      birthDate:
        currentProfile?.birthDate ?? createApproxBirthDateFromAgeMonths(0),
      ageMonths: currentProfile?.ageMonths ?? 0,
      milestones: mergedMilestones,
      activeSchemas: mergedActiveSchemas,
      interests: mergedInterests,
    }
  }
}
