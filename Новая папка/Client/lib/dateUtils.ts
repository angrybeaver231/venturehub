/**
 * Utility functions for date parsing and comparison
 */

// Russian month names mapping (lowercase for case-insensitive matching)
const RUSSIAN_MONTHS: Record<string, number> = {
  'января': 0,
  'февраля': 1,
  'марта': 2,
  'апреля': 3,
  'мая': 4,
  'июня': 5,
  'июля': 6,
  'августа': 7,
  'сентября': 8,
  'октября': 9,
  'ноября': 10,
  'декабря': 11,
};

/**
 * Parse a date string in various formats and return a Date object
 * Supports:
 * - ISO format: "2024-11-25", "2024-11-25T10:00:00Z", "2024-11-25T10:00:00+03:00"
 * - Russian format: "25.11.2024", "9 Ноября 2025", "1-го Декабря 2024"
 * - English format: "November 25, 2024", "Nov 25, 2024", "25th November 2024"
 * - Other common formats with flexible whitespace and ordinals
 */
export function parseEventDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Normalize whitespace and remove ordinal suffixes (st, nd, rd, th) and Russian (-го, -ого)
  const trimmed = dateString.trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/(\d+)(?:st|nd|rd|th)\b/gi, '$1') // Remove English ordinals
    .replace(/(\d+)-(?:го|ого)\b/gi, '$1'); // Remove Russian ordinals

  // Try Russian format with month name first: "9 Ноября 2025" or "9 ноября 2025"
  // Must check this BEFORE trying new Date() because some browsers may partially parse Cyrillic
  const russianMatch = trimmed.match(/^(\d{1,2})\s+([а-яА-ЯёЁ]+)\s+(\d{4})$/i);
  if (russianMatch) {
    const [, day, monthName, year] = russianMatch;
    const monthIndex = RUSSIAN_MONTHS[monthName.toLowerCase()];
    if (monthIndex !== undefined) {
      const date = new Date(parseInt(year), monthIndex, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // For ISO timestamps with time component (e.g. "2026-02-18T21:00:00.000Z"),
  // extract just the date part to avoid timezone-based day shifting.
  // The stored date represents the local event date, not a UTC moment.
  const isoWithTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoWithTimeMatch) {
    const [year, month, day] = isoWithTimeMatch[1].split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    if (!isNaN(localDate.getTime())) {
      return localDate;
    }
  }

  // Try ISO format and English month names (JavaScript Date constructor)
  // This handles ISO date-only, and standard English formats
  let date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }


  // Try Russian/European format: DD.MM.YYYY or DD/MM/YYYY (with flexible spacing)
  const europeanMatch = trimmed.match(/^(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})$/);
  if (europeanMatch) {
    const [, day, month, year] = europeanMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try DD-MM-YYYY format (with flexible spacing)
  const dashMatch = trimmed.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try YYYY-MM-DD with flexible separators
  const isoLikeMatch = trimmed.match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})$/);
  if (isoLikeMatch) {
    const [, year, month, day] = isoLikeMatch;
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // If all parsing attempts fail, return null
  return null;
}

const RUSSIAN_MONTH_NAMES_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const ENGLISH_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatEventDate(dateString: string, language: string = 'en'): string {
  const parsed = parseEventDate(dateString);
  if (!parsed) {
    return dateString;
  }
  const day = parsed.getDate();
  const month = parsed.getMonth();
  const year = parsed.getFullYear();
  if (language === 'ru') {
    return `${day} ${RUSSIAN_MONTH_NAMES_GENITIVE[month]} ${year}`;
  }
  return `${ENGLISH_MONTH_NAMES[month]} ${day}, ${year}`;
}

export function parseDateToDateObject(dateString: string): Date | undefined {
  const parsed = parseEventDate(dateString);
  return parsed || undefined;
}

/**
 * Check if an event date is upcoming (today or in the future)
 * @param eventDate - The event date string in various formats
 * @returns true if the event is upcoming, false if it's past or if parsing fails (fail-closed)
 */
export function isUpcomingEvent(eventDate: string): boolean {
  const parsedDate = parseEventDate(eventDate);
  
  // If we can't parse the date, exclude the event to avoid showing stale content (fail-closed)
  if (!parsedDate) {
    console.warn(`[dateUtils] Failed to parse event date for filtering: "${eventDate}". Event will be hidden. Please use a supported format (ISO, Russian, or European DD.MM.YYYY).`);
    return false;
  }

  // Normalize both dates to UTC to avoid timezone issues
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  
  const eventUTC = Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  
  return eventUTC >= todayUTC;
}
