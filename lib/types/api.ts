export type ApiSuccess<T> = {
  data: T
  error: null
  meta?: PaginationMeta
}

export type ApiFailure = {
  data: null
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export type PaginationMeta = {
  nextCursor?: string | null
}
