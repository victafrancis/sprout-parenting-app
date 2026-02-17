import { getWeeklyPlanRepository } from '@/lib/server/repositories'

export async function getWeeklyPlanService(input: {
  childId: string
  objectKey?: string
  useDemoMode?: boolean
}) {
  const repository = getWeeklyPlanRepository(Boolean(input.useDemoMode))
  return repository.getWeeklyPlanMarkdown({
    childId: input.childId,
    objectKey: input.objectKey,
  })
}
