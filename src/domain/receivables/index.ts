/** Дебиторка: счета минус платежи, всё в целых тиынах. */
export interface InvoiceIn { id: string; clientId: string | null; number: string; issueDate: string; amount: number; termsDays: number | null }
export interface PaymentIn { documentId: string | null; amount: number }
export interface Receivable {
  id: string; clientId: string | null; number: string; issueDate: string; dueDate: string | null;
  totalTiyn: number; paidTiyn: number; outstandingTiyn: number; overdueDays: number; status: "paid" | "open" | "overdue";
}

const toTiyn = (x: number) => Math.round(x * 100);
const DAY = 86_400_000;
const day = (s: string) => Date.parse(s + "T00:00:00Z");

export function addDays(date: string, n: number): string {
  return new Date(day(date) + n * DAY).toISOString().slice(0, 10);
}

export function computeReceivables(invoices: InvoiceIn[], payments: PaymentIn[], todayKey: string): Receivable[] {
  const paid = new Map<string, number>();
  for (const p of payments) if (p.documentId) paid.set(p.documentId, (paid.get(p.documentId) ?? 0) + toTiyn(p.amount));
  return invoices.map((i) => {
    const total = toTiyn(i.amount);
    const paidT = paid.get(i.id) ?? 0;
    const out = Math.max(0, total - paidT);
    const due = i.termsDays === null ? null : addDays(i.issueDate, i.termsDays);
    const overdueDays = out > 0 && due !== null && due < todayKey ? Math.round((day(todayKey) - day(due)) / DAY) : 0;
    return {
      id: i.id, clientId: i.clientId, number: i.number, issueDate: i.issueDate, dueDate: due,
      totalTiyn: total, paidTiyn: paidT, outstandingTiyn: out, overdueDays,
      status: out === 0 ? "paid" : overdueDays > 0 ? "overdue" : "open",
    };
  });
}
