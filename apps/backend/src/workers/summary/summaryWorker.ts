import type { Family } from "../../types";
import { listFamilies, findFamily } from "../../data/families";
import type { LlmService } from "../../llm";
import { createMessageService } from "../../communications/messageService";
import { createFamilySummaryDataFetcher } from "./summaryData";
import {
  createDailySummaryPeriod,
  createWeeklySummaryPeriod,
  type SummaryPeriod
} from "./summaryPeriods";

type MessageService = ReturnType<typeof createMessageService>;

type SummaryWorkerDependencies = {
  llmService: LlmService;
  messageService: MessageService;
  listFamilies?: typeof listFamilies;
  findFamily?: typeof findFamily;
  fetchSummaryData?: ReturnType<typeof createFamilySummaryDataFetcher>;
  now?: () => Date;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

const formatItems = (items: string[]): string =>
  items.length > 0 ? items.join("\n") : "None";

const buildSummaryInput = (
  family: Family,
  period: SummaryPeriod,
  data: Awaited<ReturnType<ReturnType<typeof createFamilySummaryDataFetcher>>>
): Record<string, string> => ({
  familyName: family.name,
  periodLabel: period.label,
  calendarItems: formatItems(
    data.events.map((event) => `${event.title} (${formatDateTime(event.start.dateTime)})`)
  ),
  todoItems: formatItems(
    data.todos.map((todo) => `${todo.title}${todo.notes ? ` - ${todo.notes}` : ""}`)
  ),
  mealItems: formatItems(
    data.meals.map((meal) => {
      const when = meal.scheduledFor ? formatDateTime(meal.scheduledFor) : "TBD";
      return `${meal.title} (${meal.mealType}) - ${when}`;
    })
  ),
  shoppingItems: formatItems(
    data.shoppingList.map((item) => {
      const quantity = item.quantity ? `${item.quantity} ` : "";
      const unit = item.unit ? `${item.unit} ` : "";
      const details = item.notes ? ` - ${item.notes}` : "";
      return `${quantity}${unit}${item.title}${details}`.trim();
    })
  ),
  userMessage: "Summarize the family's upcoming plans and tasks."
});

const buildIdempotencyKey = (familyId: string, period: SummaryPeriod): string =>
  `family-summary-${familyId}-${period.start.toISOString().slice(0, 10)}`;

const getSmsRecipients = (family: Family): string[] =>
  family.members
    .map((member) => member.phoneNumber)
    .filter((phoneNumber): phoneNumber is string => Boolean(phoneNumber));

export const createSummaryWorker = (deps: SummaryWorkerDependencies) => {
  const {
    llmService,
    messageService,
    listFamilies: listFamiliesFn = listFamilies,
    findFamily: findFamilyFn = findFamily,
    fetchSummaryData = createFamilySummaryDataFetcher(),
    now = () => new Date()
  } = deps;

  const runSummaryForFamily = async (
    family: Family,
    period: SummaryPeriod
  ): Promise<void> => {
    const data = await fetchSummaryData(family.id, period);
    const input = buildSummaryInput(family, period, data);
    const result = await llmService.runTask({
      skillName: "family_summary_sms",
      input
    });
    const summaryText = result.response.message.content.trim();
    const recipients = getSmsRecipients(family);
    if (recipients.length === 0 || !summaryText) {
      return;
    }
    await messageService.sendSmsGroup({
      to: recipients,
      message: summaryText,
      idempotencyKey: buildIdempotencyKey(family.id, period)
    });
  };

  const runSummaryForFamilyId = async (
    familyId: string,
    period: SummaryPeriod
  ): Promise<void> => {
    const family = await findFamilyFn(familyId);
    if (!family) {
      return;
    }
    await runSummaryForFamily(family, period);
  };

  const runSummaries = async (
    periodBuilder: (value: Date) => SummaryPeriod
  ): Promise<void> => {
    const period = periodBuilder(now());
    const families = await listFamiliesFn();
    for (const family of families) {
      await runSummaryForFamily(family, period);
    }
  };

  const runWeeklySummaries = async (): Promise<void> =>
    runSummaries(createWeeklySummaryPeriod);

  const runDailySummaries = async (): Promise<void> =>
    runSummaries(createDailySummaryPeriod);

  return {
    runWeeklySummaries,
    runDailySummaries,
    runWeeklySummaryForFamily: (familyId: string) =>
      runSummaryForFamilyId(familyId, createWeeklySummaryPeriod(now())),
    runDailySummaryForFamily: (familyId: string) =>
      runSummaryForFamilyId(familyId, createDailySummaryPeriod(now()))
  };
};
