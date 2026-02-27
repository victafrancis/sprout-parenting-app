import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { serverConfig } from '@/lib/server/config'

const dynamoClient = new DynamoDBClient({
  region: serverConfig.awsRegion,
})

export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export const s3Client = new S3Client({
  region: serverConfig.awsRegion,
})

export const lambdaClient = new LambdaClient({
  region: serverConfig.awsRegion,
})
