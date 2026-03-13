export type ActivityDayKey =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Weekend'

export type WeeklyActivityMenu = {
  days: ActivityDayKey[]
  byDay: Record<ActivityDayKey, string[]>
}

const ACTIVITY_DAY_ORDER: ActivityDayKey[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Weekend',
]

function normalizeMarkdownFromLines(lines: string[]) {
  const normalizedLines = [...lines]

  while (normalizedLines.length > 0 && normalizedLines[0].trim() === '') {
    normalizedLines.shift()
  }

  while (
    normalizedLines.length > 0 &&
    normalizedLines[normalizedLines.length - 1].trim() === ''
  ) {
    normalizedLines.pop()
  }

  return normalizedLines.join('\n').trim()
}

function createEmptyActivityMap(): Record<ActivityDayKey, string[]> {
  return {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Weekend: [],
  }
}

function normalizeDayHeading(headingTitle: string): ActivityDayKey | null {
  const normalizedHeadingTitle = headingTitle.trim().toLowerCase()

  if (normalizedHeadingTitle.startsWith('monday')) {
    return 'Monday'
  }

  if (normalizedHeadingTitle.startsWith('tuesday')) {
    return 'Tuesday'
  }

  if (normalizedHeadingTitle.startsWith('wednesday')) {
    return 'Wednesday'
  }

  if (normalizedHeadingTitle.startsWith('thursday')) {
    return 'Thursday'
  }

  if (normalizedHeadingTitle.startsWith('friday')) {
    return 'Friday'
  }

  if (normalizedHeadingTitle.startsWith('weekend')) {
    return 'Weekend'
  }

  return null
}

function splitDayMarkdownIntoActivities(dayMarkdown: string) {
  const numberedActivityHeaderRegex = /^\*\*\d+\.\s.+\*\*\s*$/
  const lines = dayMarkdown.split('\n')
  const numberedActivities: string[] = []
  let currentActivityLines: string[] = []

  for (const line of lines) {
    const isNewActivityHeader = numberedActivityHeaderRegex.test(line.trim())

    if (isNewActivityHeader) {
      const existingActivity = normalizeMarkdownFromLines(currentActivityLines)
      if (existingActivity.length > 0) {
        numberedActivities.push(existingActivity)
      }
      currentActivityLines = [line]
      continue
    }

    if (currentActivityLines.length > 0) {
      currentActivityLines.push(line)
    }
  }

  const finalActivity = normalizeMarkdownFromLines(currentActivityLines)
  if (finalActivity.length > 0) {
    numberedActivities.push(finalActivity)
  }

  if (numberedActivities.length > 0) {
    return numberedActivities
  }

  const normalizedDayMarkdown = normalizeMarkdownFromLines(lines)
  if (normalizedDayMarkdown.length === 0) {
    return []
  }

  return [normalizedDayMarkdown]
}

export function parseWeeklyActivityMenu(markdown: string): WeeklyActivityMenu {
  const lines = markdown.split('\n')
  const activityMap = createEmptyActivityMap()
  const discoveredDayOrder: ActivityDayKey[] = []

  let menuStarted = false
  let currentDay: ActivityDayKey | null = null
  let currentDayLines: string[] = []

  function commitCurrentDay() {
    if (!currentDay) {
      return
    }

    const currentDayMarkdown = normalizeMarkdownFromLines(currentDayLines)
    if (currentDayMarkdown.length === 0) {
      currentDay = null
      currentDayLines = []
      return
    }

    activityMap[currentDay] = splitDayMarkdownIntoActivities(currentDayMarkdown)
    currentDay = null
    currentDayLines = []
  }

  for (const line of lines) {
    const levelTwoHeadingMatch = line.match(/^##\s+(.+)$/)
    const levelThreeHeadingMatch = line.match(/^###\s+(.+)$/)

    if (!menuStarted) {
      const isActivityMenuHeading = Boolean(
        levelTwoHeadingMatch &&
          levelTwoHeadingMatch[1].toLowerCase().includes('weekly activity menu'),
      )

      if (isActivityMenuHeading) {
        menuStarted = true
      }

      continue
    }

    if (levelTwoHeadingMatch) {
      const normalizedDayFromLevelTwo = normalizeDayHeading(levelTwoHeadingMatch[1])

      if (normalizedDayFromLevelTwo) {
        commitCurrentDay()
        currentDay = normalizedDayFromLevelTwo
        if (!discoveredDayOrder.includes(normalizedDayFromLevelTwo)) {
          discoveredDayOrder.push(normalizedDayFromLevelTwo)
        }
        continue
      }

      if (discoveredDayOrder.length > 0) {
        break
      }

      continue
    }

    if (levelThreeHeadingMatch) {
      const normalizedDayFromLevelThree = normalizeDayHeading(levelThreeHeadingMatch[1])

      if (normalizedDayFromLevelThree) {
        commitCurrentDay()
        currentDay = normalizedDayFromLevelThree
        if (!discoveredDayOrder.includes(normalizedDayFromLevelThree)) {
          discoveredDayOrder.push(normalizedDayFromLevelThree)
        }
        continue
      }
    }

    if (currentDay) {
      currentDayLines.push(line)
    }
  }

  commitCurrentDay()

  const orderedDays = ACTIVITY_DAY_ORDER.filter((day) => {
    return discoveredDayOrder.includes(day)
  })

  return {
    days: orderedDays,
    byDay: activityMap,
  }
}

export function getTodayActivityDayKey(timeZone = 'America/Toronto'): ActivityDayKey {
  const weekdayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone,
  }).format(new Date())

  if (weekdayLabel === 'Saturday' || weekdayLabel === 'Sunday') {
    return 'Weekend'
  }

  if (weekdayLabel === 'Monday') {
    return 'Monday'
  }

  if (weekdayLabel === 'Tuesday') {
    return 'Tuesday'
  }

  if (weekdayLabel === 'Wednesday') {
    return 'Wednesday'
  }

  if (weekdayLabel === 'Thursday') {
    return 'Thursday'
  }

  if (weekdayLabel === 'Friday') {
    return 'Friday'
  }

  return 'Monday'
}

export function getNextActivityDay(day: ActivityDayKey) {
  const currentDayIndex = ACTIVITY_DAY_ORDER.indexOf(day)

  if (currentDayIndex === -1) {
    return ACTIVITY_DAY_ORDER[0]
  }

  const nextDayIndex = (currentDayIndex + 1) % ACTIVITY_DAY_ORDER.length
  return ACTIVITY_DAY_ORDER[nextDayIndex]
}

export function getPreviousActivityDay(day: ActivityDayKey) {
  const currentDayIndex = ACTIVITY_DAY_ORDER.indexOf(day)

  if (currentDayIndex === -1) {
    return ACTIVITY_DAY_ORDER[0]
  }

  const previousDayIndex =
    (currentDayIndex - 1 + ACTIVITY_DAY_ORDER.length) % ACTIVITY_DAY_ORDER.length
  return ACTIVITY_DAY_ORDER[previousDayIndex]
}

export const activityDayOrder = ACTIVITY_DAY_ORDER
