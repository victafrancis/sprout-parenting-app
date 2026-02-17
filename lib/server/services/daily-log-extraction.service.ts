import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type {
  ChildProfile,
  DailyLogExtractionResult,
  ProfileUpdateCandidates,
} from '@/lib/types/domain'

const openRouterResponseSchema = z.object({
  structuredLog: z.object({
    keyTakeaways: z.array(z.string()).default([]),
    sentiment: z.string().default('neutral'),
  }),
  profileCandidates: z.object({
    milestones: z
      .array(
        z.object({
          value: z.string(),
          reason: z.string().default(''),
          confidence: z.number().min(0).max(1).default(0.5),
        }),
      )
      .default([]),
    activeSchemas: z
      .array(
        z.object({
          value: z.string(),
          reason: z.string().default(''),
          confidence: z.number().min(0).max(1).default(0.5),
        }),
      )
      .default([]),
    interests: z
      .array(
        z.object({
          value: z.string(),
          reason: z.string().default(''),
          confidence: z.number().min(0).max(1).default(0.5),
        }),
      )
      .default([]),
  }),
})

let developmentReportCache: string | null = null

function createEmptyCandidates(): ProfileUpdateCandidates {
  return {
    milestones: [],
    activeSchemas: [],
    interests: [],
  }
}

function createFallbackResult(): DailyLogExtractionResult {
  return {
    structuredLog: {
      keyTakeaways: [],
      sentiment: 'neutral',
    },
    profileCandidates: createEmptyCandidates(),
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    source: 'fallback',
  }
}

function extractJsonObject(rawContent: string) {
  const trimmedContent = rawContent.trim()

  if (trimmedContent.startsWith('{')) {
    return trimmedContent
  }

  const codeFenceMatch = trimmedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim()
  }

  const firstBraceIndex = trimmedContent.indexOf('{')
  const lastBraceIndex = trimmedContent.lastIndexOf('}')

  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmedContent.slice(firstBraceIndex, lastBraceIndex + 1)
  }

  return trimmedContent
}

async function loadDevelopmentReport() {
  if (developmentReportCache) {
    return developmentReportCache
  }

  const reportPath = path.join(process.cwd(), 'baby-development-report.md')
  developmentReportCache = await readFile(reportPath, 'utf8')
  return developmentReportCache
}

export async function extractDailyLogInsights(input: {
  childId: string
  rawText: string
  childProfile: ChildProfile | null
}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return createFallbackResult()
  }

  let timeout: ReturnType<typeof setTimeout> | null = null

  try {
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
    const developmentReport = await loadDevelopmentReport()
    const profileJson = JSON.stringify(input.childProfile || {}, null, 2)

    const systemPrompt = [
      'You are an assistant that extracts structured developmental insights from a parent daily log.',
      'Return STRICT JSON only. Do not include markdown code fences.',
      'Use this JSON shape exactly:',
      '{',
      '  "structuredLog": { "keyTakeaways": string[], "sentiment": string },',
      '  "profileCandidates": {',
      '    "milestones": [{ "value": string, "reason": string, "confidence": number }],',
      '    "activeSchemas": [{ "value": string, "reason": string, "confidence": number }],',
      '    "interests": [{ "value": string, "reason": string, "confidence": number }]',
      '  }',
      '}',
      'Confidence must be between 0 and 1.',
      'Only include profile candidates that are explicitly supported by the log text.',
    ].join('\n')

    const userPrompt = [
      `Child ID: ${input.childId}`,
      'Current Child Profile JSON:',
      profileJson,
      '',
      'Reference report (baby-development-report.md):',
      developmentReport,
      '',
      'Daily log raw text:',
      input.rawText,
    ].join('\n')

    const abortController = new AbortController()
    timeout = setTimeout(() => abortController.abort(), 15000)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
      signal: abortController.signal,
    })

    if (!response.ok) {
      const errorPayload = await response.text()
      console.error('OpenRouter request failed', errorPayload)
      return createFallbackResult()
    }

    const completionPayload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const rawContent = completionPayload.choices?.[0]?.message?.content
    if (!rawContent) {
      return createFallbackResult()
    }

    const jsonContent = extractJsonObject(rawContent)
    const parsedContent = JSON.parse(jsonContent)
    const parsedResult = openRouterResponseSchema.parse(parsedContent)

    return {
      structuredLog: parsedResult.structuredLog,
      profileCandidates: parsedResult.profileCandidates,
      model,
      source: 'openrouter' as const,
    }
  } catch (error) {
    console.error('Daily log extraction failed', error)
    return createFallbackResult()
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}
