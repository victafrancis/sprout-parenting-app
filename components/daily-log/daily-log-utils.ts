import type { DailyLogEntry, ProfileUpdateCandidates } from '@/lib/types/domain'

export type CandidateGroupKey = keyof ProfileUpdateCandidates

export function hasAnyCandidates(candidates: ProfileUpdateCandidates) {
  if (candidates.milestones.length > 0) {
    return true
  }

  if (candidates.activeSchemas.length > 0) {
    return true
  }

  if (candidates.interests.length > 0) {
    return true
  }

  return false
}

export function hasAnyAppliedProfileUpdates(entry: DailyLogEntry) {
  if (!entry.appliedProfileUpdates) {
    return false
  }

  if (entry.appliedProfileUpdates.milestones.length > 0) {
    return true
  }

  if (entry.appliedProfileUpdates.activeSchemas.length > 0) {
    return true
  }

  if (entry.appliedProfileUpdates.interests.length > 0) {
    return true
  }

  return false
}

export function getPlanReferenceSummary(entry: DailyLogEntry) {
  if (!entry.planReference) {
    return null
  }

  const reference = entry.planReference

  if (reference.referenceLabel.trim().length > 0) {
    return reference.referenceLabel
  }

  if (reference.subsectionTitle) {
    return `${reference.sectionTitle} > ${reference.subsectionTitle}`
  }

  return reference.sectionTitle
}