import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const runtimeEnvironment = { ...process.env }

function parseDotEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {}
  }

  const rawContent = readFileSync(filePath, 'utf8')
  const parsedEntries = {}

  for (const rawLine of rawContent.split(/\r?\n/)) {
    const trimmedLine = rawLine.trim()

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim()

    if (!key) {
      continue
    }

    const hasQuotedValue =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))

    const normalizedValue = hasQuotedValue
      ? rawValue.slice(1, rawValue.length - 1)
      : rawValue

    parsedEntries[key] = normalizedValue
  }

  return parsedEntries
}

function mergeEnvDefaults(defaultEntries) {
  for (const [key, value] of Object.entries(defaultEntries)) {
    if (!runtimeEnvironment[key]) {
      runtimeEnvironment[key] = value
    }
  }
}

const dotEnvPath = path.join(process.cwd(), '.env')
const dotEnvLocalPath = path.join(process.cwd(), '.env.local')

mergeEnvDefaults(parseDotEnvFile(dotEnvPath))
mergeEnvDefaults(parseDotEnvFile(dotEnvLocalPath))

const currentDataMode = runtimeEnvironment.DATA_MODE === 'aws' ? 'aws' : 'mock'
const shouldInjectAwsProfile = currentDataMode === 'aws'

if (shouldInjectAwsProfile && !runtimeEnvironment.AWS_PROFILE) {
  runtimeEnvironment.AWS_PROFILE = 'sprout-local'
  console.log('[dev-with-profile] DATA_MODE=aws detected. Using AWS_PROFILE=sprout-local')
} else if (shouldInjectAwsProfile) {
  console.log(
    `[dev-with-profile] DATA_MODE=aws detected. Keeping existing AWS_PROFILE=${runtimeEnvironment.AWS_PROFILE}`,
  )
} else {
  console.log('[dev-with-profile] DATA_MODE=mock detected. AWS profile injection skipped.')
}

const isDryRun = runtimeEnvironment.SPROUT_DEV_DRY_RUN === '1'

if (isDryRun) {
  console.log('[dev-with-profile] Dry run enabled. Not starting Next.js dev server.')
  process.exit(0)
}

const nextProcess = spawn('npx', ['next', 'dev', '--webpack'], {
  stdio: 'inherit',
  shell: true,
  env: runtimeEnvironment,
})

nextProcess.on('exit', (code) => {
  process.exit(code ?? 0)
})

nextProcess.on('error', (error) => {
  console.error('[dev-with-profile] Failed to start Next.js dev server.', error)
  process.exit(1)
})
