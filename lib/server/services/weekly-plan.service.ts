import { getWeeklyPlanRepository } from '@/lib/server/repositories'

function getCurrentWeekIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export async function getWeeklyPlanService(input: {
  childId: string
  week?: string
  useDemoMode?: boolean
}) {
  const repository = getWeeklyPlanRepository(Boolean(input.useDemoMode))
  return repository.getWeeklyPlanMarkdown({
    childId: input.childId,
    week: input.week || getCurrentWeekIsoDate(),
  })
}
