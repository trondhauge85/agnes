import { handler } from "../router";
import { handleScheduled } from "../scheduled";

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type WorkerFetchHandler = (
  request: Request,
  env: Record<string, string>,
  ctx: WorkerContext
) => Promise<Response>;

type WorkerScheduledHandler = (
  event: { scheduledTime: number; cron: string },
  env: Record<string, string>,
  ctx: WorkerContext
) => void | Promise<void>;

const fetch: WorkerFetchHandler = async (request) => handler(request);

const scheduled: WorkerScheduledHandler = async (event, _env, ctx) => {
  ctx.waitUntil(handleScheduled(event));
};

export default {
  fetch,
  scheduled
};
