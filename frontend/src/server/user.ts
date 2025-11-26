import type { ErrorResponse, User } from '@/types/auth'
import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useAppSession } from './session'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export type UpdateUserProfileInput = {
  username: string
  profile_image_url?: string | null
}

export const updateUserProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateUserProfileInput) => data)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error: ErrorResponse = await response.json()
        return { success: false, error: error.error }
      }

      const result: { user: User } = await response.json()

      await session.update({
        token,
        user: result.user,
      })

      return { success: true, user: result.user }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
      }
    }
  })
