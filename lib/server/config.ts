export type DataMode = 'mock' | 'aws'

const mode = process.env.DATA_MODE === 'aws' ? 'aws' : 'mock'

function readOptionalEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    return null
  }

  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) {
    return null
  }

  return trimmedValue
}

function parsePositiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export const serverConfig = {
  dataMode: mode as DataMode,
  awsRegion: process.env.REGION || 'us-east-1',
  dynamoTable: process.env.DYNAMODB_TABLE || 'Sprout_Data',
  s3WeeklyPlanBucket: process.env.S3_WEEKLY_PLAN_BUCKET || '',
  s3WeeklyPlanPrefix: process.env.S3_WEEKLY_PLAN_PREFIX || 'plans',
  weeklyPlanLambdaFunctionName: process.env.WEEKLY_PLAN_LAMBDA_FUNCTION_NAME || '',
  weeklyPlanJobTimeoutSeconds: parsePositiveNumber(
    process.env.WEEKLY_PLAN_JOB_TIMEOUT_SECONDS,
    900,
  ),
  adminPasscode: process.env.ADMIN_PASSCODE || '',
  sessionSecret: readOptionalEnv('SESSION_SECRET'),
  isAuthEnabled: Boolean(readOptionalEnv('SESSION_SECRET')),
  sessionTtlHours: parsePositiveNumber(process.env.SESSION_TTL_HOURS, 24),
  sessionRememberTtlDays: parsePositiveNumber(
    process.env.SESSION_REMEMBER_TTL_DAYS,
    60,
  ),
}

export const isAwsMode = serverConfig.dataMode === 'aws'
export const isMockMode = serverConfig.dataMode === 'mock'
