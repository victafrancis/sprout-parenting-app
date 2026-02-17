import { NextResponse } from 'next/server'
import type { ApiFailure, ApiSuccess, PaginationMeta } from '@/lib/types/api'

export function ok<T>(data: T, meta?: PaginationMeta) {
  const payload: ApiSuccess<T> = {
    data,
    error: null,
    ...(meta ? { meta } : {}),
  }

  return NextResponse.json(payload, { status: 200 })
}

export function created<T>(data: T) {
  const payload: ApiSuccess<T> = {
    data,
    error: null,
  }

  return NextResponse.json(payload, { status: 201 })
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const payload: ApiFailure = {
    data: null,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  }

  return NextResponse.json(payload, { status })
}
