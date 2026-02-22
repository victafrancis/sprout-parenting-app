type DailyLogTimeLabelInput = {
  createdAt?: string
  storageKey?: string
  fallbackLabel?: string
  now?: Date
}

function parseIsoFromStorageKey(storageKey?: string) {
  if (!storageKey) {
    return null
  }

  if (!storageKey.startsWith('DATE#')) {
    return null
  }

  const timestampFromStorageKey = storageKey.slice('DATE#'.length)
  if (!timestampFromStorageKey) {
    return null
  }

  return timestampFromStorageKey
}

function resolveTimestamp(input: DailyLogTimeLabelInput) {
  if (input.createdAt) {
    return input.createdAt
  }

  return parseIsoFromStorageKey(input.storageKey)
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime())
}

export function buildDailyLogTimeLabel(input: DailyLogTimeLabelInput) {
  const resolvedTimestamp = resolveTimestamp(input)

  if (!resolvedTimestamp) {
    return input.fallbackLabel || ''
  }

  const createdAtDate = new Date(resolvedTimestamp)
  if (!isValidDate(createdAtDate)) {
    return input.fallbackLabel || ''
  }

  const now = input.now ?? new Date()
  const elapsedMilliseconds = now.getTime() - createdAtDate.getTime()

  // Guard for future/clock-skew timestamps.
  if (elapsedMilliseconds < 45 * 1000) {
    return 'Just now'
  }

  const elapsedMinutes = Math.floor(elapsedMilliseconds / (60 * 1000))
  if (elapsedMinutes < 60) {
    if (elapsedMinutes === 1) {
      return '1 minute ago'
    }

    return `${elapsedMinutes} minutes ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) {
    if (elapsedHours === 1) {
      return '1 hour ago'
    }

    return `${elapsedHours} hours ago`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays < 7) {
    if (elapsedDays === 1) {
      return '1 day ago'
    }

    return `${elapsedDays} days ago`
  }

  return createdAtDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}