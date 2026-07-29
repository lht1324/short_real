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
    
    // If no days are selected, use 'NONE' to avoid '*' (which means every day)
    // and let the UI handle the validation error.
    if (days.length === 0) {
        return `${minStr} ${hourStr} * * NONE`;
    }
    
    // If all days are selected, use '*'
    const daysStr = days.length === 7
        ? "*" 
        : [...days].sort((a, b) => a - b).join(",");
        
    return `${minStr} ${hourStr} * * ${daysStr}`;
}

/**
 * Subtracts n hours from a cron expression.
 * Handles hour wrap-around and adjusts the day of the week accordingly.
 * Supported format: "min hour day month dayOfWeek" (5 fields)
 */
export function subtractHoursFromCron(cron: string, hoursToSubtract: number): string {
    if (!cron || cron === "NONE") return cron;
    
    const parts = cron.split(" ");
    if (parts.length < 5) return cron;

    let minute = parseInt(parts[0], 10);
    let hour = parseInt(parts[1], 10);
    const dayOfMonth = parts[2];
    const month = parts[3];
    const dayOfWeekPart = parts[4];

    if (isNaN(hour)) return cron;

    // Adjust hour and track day shifts
    let dayShift = 0;
    hour -= hoursToSubtract;

    while (hour < 0) {
        hour += 24;
        dayShift -= 1;
    }

    // Adjust day of week if necessary
    let newDayOfWeek = dayOfWeekPart;
    if (dayShift !== 0 && dayOfWeekPart !== "*") {
        const days = dayOfWeekPart.split(",").map(d => {
            let day = parseInt(d, 10);
            if (day === 7) day = 0; // Normalize 7 to 0
            
            // Apply shift (mod 7 handles negative numbers correctly in JS as (n % 7 + 7) % 7)
            const shifted = (((day + dayShift) % 7) + 7) % 7;
            return shifted;
        });
        newDayOfWeek = Array.from(new Set(days)).sort((a, b) => a - b).join(",");
    }

    return `${minute} ${hour} ${dayOfMonth} ${month} ${newDayOfWeek}`;
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
        } else if (daysPart === "NONE") {
            days = [];
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

/**
 * 현재 시간 기준으로 오토파일럿 Generation 윈도우가 닫혀 있는지 검증합니다.
 * (스케줄 업로드 시간 기준 2시간 전부터 업로드 시간 사이인지 검증)
 */
export function isAutopilotWindowClosed(cron: string, timezone?: string): boolean {
    if (!cron || cron === "NONE") return false;

    const schedule = cronToWeekly(cron);
    const { days: selectedDays, hour: scheduledHour, minute: scheduledMinute } = schedule;

    if (selectedDays.length === 0) return false;

    const now = new Date();
    try {
        const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // 1. target timezone 기준 현재 시, 분 획득
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        
        // 2. target timezone 기준 현재 요일 획득
        const formatterDay = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            weekday: 'short'
        });
        const dayOfWeekStr = formatterDay.format(now);
        const dayMap: Record<string, number> = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
        };
        const targetTimezoneDay = dayMap[dayOfWeekStr] ?? now.getDay();
        
        const isTodayScheduled = selectedDays.includes(targetTimezoneDay);
        if (!isTodayScheduled) return false;

        // 업로드 시각 2시간 전을 generation 시작 시간으로 잡음
        let genHour = scheduledHour - 2;
        if (genHour < 0) genHour += 24;

        const currentTimeInMinutes = (currentHour * 60) + currentMinute;
        const genStartTimeInMinutes = (genHour * 60) + scheduledMinute;
        const uploadTimeInMinutes = (scheduledHour * 60) + scheduledMinute;

        // 자정을 걸치는 윈도우 구간(예: 23:00 ~ 01:00) 연산 보정
        return genStartTimeInMinutes > uploadTimeInMinutes
            ? (currentTimeInMinutes >= genStartTimeInMinutes || currentTimeInMinutes < uploadTimeInMinutes)
            : (currentTimeInMinutes >= genStartTimeInMinutes && currentTimeInMinutes < uploadTimeInMinutes);
    } catch (e) {
        console.error("Timezone offset calc error:", e);
        return false;
    }
}
