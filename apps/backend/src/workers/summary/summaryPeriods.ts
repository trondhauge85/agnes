export type SummaryPeriod = {
  start: Date;
  end: Date;
  label: string;
};

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);

export const createDailySummaryPeriod = (now: Date): SummaryPeriod => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  const label = `today (${formatDate(start)})`;
  return { start, end, label };
};

export const createWeeklySummaryPeriod = (now: Date): SummaryPeriod => {
  const start = new Date(now);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  const label = `${formatDate(start)} - ${formatDate(end)}`;
  return { start, end, label };
};
