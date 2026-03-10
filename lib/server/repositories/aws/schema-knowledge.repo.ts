import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDocClient } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { SchemaKnowledgeRepository } from '@/lib/server/repositories/types'
import type { SchemaKnowledgeRecord } from '@/lib/types/domain'

function normalizeSchemaName(schemaName: string) {
  return schemaName.trim().toLowerCase().replace(/\s+/g, ' ')
}

function createSchemaKnowledgeSortKey(normalizedSchemaName: string) {
  return `SCHEMA#${normalizedSchemaName}`
}

function mapItemToSchemaKnowledgeRecord(
  item: Record<string, unknown>,
): SchemaKnowledgeRecord | null {
  const schemaName = typeof item.schema_name === 'string' ? item.schema_name : null
  const normalizedSchemaName =
    typeof item.normalized_schema_name === 'string' ? item.normalized_schema_name : null
  const contentMarkdown =
    typeof item.content_markdown === 'string' ? item.content_markdown : null
  const generatedAt = typeof item.generated_at === 'string' ? item.generated_at : null
  const model = typeof item.model === 'string' ? item.model : null

  if (!schemaName || !normalizedSchemaName || !contentMarkdown || !generatedAt || !model) {
    return null
  }

  return {
    schemaName,
    normalizedSchemaName,
    contentMarkdown,
    generatedAt,
    model,
    source: 'openrouter',
  }
}

export class AwsSchemaKnowledgeRepository implements SchemaKnowledgeRepository {
  async getSchemaKnowledge(input: {
    schemaName: string
  }): Promise<SchemaKnowledgeRecord | null> {
    const normalizedSchemaName = normalizeSchemaName(input.schemaName)

    if (!normalizedSchemaName) {
      return null
    }

    const result = await dynamoDocClient.send(
      new GetCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: 'SCHEMA_KNOWLEDGE',
          SK: createSchemaKnowledgeSortKey(normalizedSchemaName),
        },
      }),
    )

    if (!result.Item) {
      return null
    }

    return mapItemToSchemaKnowledgeRecord(result.Item as Record<string, unknown>)
  }

  async putSchemaKnowledge(input: {
    schemaName: string
    normalizedSchemaName: string
    contentMarkdown: string
    generatedAt: string
    model: string
  }): Promise<SchemaKnowledgeRecord> {
    const normalizedSchemaName = normalizeSchemaName(input.normalizedSchemaName)
    const schemaName = input.schemaName.trim()

    await dynamoDocClient.send(
      new PutCommand({
        TableName: serverConfig.dynamoTable,
        Item: {
          PK: 'SCHEMA_KNOWLEDGE',
          SK: createSchemaKnowledgeSortKey(normalizedSchemaName),
          schema_name: schemaName,
          normalized_schema_name: normalizedSchemaName,
          content_markdown: input.contentMarkdown,
          generated_at: input.generatedAt,
          model: input.model,
          source: 'openrouter',
        },
      }),
    )

    return {
      schemaName,
      normalizedSchemaName,
      contentMarkdown: input.contentMarkdown,
      generatedAt: input.generatedAt,
      model: input.model,
      source: 'openrouter',
    }
  }
}

