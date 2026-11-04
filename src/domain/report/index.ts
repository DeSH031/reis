import { formatCompactMoney, formatMoney } from "@/core/format";

export interface ReportInput {
  orgName: string;
  dateLabel: string; // например "04.11.2026"
  deliveredTrips: number;
  profitKnownTiyn: number;
  incompleteTrips: number;
  lossMakingTrips: number;
  activeTrips: number;
  overdueCount: number;
  overdueTiyn: number;
  unassignedTomorrow: number;
}

/** Текст ежедневного отчёта. Без HTML-разметки, чтобы не ломаться на спецсимволах. */
export function buildDailyReport(r: ReportInput): string {
  const lines = [`${r.orgName}: итоги за ${r.dateLabel}`, ""];
  lines.push(`Доставлено рейсов: ${r.deliveredTrips}`);
  lines.push(r.deliveredTrips === 0 ? "Известная прибыль: нет доставленных рейсов" : `Известная прибыль: ${formatMoney(r.profitKnownTiyn / 100)}`);
  if (r.incompleteTrips > 0) lines.push(`Без данных по расходам: ${r.incompleteTrips} (прибыль по ним не посчитана)`);
  if (r.lossMakingTrips > 0) lines.push(`Убыточных рейсов: ${r.lossMakingTrips}`);
  lines.push(`В пути сейчас: ${r.activeTrips}`);
  lines.push(r.overdueCount > 0 ? `Просрочено счетов: ${r.overdueCount} на ${formatCompactMoney(r.overdueTiyn / 100)}` : "Просроченных счетов нет");
  if (r.unassignedTomorrow > 0) lines.push(`Завтра погрузка без машины: ${r.unassignedTomorrow}`);
  return lines.join("\n");
}
