import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { canEditTrips, requireOrg } from "@/core/session";
import { Button, Card, EmptyState, PageHeader, cx, inputCls } from "@/core/ui";
import { KINDS, type Kind } from "@/modules/directory-config";
import { createRecord } from "../actions";

export default async function DirectoryPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(kind in KINDS)) notFound();
  const cfg = KINDS[kind as Kind];
  const ctx = await requireOrg();
  const supabase = await createClient();
  const { data: rows } = await supabase.from(cfg.table).select("*").eq("org_id", ctx.orgId).order(cfg.order).limit(500);
  const create = createRecord.bind(null, kind as Kind);

  return (
    <>
      <PageHeader title={cfg.title} subtitle={`${rows?.length ?? 0} записей`} />
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(KINDS).map(([k, c]) => (
          <Link key={k} href={`/directory/${k}`} className={cx("min-h-11 content-center rounded-lg border border-border px-3 text-sm", k === kind && "bg-accent-soft text-accent")}>
            {c.title}
          </Link>
        ))}
      </div>
      {!rows?.length ? (
        <EmptyState title={`Пока нет записей: ${cfg.title.toLowerCase()}`} hint="Добавьте первую запись ниже" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted">
              <tr>{cfg.columns.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r: Record<string, unknown>) => (
                <tr key={String(r.id)} className="border-t border-border">
                  {cfg.columns.map((c) => (
                    <td key={c.key} className="px-3 py-2">{c.fmt ? c.fmt(r[c.key]) : String(r[c.key] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canEditTrips(ctx.role) && (
        <Card className="mt-6">
          <h2 className="mb-3 font-medium">Добавить {cfg.singular}</h2>
          <form action={create} className="grid gap-3 sm:grid-cols-2">
            {cfg.fields.map((f) =>
              f.type === "checkbox" ? (
                <label key={f.name} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name={f.name} />{f.label}</label>
              ) : f.type === "select" ? (
                <label key={f.name} className="text-sm"><span className="mb-1 block text-muted">{f.label}</span>
                  <select name={f.name} className={inputCls}>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              ) : (
                <label key={f.name} className="text-sm"><span className="mb-1 block text-muted">{f.label}</span>
                  <input name={f.name} type={f.type === "number" ? "number" : "text"} step="any" required={f.required} className={inputCls} /></label>
              ),
            )}
            <div className="sm:col-span-2"><Button type="submit">Сохранить</Button></div>
          </form>
        </Card>
      )}
    </>
  );
}
