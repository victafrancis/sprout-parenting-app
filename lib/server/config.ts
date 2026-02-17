export type DataMode = 'mock' | 'aws'

const mode = process.env.DATA_MODE === 'aws' ? 'aws' : 'mock'

export const serverConfig = {
  dataMode: mode as DataMode,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  dynamoTable: process.env.DYNAMODB_TABLE || 'Sprout_Data',
  s3WeeklyPlanBucket: process.env.S3_WEEKLY_PLAN_BUCKET || '',
  s3WeeklyPlanPrefix: process.env.S3_WEEKLY_PLAN_PREFIX || 'plans',
}

export const isAwsMode = serverConfig.dataMode === 'aws'
export const isMockMode = serverConfig.dataMode === 'mock'
