import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', KRW: '₩', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', HKD: 'HK$',
}

export function formatPrice(price: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  if (currency === 'KRW' || currency === 'JPY') {
    return `${symbol}${Math.round(price).toLocaleString()}`
  }
  return `${symbol}${price.toFixed(2)}`
}

export function currencySymbol(currency = 'USD'): string {
  return CURRENCY_SYMBOLS[currency] ?? currency + ' '
}
