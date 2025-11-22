import { clsx, type ClassValue } from 'clsx'
import { format, isSameMonth, isSameWeek, isThisYear, isToday, isYesterday } from 'date-fns'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type FormatDateOptions = {
  mode?: 'default' | 'day-label'
}

export function formatDate(sentAt: Date, options?: FormatDateOptions) {
  if (options?.mode === 'day-label') {
    if (isToday(sentAt)) return 'Today'
    if (isYesterday(sentAt)) return 'Yesterday'
    return format(sentAt, 'MMM d, yyyy')
  }

  if (isToday(sentAt)) return format(sentAt, 'p')
  if (isYesterday(sentAt)) return 'Yesterday'
  if (isSameWeek(sentAt, new Date())) return format(sentAt, 'EEEE')
  if (isSameMonth(sentAt, new Date())) return format(sentAt, 'MMM d, E')
  if (isThisYear(sentAt)) return format(sentAt, 'MMM d')
  return format(sentAt, 'MMM d, yyyy')
}

export function formatMessageTime(sentAt: Date) {
  return format(sentAt, 'h:mm a').toLowerCase()
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)} second${Math.ceil(seconds) !== 1 ? 's' : ''}`
  }
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}
