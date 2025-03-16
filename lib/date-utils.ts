/**
 * Date utilities for handling timezone conversions consistently throughout the application
 */

/**
 * Get the current date in YYYY-MM-DD format in the user's timezone or default to US Eastern
 */
export function getTodayDateString(userTimezone?: string): string {
  // Always force US Eastern timezone
  const defaultTimezone = 'America/New_York'; // US Eastern
  const timezone = defaultTimezone; // Ignore userTimezone to ensure consistency
  
  const now = new Date();
  console.log(`[date-utils] Raw Date before formatting: ${now.toString()}`);
  
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
  
  const result = `${year}-${month}-${day}`;
  
  // Debug logging to help track timezone issues
  if (typeof window !== "undefined") {
    console.log(`[date-utils] getTodayDateString (US Eastern): ${result}`);
    console.log(`[date-utils] Local browser date: ${new Date().toLocaleDateString()}`);
    console.log(`[date-utils] Browser timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  }
  
  return result;
}

/**
 * Convert a date to YYYY-MM-DD format in the user's timezone or default to US Eastern
 */
export function dateToYYYYMMDD(date: Date, userTimezone?: string): string {
  // Always force US Eastern timezone 
  const defaultTimezone = 'America/New_York'; // US Eastern
  const timezone = defaultTimezone; // Ignore userTimezone to ensure consistency
  
  console.log(`[date-utils] dateToYYYYMMDD input: ${date.toString()}`);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(date);
  
  const month = parts.find(part => part.type === 'month')?.value || '01';
  const day = parts.find(part => part.type === 'day')?.value || '01';
  const year = parts.find(part => part.type === 'year')?.value || '2000';
  
  const result = `${year}-${month}-${day}`;
  console.log(`[date-utils] dateToYYYYMMDD result: ${result}`);
  
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
  const todayString = getTodayDateString(userTimezone);
  const dateString = dateToYYYYMMDD(date, userTimezone);
  return dateString < todayString;
}

/**
 * Check if a date is today in the user's timezone
 */
export function isToday(date: Date, userTimezone?: string): boolean {
  const todayString = getTodayDateString(userTimezone);
  const dateString = dateToYYYYMMDD(date, userTimezone);
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