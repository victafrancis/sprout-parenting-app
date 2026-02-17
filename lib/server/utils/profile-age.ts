export function calculateAgeMonthsFromBirthDate(
  birthDate: string,
  now = new Date(),
) {
  const parsedBirthDate = new Date(`${birthDate}T00:00:00.000Z`)

  if (Number.isNaN(parsedBirthDate.getTime())) {
    return 0
  }

  const nowYear = now.getUTCFullYear()
  const nowMonth = now.getUTCMonth()
  const nowDay = now.getUTCDate()

  const birthYear = parsedBirthDate.getUTCFullYear()
  const birthMonth = parsedBirthDate.getUTCMonth()
  const birthDay = parsedBirthDate.getUTCDate()

  let ageInMonths = (nowYear - birthYear) * 12 + (nowMonth - birthMonth)

  if (nowDay < birthDay) {
    ageInMonths -= 1
  }

  if (ageInMonths < 0) {
    return 0
  }

  return ageInMonths
}

export function createApproxBirthDateFromAgeMonths(
  ageMonths: number,
  now = new Date(),
) {
  const normalizedAgeMonths = Number.isFinite(ageMonths) ? Math.max(0, ageMonths) : 0

  const approximateBirthDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - normalizedAgeMonths, 1),
  )

  return approximateBirthDate.toISOString().slice(0, 10)
}