import { redirect } from '@tanstack/react-router'
import type { ErrorResponse } from '../types/auth'
import { useAppSession } from './session'

export const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export type AuthenticatedFetchResult<T> =
  | { success: true; data?: T }
  | { success: false; error: string; retry_after?: number }

export const authenticatedFetch = async <T = Record<string, never>>(
  path: string,
  options: RequestInit = {},
  errorFallback: string,
  sessionOverride?: Awaited<ReturnType<typeof useAppSession>>
): Promise<AuthenticatedFetchResult<T>> => {
  const session = sessionOverride ?? (await useAppSession())
  const token = session.data.token

  if (!token) {
    throw redirect({ to: '/auth' })
  }

  try {
    const { headers, method, ...restOptions } = options

    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: method ?? 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      ...restOptions,
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error: error.error, retry_after: error.retry_after }
    }

    if (response.headers.get('content-length') === '0' || response.status === 204) {
      return { success: true }
    }

    const data = (await response.json()) as T
    return { success: true, data }
  } catch {
    return {
      success: false,
      error: errorFallback,
    }
  }
}
