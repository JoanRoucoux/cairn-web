const PARIS_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' });

export const parisDateString = (date: Date): string => PARIS_DATE_FORMAT.format(date);
