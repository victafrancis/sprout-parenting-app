import { createHmac } from 'node:crypto'
import { serverConfig } from '@/lib/server/config'

type SessionClaims = {
  role: 'admin'
  exp: number
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

function createSignature(payloadSegment: string) {
  if (!serverConfig.sessionSecret) {
    return null
  }

  return createHmac('sha256', serverConfig.sessionSecret)
    .update(payloadSegment)
    .digest('base64url')
}

export function createSessionToken(expiresAtUnixSeconds: number) {
  if (!serverConfig.sessionSecret) {
    return null
  }

  const claims: SessionClaims = {
    role: 'admin',
    exp: expiresAtUnixSeconds,
  }

  const payloadSegment = toBase64Url(JSON.stringify(claims))
  const signatureSegment = createSignature(payloadSegment)
  if (!signatureSegment) {
    return null
  }

  return `${payloadSegment}.${signatureSegment}`
}

export function verifySessionToken(token: string | undefined | null) {
  if (!serverConfig.sessionSecret) {
    return null
  }

  if (!token) {
    return null
  }

  const segments = token.split('.')
  if (segments.length !== 2) {
    return null
  }

  const [payloadSegment, signatureSegment] = segments
  const expectedSignature = createSignature(payloadSegment)
  if (!expectedSignature) {
    return null
  }

  if (signatureSegment !== expectedSignature) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadSegment)) as SessionClaims
    const isExpired = payload.exp <= Math.floor(Date.now() / 1000)
    if (isExpired) {
      return null
    }

    if (payload.role !== 'admin') {
      return null
    }

    return payload
  } catch {
    return null
  }
}
