import { isAwsMode } from '@/lib/server/config'
import { AwsDailyLogRepository } from '@/lib/server/repositories/aws/daily-log.repo'
import { AwsProfileRepository } from '@/lib/server/repositories/aws/profile.repo'
import { AwsWeeklyPlanRepository } from '@/lib/server/repositories/aws/weekly-plan.repo'
import { MockDailyLogRepository } from '@/lib/server/repositories/mock/daily-log.repo'
import { MockProfileRepository } from '@/lib/server/repositories/mock/profile.repo'
import { MockWeeklyPlanRepository } from '@/lib/server/repositories/mock/weekly-plan.repo'
import type {
  DailyLogRepository,
  ProfileRepository,
  WeeklyPlanRepository,
} from '@/lib/server/repositories/types'

export function getProfileRepository(useDemoMode = false): ProfileRepository {
  if (!useDemoMode && isAwsMode) {
    return new AwsProfileRepository()
  }
  return new MockProfileRepository()
}

export function getDailyLogRepository(useDemoMode = false): DailyLogRepository {
  if (!useDemoMode && isAwsMode) {
    return new AwsDailyLogRepository()
  }
  return new MockDailyLogRepository()
}

export function getWeeklyPlanRepository(useDemoMode = false): WeeklyPlanRepository {
  if (!useDemoMode && isAwsMode) {
    return new AwsWeeklyPlanRepository()
  }
  return new MockWeeklyPlanRepository()
}
