import Link from "next/link";
import { createClient } from "@/core/supabase/server";
import { canEditPayments, requireOrg } from "@/core/session";
import { Button, Card, EmptyState, PageHeader, cx, inputCls } from "@/core/ui";
import { formatDate, formatMoney } from "@/core/format";
import { almatyDayKey } from "@/domain/profit";
import { computeReceivables } from "@/domain/receivables";
import { addPayment } from "./actions";

export default async function FinancePage() {
  const ctx = await requireOrg();
  const supabase = await createClient();
  const [{ data: docs }, { data: pays }, { data: clients }] = await Promise.all([
    supabase.from("documents").select("id,client_id,number,issue_date,amount_total").eq("org_id", ctx.orgId).eq("doc_type", "invoice").neq("status", "draft").limit(2000),
    supabase.from("payments").select("id,document_id,client_id,amount,paid_at,purpose").eq("org_id", ctx.orgId).order("paid_at", { ascending: false }).limit(2000),
    supabase.from("clients").select("id,name,payment_terms_days").eq("org_id", ctx.orgId).limit(500),
  ]);
  const cl = new Map((clients ?? []).map((c) => [c.id, c]));
  const rec = computeReceivables(
    (docs ?? []).map((d) => ({ id: d.id, clientId: d.client_id, number: d.number, issueDate: d.issue_date, amount: Number(d.amount_total), termsDays: cl.get(d.client_id ?? "")?.payment_terms_days ?? null })),
    (pays ?? []).map((p) => ({ documentId: p.document_id, amount: Number(p.amount) })),
    almatyDayKey(new Date()),
  );
  const open = rec.filter((r) => r.outstandingTiyn > 0).sort((a, b) => b.overdueDays - a.overdueDays || b.outstandingTiyn - a.outstandingTiyn);
  const sum = (xs: typeof rec) => xs.reduce((s, r) => s + r.outstandingTiyn, 0) / 100;
  const overdue = open.filter((r) => r.status === "overdue");

  return (
    <>
      <PageHeader title="Финансы" subtitle="Дебиторка и платежи" actions={<Link href="/finance/import" className="text-sm text-accent">Импорт выписки</Link>} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card><div className="text-sm text-muted">Ждём оплаты</div><div className="mt-1 text-2xl font-semibold">{formatMoney(sum(open))}</div><div className="text-sm text-muted">{open.length} счетов</div></Card>
        <Card><div className="text-sm text-muted">Просрочено</div><div className="mt-1 text-2xl font-semibold text-negative">{formatMoney(sum(overdue))}</div><div className="text-sm text-muted">{overdue.length} счетов</div></Card>
        <Card><div className="text-sm text-muted">Платежей получено</div><div className="mt-1 text-2xl font-semibold">{pays?.length ?? 0}</div></Card>
      </div>
      <h2 className="mb-2 font-medium">Неоплаченные счета</h2>
      {!open.length ? <EmptyState title="Все счета оплачены" /> : (
        <div className="mb-6 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted"><tr>{["Счёт", "Клиент", "Выставлен", "Срок", "Остаток", "Просрочка"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{open.slice(0, 100).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.number}</td>
                <td className="px-3 py-2">{cl.get(r.clientId ?? "")?.name ?? "—"}</td>
                <td className="px-3 py-2">{formatDate(r.issueDate)}</td>
                <td className="px-3 py-2">{r.dueDate ? formatDate(r.dueDate) : "срок не задан"}</td>
                <td className="px-3 py-2">{formatMoney(r.outstandingTiyn / 100)}</td>
                <td className={cx("px-3 py-2", r.overdueDays > 0 && "text-negative")}>{r.overdueDays > 0 ? `${r.overdueDays} дн.` : "—"}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      {canEditPayments(ctx.role) && open.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium">Внести платёж</h2>
          <form action={addPayment} className="grid gap-3 sm:grid-cols-4">
            <select name="document_id" required className={inputCls}>{open.slice(0, 100).map((r) => <option key={r.id} value={r.id}>{r.number} · {cl.get(r.clientId ?? "")?.name ?? "—"} · {formatMoney(r.outstandingTiyn / 100)}</option>)}</select>
            <input name="amount" type="number" step="any" min="0.01" required placeholder="Сумма, ₸" className={inputCls} />
            <input name="paid_at" type="date" required defaultValue={almatyDayKey(new Date())} className={inputCls} />
            <Button type="submit">Сохранить</Button>
          </form>
        </Card>
      )}
      <h2 className="mb-2 font-medium">Последние платежи</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm"><tbody>{(pays ?? []).slice(0, 20).map((p) => (
          <tr key={p.id} className="border-t border-border first:border-0">
            <td className="px-3 py-2">{formatDate(p.paid_at)}</td><td className="px-3 py-2">{cl.get(p.client_id ?? "")?.name ?? "—"}</td>
            <td className="px-3 py-2 text-right">{formatMoney(Number(p.amount))}</td></tr>))}</tbody></table>
      </div>
    </>
  );
}
