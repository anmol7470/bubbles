import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  format,
  isToday,
  isYesterday,
  isSameWeek,
  isSameMonth,
  isThisYear,
} from 'date-fns'

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
