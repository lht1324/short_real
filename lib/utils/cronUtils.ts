/**
 * Utility functions to convert between UI-friendly weekly schedule and Cron expressions.
 * Compatible with Trigger.dev (5-field format: min hour day month dayOfWeek).
 * Day of week: 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday).
 */

export interface WeeklySchedule {
    days: number[];
    hour: number;
    minute: number;
}

/**
 * Converts weekly UI data to a Cron expression.
 * Example: days=[1,3,5], hour=10, minute=0 -> "0 10 * * 1,3,5"
 */
export function weeklyToCron(days: number[], hour: number, minute: number): string {
    const minStr = minute.toString();
    const hourStr = hour.toString();
    
    // If all days are selected or no days are selected, use '*'
    const daysStr = (days.length === 0 || days.length === 7) 
        ? "*" 
        : [...days].sort((a, b) => a - b).join(",");
        
    return `${minStr} ${hourStr} * * ${daysStr}`;
}

/**
 * Parses a Cron expression back into UI-friendly weekly data.
 * Example: "30 15 * * 0,6" -> { days: [0,6], hour: 15, minute: 30 }
 */
export function cronToWeekly(cron: string): WeeklySchedule {
    const defaultSchedule: WeeklySchedule = { days: [1, 2, 3, 4, 5], hour: 10, minute: 0 };
    
    if (!cron) return defaultSchedule;
    
    const parts = cron.split(" ");
    if (parts.length < 5) return defaultSchedule;
    
    try {
        const minute = parseInt(parts[0], 10);
        const hour = parseInt(parts[1], 10);
        const daysPart = parts[4];
        
        let days: number[] = [];
        if (daysPart === "*") {
            days = [0, 1, 2, 3, 4, 5, 6];
        } else {
            // Split by comma and handle 0-7 (Trigger.dev supports 7 as Sunday too)
            days = daysPart.split(",")
                .map(d => parseInt(d, 10))
                .map(d => d === 7 ? 0 : d) // Normalize 7 to 0
                .filter(d => !isNaN(d));
            
            // Remove duplicates and sort
            days = Array.from(new Set(days)).sort((a, b) => a - b);
        }
        
        return {
            days,
            hour: isNaN(hour) ? 10 : hour,
            minute: isNaN(minute) ? 0 : minute
        };
    } catch (error) {
        console.error("Failed to parse cron expression:", cron, error);
        return defaultSchedule;
    }
}
