import type { SchemaKnowledgeRepository } from '@/lib/server/repositories/types'
import type { SchemaKnowledgeRecord } from '@/lib/types/domain'

const inMemorySchemaKnowledgeStore = new Map<string, SchemaKnowledgeRecord>()

function normalizeSchemaName(schemaName: string) {
  return schemaName.trim().toLowerCase().replace(/\s+/g, ' ')
}

export class MockSchemaKnowledgeRepository implements SchemaKnowledgeRepository {
  async getSchemaKnowledge(input: {
    schemaName: string
  }): Promise<SchemaKnowledgeRecord | null> {
    const normalizedSchemaName = normalizeSchemaName(input.schemaName)

    if (!normalizedSchemaName) {
      return null
    }

    const knowledgeRecord = inMemorySchemaKnowledgeStore.get(normalizedSchemaName)

    if (!knowledgeRecord) {
      return null
    }

    return {
      ...knowledgeRecord,
    }
  }

  async putSchemaKnowledge(input: {
    schemaName: string
    normalizedSchemaName: string
    contentMarkdown: string
    generatedAt: string
    model: string
  }): Promise<SchemaKnowledgeRecord> {
    const normalizedSchemaName = normalizeSchemaName(input.normalizedSchemaName)

    const createdRecord: SchemaKnowledgeRecord = {
      schemaName: input.schemaName.trim(),
      normalizedSchemaName,
      contentMarkdown: input.contentMarkdown,
      generatedAt: input.generatedAt,
      model: input.model,
      source: 'openrouter',
    }

    inMemorySchemaKnowledgeStore.set(normalizedSchemaName, createdRecord)

    return {
      ...createdRecord,
    }
  }
}

