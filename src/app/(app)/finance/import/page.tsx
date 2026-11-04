import Link from "next/link";
import { createClient } from "@/core/supabase/server";
import { requireOrg } from "@/core/session";
import { Button, Card, PageHeader, inputCls } from "@/core/ui";
import { importStatement } from "./actions";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ ok?: string; no?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documents").select("number,amount_total,issue_date").eq("org_id", ctx.orgId).eq("doc_type", "invoice").in("status", ["issued", "sent", "signed"]).order("issue_date", { ascending: false }).limit(2);
  const sample = (docs ?? []).map((d, i) => `2026-11-0${i + 3};${d.amount_total};Оплата по счёту ${d.number}`).join("\n");
  return (
    <>
      <PageHeader title="Импорт банковской выписки" actions={<Link href="/finance" className="text-sm text-accent">← К финансам</Link>} />
      {sp.ok !== undefined && <Card className="mb-4 text-sm">Загружено: сопоставлено со счетами {sp.ok}, без счёта {sp.no}.</Card>}
      <Card>
        <p className="mb-3 text-sm text-muted">Вставьте строки вида «дата;сумма;назначение платежа». Платёж привяжется к счёту по номеру в назначении или по точной сумме остатка. Загрузка из файла банка появится позже.</p>
        <form action={importStatement} className="grid gap-3">
          <textarea name="csv" rows={6} defaultValue={sample} className={inputCls + " py-2 font-mono"} aria-label="Строки выписки" />
          <div><Button type="submit">Загрузить</Button></div>
        </form>
      </Card>
    </>
  );
}
