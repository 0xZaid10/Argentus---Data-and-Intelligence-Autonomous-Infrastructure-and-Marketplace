import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const truncateMiddle = (value: string, start = 10, end = 6) => {
  if (value.length <= start + end + 3) {
    return value
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export const formatUsd = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value && value < 10 ? 2 : 0,
  }).format(value ?? 0)

export const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value ?? 0)

export const toTitleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const isPendingStatus = (status?: string | null) =>
  Boolean(status && ['pending', 'in_progress', 'verifying', 'open', 'reviewing'].includes(status))
