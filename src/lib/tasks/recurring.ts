export type RecurringPattern = 'daily' | 'weekdays' | 'weekly';

export interface RecurringConfigInput {
  pattern: RecurringPattern;
  hour: number;
  minute: number;
  dayOfWeek?: number;
}

const WEEKDAY_VALUES = [1, 2, 3, 4, 5];

export function buildCronExpression(config: RecurringConfigInput) {
  const minute = clampNumber(config.minute, 0, 59);
  const hour = clampNumber(config.hour, 0, 23);

  if (config.pattern === 'weekdays') {
    return `${minute} ${hour} * * 1-5`;
  }

  if (config.pattern === 'weekly') {
    const day = clampNumber(config.dayOfWeek ?? 1, 0, 6);
    return `${minute} ${hour} * * ${day}`;
  }

  return `${minute} ${hour} * * *`;
}

export function parseCronExpression(cronExpression: string) {
  const parts = cronExpression.trim().split(/\s+/);

  if (parts.length !== 5) {
    throw new Error('Cron expression không hợp lệ');
  }

  const [minuteRaw, hourRaw, dayOfMonth, month, dayOfWeek] = parts;
  const minute = Number.parseInt(minuteRaw, 10);
  const hour = Number.parseInt(hourRaw, 10);

  if (!Number.isFinite(minute) || !Number.isFinite(hour)) {
    throw new Error('Cron expression không hợp lệ');
  }

  if (dayOfMonth !== '*' || month !== '*') {
    throw new Error('Chỉ hỗ trợ recurring daily/weekdays/weekly');
  }

  if (dayOfWeek === '*') {
    return {
      pattern: 'daily' as const,
      hour,
      minute,
    };
  }

  if (dayOfWeek === '1-5') {
    return {
      pattern: 'weekdays' as const,
      hour,
      minute,
    };
  }

  const parsedDay = Number.parseInt(dayOfWeek, 10);
  if (!Number.isFinite(parsedDay) || parsedDay < 0 || parsedDay > 6) {
    throw new Error('Chỉ hỗ trợ recurring daily/weekdays/weekly');
  }

  return {
    pattern: 'weekly' as const,
    hour,
    minute,
    dayOfWeek: parsedDay,
  };
}

export function getNextRunFromCronExpression(cronExpression: string, fromDate = new Date()) {
  const parsed = parseCronExpression(cronExpression);
  const candidate = new Date(fromDate);
  candidate.setSeconds(0, 0);

  for (let i = 0; i < 370; i += 1) {
    candidate.setDate(candidate.getDate() + (i === 0 ? 0 : 1));
    candidate.setHours(parsed.hour, parsed.minute, 0, 0);

    if (candidate <= fromDate) {
      continue;
    }

    if (parsed.pattern === 'daily') {
      return candidate;
    }

    if (parsed.pattern === 'weekdays' && WEEKDAY_VALUES.includes(normalizeJsDay(candidate.getDay()))) {
      return candidate;
    }

    if (parsed.pattern === 'weekly' && normalizeJsDay(candidate.getDay()) === parsed.dayOfWeek) {
      return candidate;
    }
  }

  throw new Error('Không thể tính lần chạy tiếp theo');
}

function normalizeJsDay(day: number) {
  return day === 0 ? 0 : day;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}
