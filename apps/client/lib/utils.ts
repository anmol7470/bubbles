import { generateReactHelpers } from '@uploadthing/react'
import { clsx, type ClassValue } from 'clsx'
import { format, isSameMonth, isSameWeek, isThisYear, isToday, isYesterday } from 'date-fns'
import { twMerge } from 'tailwind-merge'
import type { OurFileRouter } from '../../server/src/lib/uploadthing'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(sentAt: Date) {
  if (isToday(sentAt)) return format(sentAt, 'p')
  if (isYesterday(sentAt)) return 'Yesterday'
  if (isSameWeek(sentAt, new Date())) return format(sentAt, 'EEEE')
  if (isSameMonth(sentAt, new Date())) return format(sentAt, 'MMM d, E')
  if (isThisYear(sentAt)) return format(sentAt, 'MMM d')
  return format(sentAt, 'MMM d, yyyy')
}

export const { useUploadThing } = generateReactHelpers<OurFileRouter>({
  url: `${process.env.NEXT_PUBLIC_SERVER_URL}/api/uploadthing`,
  fetch: (input, init) => {
    const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL
    if (SERVER_URL && input.toString().startsWith(SERVER_URL)) {
      return fetch(input, {
        ...init,
        credentials: 'include',
      })
    }
    return fetch(input, init)
  },
})
