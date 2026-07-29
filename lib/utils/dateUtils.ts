/**
 * Formats a date to YYYY-MM-DD string in a specific timezone.
 */
export function getFormattedDateInTimezone(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    // en-CA locale with 2-digit month/day usually returns YYYY-MM-DD.
    // However, some environments might return different separators.
    // To be safe, we use formatToParts.
    const parts = formatter.formatToParts(date);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const d = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
}

/**
 * Checks if two dates refer to the same calendar day in a specific timezone.
 */
export function isSameDayInTimezone(date1: Date, date2: Date, timeZone: string): boolean {
    return getFormattedDateInTimezone(date1, timeZone) === getFormattedDateInTimezone(date2, timeZone);
}

/**
 * Calculates the intended upload time by adding buffer hours to the generation execution time.
 */
export function getIntendedUploadTime(executionTime: Date, bufferHours: number): Date {
    const target = new Date(executionTime.getTime());
    target.setHours(target.getHours() + bufferHours);
    return target;
}
