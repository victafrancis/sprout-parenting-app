import { z } from 'zod'
import { getRequestMode, useDemoModeForWrite } from '@/lib/server/auth-mode'
import { fail, ok } from '@/lib/server/http'
import {
  getOrCreateSchemaKnowledgeService,
  getSchemaKnowledgeService,
} from '@/lib/server/services/schema-knowledge.service'

const getSchema = z.object({
  schemaName: z.string().min(1),
})

const postSchema = z.object({
  action: z.literal('generate').optional(),
  schemaName: z.string().min(1),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = getSchema.safeParse({
      schemaName: searchParams.get('schemaName') ?? '',
    })

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request query')
    }

    const mode = await getRequestMode()

    const schemaKnowledge = await getSchemaKnowledgeService({
      schemaName: parsed.data.schemaName,
      useDemoMode: mode.isDemo,
    })

    if (!schemaKnowledge) {
      return fail(404, 'NOT_FOUND', 'Schema knowledge not found')
    }

    return ok(schemaKnowledge)
  } catch (error) {
    console.error('GET /api/v1/schema-knowledge failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to fetch schema knowledge')
  }
}

export async function POST(request: Request) {
  try {
    const mode = await getRequestMode()
    const shouldUseDemoModeForWrite = useDemoModeForWrite(mode)

    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    const schemaKnowledge = await getOrCreateSchemaKnowledgeService({
      schemaName: parsed.data.schemaName,
      useDemoMode: shouldUseDemoModeForWrite,
    })

    return ok(schemaKnowledge)
  } catch (error) {
    console.error('POST /api/v1/schema-knowledge failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to generate schema knowledge')
  }
}

