import { format, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

/**
 * Formats a date for display
 */
export function formatDate(date: Date, formatStr: string = 'MMM d, yyyy'): string {
  return format(date, formatStr);
}

/**
 * Formats a date for the calendar key (YYYY-MM-DD)
 */
export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Gets the start and end of the current week
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 0 }), // Sunday
    end: endOfWeek(now, { weekStartsOn: 0 }),
  };
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Parses a date key (YYYY-MM-DD) to a Date object
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}
