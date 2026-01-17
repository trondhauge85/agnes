export type ScheduledInfo = {
  scheduledTime: number;
  cron: string;
};

export const handleScheduled = async (info: ScheduledInfo): Promise<void> => {
  const timestamp = new Date(info.scheduledTime).toISOString();
  console.log(`Scheduled run at ${timestamp} (cron: ${info.cron})`);
};
