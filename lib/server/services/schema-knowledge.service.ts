import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getSchemaKnowledgeRepository } from '@/lib/server/repositories'
import type { SchemaKnowledgeRecord } from '@/lib/types/domain'

let developmentReportCache: string | null = null

function normalizeSchemaName(schemaName: string) {
  return schemaName.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function loadDevelopmentReport() {
  if (developmentReportCache) {
    return developmentReportCache
  }

  const reportPath = path.join(process.cwd(), 'baby-development-report.md')
  developmentReportCache = await readFile(reportPath, 'utf8')
  return developmentReportCache
}

function extractMarkdownContent(rawContent: string) {
  const trimmedContent = rawContent.trim()
  const codeFenceMatch = trimmedContent.match(/```(?:markdown|md)?\s*([\s\S]*?)\s*```/i)

  if (!codeFenceMatch?.[1]) {
    return trimmedContent
  }

  return codeFenceMatch[1].trim()
}

async function generateSchemaKnowledgeContent(input: {
  schemaName: string
  normalizedSchemaName: string
}) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OpenRouter API key is missing')
  }

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'

  const developmentReport = await loadDevelopmentReport()

  const systemPrompt = [
    'You are an evidence-based early childhood education assistant.',
    'Write concise but complete markdown explaining one play/learning schema.',
    'Focus on neutral, universal educational information and avoid child-specific assumptions.',
    'Use the following markdown sections in this exact order:',
    '## **WHAT THIS SCHEMA MEANS**',
    '## **WHAT ADULTS OFTEN OBSERVE**',
    '## **WHY IT MATTERS FOR DEVELOPMENT**',
    '## **RESEARCH AND PRACTICE CONTEXT**',
    '## **HOME SUPPORT IDEAS**',
    '## **SAFETY NOTES**',
    '## **REFERENCES USED**',
    'Only use evidence that can be grounded in the provided reference report.',
    'If evidence is limited for this schema name, clearly say so and provide best-fit guidance.',
  ].join('\n')

  const userPrompt = [
    `Schema name: ${input.schemaName}`,
    `Normalized schema name: ${input.normalizedSchemaName}`,
    '',
    'Reference report (baby-development-report.md):',
    developmentReport,
  ].join('\n')

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 25000)

  try {
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
      throw new Error(`OpenRouter schema knowledge request failed: ${errorPayload}`)
    }

    const completionPayload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const rawContent = completionPayload.choices?.[0]?.message?.content

    if (!rawContent) {
      throw new Error('OpenRouter schema knowledge response was empty')
    }

    const contentMarkdown = extractMarkdownContent(rawContent)

    if (!contentMarkdown) {
      throw new Error('Generated schema knowledge content was empty')
    }

    return {
      contentMarkdown,
      model,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function getOrCreateSchemaKnowledgeService(input: {
  schemaName: string
  useDemoMode?: boolean
}): Promise<SchemaKnowledgeRecord> {
  const normalizedSchemaName = normalizeSchemaName(input.schemaName)

  if (!normalizedSchemaName) {
    throw new Error('Schema name is required')
  }

  const repository = getSchemaKnowledgeRepository(Boolean(input.useDemoMode))
  const existingKnowledge = await repository.getSchemaKnowledge({
    schemaName: normalizedSchemaName,
  })

  if (existingKnowledge) {
    return existingKnowledge
  }

  const generatedKnowledge = await generateSchemaKnowledgeContent({
    schemaName: input.schemaName,
    normalizedSchemaName,
  })

  return repository.putSchemaKnowledge({
    schemaName: input.schemaName.trim(),
    normalizedSchemaName,
    contentMarkdown: generatedKnowledge.contentMarkdown,
    generatedAt: new Date().toISOString(),
    model: generatedKnowledge.model,
  })
}

export async function getSchemaKnowledgeService(input: {
  schemaName: string
  useDemoMode?: boolean
}): Promise<SchemaKnowledgeRecord | null> {
  const normalizedSchemaName = normalizeSchemaName(input.schemaName)

  if (!normalizedSchemaName) {
    return null
  }

  const repository = getSchemaKnowledgeRepository(Boolean(input.useDemoMode))

  return repository.getSchemaKnowledge({
    schemaName: normalizedSchemaName,
  })
}
