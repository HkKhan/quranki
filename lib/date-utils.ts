/**
 * Date utilities for handling timezone conversions consistently throughout the application
 */

/**
 * Get the current date in YYYY-MM-DD format in the user's timezone or default to US Eastern
 */
export function getTodayDateString(): string {
  const now = new Date();
  const usEasternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const result = dateToYYYYMMDD(usEasternTime);
  return result;
}

/**
 * Convert a date to YYYY-MM-DD format in the user's timezone or default to US Eastern
 */
export function dateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const result = `${year}-${month}-${day}`;
  return result;
}

/**
 * Function to convert database DateTime fields to US Eastern date strings
 * Used for comparing dates consistently
 */
export function dbDateToUSEasternString(dbDate: Date): string {
  return dateToYYYYMMDD(dbDate);
}

/**
 * Get a new Date object representing today in the user's timezone or default to US Eastern
 */
export function getTodayInTimezone(userTimezone?: string): Date {
  const defaultTimezone = 'America/New_York'; // US Eastern
  const timezone = userTimezone || defaultTimezone;
  
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const month = parts.find(part => part.type === 'month')?.value || '01';
  const day = parts.find(part => part.type === 'day')?.value || '01';
  const year = parts.find(part => part.type === 'year')?.value || '2000';
  const hour = parts.find(part => part.type === 'hour')?.value || '00';
  const minute = parts.find(part => part.type === 'minute')?.value || '00';
  const second = parts.find(part => part.type === 'second')?.value || '00';
  
  // Create date string in the format "YYYY-MM-DDT00:00:00"
  // This will ensure the date is created with the correct timezone day
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}

/**
 * Check if a date is before today in the user's timezone
 */
export function isBeforeToday(date: Date, userTimezone?: string): boolean {
  const todayString = getTodayDateString();
  const dateString = dateToYYYYMMDD(date);
  return dateString < todayString;
}

/**
 * Check if a date is today in the user's timezone
 */
export function isToday(date: Date, userTimezone?: string): boolean {
  const todayString = getTodayDateString();
  const dateString = dateToYYYYMMDD(date);
  return dateString === todayString;
}

/**
 * Get the start of today (midnight) in the user's timezone
 */
export function getStartOfToday(userTimezone?: string): Date {
  const defaultTimezone = 'America/New_York'; // US Eastern
  const timezone = userTimezone || defaultTimezone;
  
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const month = parts.find(part => part.type === 'month')?.value || '01';
  const day = parts.find(part => part.type === 'day')?.value || '01';
  const year = parts.find(part => part.type === 'year')?.value || '2000';
  
  // Create date string in the format "YYYY-MM-DDT00:00:00"
  return new Date(`${year}-${month}-${day}T00:00:00`);
} 