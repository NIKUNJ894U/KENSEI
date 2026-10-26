/**
 * Time utility helpers for consistent timezone and local wall-clock evaluations.
 */

/**
 * Ensures consistent evaluation of the difference between current time and task due date 
 * based on the user's local wall-clock time, ensuring that tasks are evaluated based on the 
 * user's local wall-clock time rather than server-side UTC offsets.
 * 
 * It parses the year, month, date, and hour-minute-second components from the stored ISO / UTC string
 * and builds a date in the user's current local timezone. It then compares this local due date with
 * the client's current local time.
 * 
 * @param dueDateStr - The ISO or datetime string representing the deadline.
 * @returns The difference in milliseconds: (localDueDate - currentClientTime)
 */
export function getLocalWallClockTimeDifference(dueDateStr: string): number {
  if (!dueDateStr) return Infinity;

  const now = new Date();
  
  try {
    // Extract year, month, day, hour, minute, second from the ISO string format:
    // e.g., "2026-06-25T15:30:00.000Z" -> matches "2026", "06", "25", "15", "30", "00"
    const match = dueDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed month in JS Date
      const day = parseInt(match[3], 10);
      const hour = parseInt(match[4], 10);
      const minute = parseInt(match[5], 10);
      const second = parseInt(match[6], 10);
      
      // Construct a Date object representing these EXACT wall-clock values in the client's local timezone
      const localDueDate = new Date(year, month, day, hour, minute, second);
      return localDueDate.getTime() - now.getTime();
    }
  } catch (err) {
    console.warn("Failed to parse local wall-clock components, falling back to standard parsing:", err);
  }

  // Fallback if parsing fails or pattern is different
  const due = new Date(dueDateStr);
  return due.getTime() - now.getTime();
}

/**
 * Formats an ISO string consistently as a local wall-clock date and time.
 * 
 * @param isoString - The stored date string.
 * @returns A beautifully formatted local datetime string.
 */
export function formatLocalWallClockDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    // If it's a standard string, try to parse components to show local representation
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const hour = parseInt(match[4], 10);
      const minute = parseInt(match[5], 10);
      const second = parseInt(match[6], 10);
      
      const localDate = new Date(year, month, day, hour, minute, second);
      return localDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}
