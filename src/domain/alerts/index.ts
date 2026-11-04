import type { Receivable } from "@/domain/receivables";
import type { TripProfit } from "@/domain/profit";

export type Severity = "high" | "medium" | "low";
export interface Alert { key: string; severity: Severity; title: string; detail: string; href?: string }

export interface AlertTrip { id: string; label: string; status: string; profit: TripProfit }
export interface AlertThresholds { marginAlertPercent: number | null }

const SEV: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function buildAlerts(trips: AlertTrip[], receivables: Receivable[], clientName: (id: string | null) => string, th: AlertThresholds): Alert[] {
  const out: Alert[] = [];
  for (const t of trips) {
    const p = t.profit;
    if (p.cancelled) continue;
    if (p.flags.lossMaking) out.push({ key: `loss:${t.id}`, severity: "high", title: `Убыточный рейс ${t.label}`, detail: "Расходы превысили выручку", href: `/trips/${t.id}` });
    else if (p.flags.incomplete) out.push({ key: `inc:${t.id}`, severity: "medium", title: `Нет данных по расходам: ${t.label}`, detail: "Рейс доставлен, но прибыль не посчитать", href: `/trips/${t.id}` });
    else if (th.marginAlertPercent !== null && p.marginPct !== null && p.marginPct < th.marginAlertPercent)
      out.push({ key: `margin:${t.id}`, severity: "low", title: `Низкая маржа: ${t.label}`, detail: `Маржа ${p.marginPct.toFixed(1).replace(".", ",")} % ниже порога`, href: `/trips/${t.id}` });
  }
  for (const r of receivables) {
    if (r.status !== "overdue") continue;
    out.push({
      key: `overdue:${r.id}`, severity: r.overdueDays > 30 ? "high" : "medium",
      title: `Просрочен счёт ${r.number}`, detail: `${clientName(r.clientId)}: ${r.overdueDays} дн.`, href: "/finance",
    });
  }
  return out.sort((a, b) => SEV[a.severity] - SEV[b.severity]);
}
