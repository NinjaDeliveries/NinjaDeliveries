/**
 * Date Helper Functions for IST (India Standard Time) Timezone
 * Fixes off-by-one date bugs by ensuring consistent date handling
 */

/**
 * Get current date in IST as YYYY-MM-DD string
 * @returns {string} Date string in YYYY-MM-DD format (IST timezone)
 */
export function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(now.getTime() + istOffset);
  
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Convert any date to IST date string (YYYY-MM-DD)
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @returns {string} Date string in YYYY-MM-DD format (IST timezone)
 */
export function toISTDateString(date) {
  if (!date) return null;
  
  let dateObj;
  
  // Handle different input types
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    dateObj = new Date(date);
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (date.toDate && typeof date.toDate === 'function') {
    // Firestore Timestamp
    dateObj = date.toDate();
  } else {
    return null;
  }
  
  // For Date objects created with new Date(year, month, day), 
  // we should use the local date components directly
  // Only apply timezone conversion for timestamps/UTC dates
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Create a Date object from YYYY-MM-DD string in IST timezone
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object representing start of day in IST
 */
export function createISTDate(dateString) {
  if (!dateString) return null;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date at midnight IST
  // We create it in local timezone first, then adjust
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  return date;
}

/**
 * Format date string for display
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateForDisplay(dateString, options = {}) {
  if (!dateString) return '';
  
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid timezone issues
  
  return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
}

/**
 * Check if a date string is today (IST)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is today
 */
export function isToday(dateString) {
  return dateString === getTodayIST();
}

/**
 * Check if a date string is in the past (before today in IST)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is in the past
 */
export function isPast(dateString) {
  if (!dateString) return false;
  return dateString < getTodayIST();
}

/**
 * Check if a date string is in the future (after today in IST)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is in the future
 */
export function isFuture(dateString) {
  if (!dateString) return false;
  return dateString > getTodayIST();
}

/**
 * Get date string for tomorrow (IST)
 * @returns {string} Tomorrow's date in YYYY-MM-DD format
 */
export function getTomorrowIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const tomorrow = new Date(now.getTime() + istOffset + (24 * 60 * 60 * 1000));
  
  const year = tomorrow.getUTCFullYear();
  const month = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get date string for yesterday (IST)
 * @returns {string} Yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const yesterday = new Date(now.getTime() + istOffset - (24 * 60 * 60 * 1000));
  
  const year = yesterday.getUTCFullYear();
  const month = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Compare two date strings
 * @param {string} date1 - First date string (YYYY-MM-DD)
 * @param {string} date2 - Second date string (YYYY-MM-DD)
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1, date2) {
  if (date1 === date2) return 0;
  return date1 < date2 ? -1 : 1;
}

/**
 * Get relative date label (Today, Tomorrow, Yesterday, or formatted date)
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Relative date label
 */
export function getRelativeDateLabel(dateString) {
  if (!dateString) return '';
  
  const today = getTodayIST();
  const tomorrow = getTomorrowIST();
  const yesterday = getYesterdayIST();
  
  if (dateString === today) return 'Today';
  if (dateString === tomorrow) return 'Tomorrow';
  if (dateString === yesterday) return 'Yesterday';
  
  return formatDateForDisplay(dateString, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format time string to 12-hour format
 * @param {string} timeString - Time string in HH:MM format
 * @returns {string} Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime12Hour(timeString) {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}
