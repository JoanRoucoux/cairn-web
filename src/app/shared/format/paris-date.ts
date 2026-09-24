const PARIS_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' });
const PARIS_TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
});

/** The calendar date in Paris, as yyyy-MM-dd, for a given instant. */
export const parisDateString = (date: Date): string => PARIS_DATE_FORMAT.format(date);

/** The wall-clock time in Paris, as HH:mm, for an ISO instant. */
export const parisTimeString = (iso: string): string => PARIS_TIME_FORMAT.format(new Date(iso));
