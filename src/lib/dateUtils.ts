/**
 * Local-timezone date formatting helpers so daily medication schedules,
 * history calendars, and datetime-local inputs match the user's actual day.
 */

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateTimeInputValue(date: Date = new Date()): string {
  const datePart = getLocalDateString(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${datePart}T${hours}:${minutes}`;
}

export function getLocalWeekday(date: Date = new Date()): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}
