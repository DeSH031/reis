import Link from "next/link";
import { formatDate, formatMoney } from "@/core/format";
import { canEditDocs, requireOrg } from "@/core/session";
import { createClient } from "@/core/supabase/server";
import { Card, EmptyState, PageHeader, cx } from "@/core/ui";
import { DOC_KINDS, DOC_STATUSES, type DocKind, type DocStatus } from "@/modules/documents/types";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id, number, doc_type, client_id, issue_date, amount_total, status, locked")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (sp.type && sp.type in DOC_KINDS) {
    query = query.eq("doc_type", sp.type);
  }
  if (sp.status && sp.status in DOC_STATUSES) {
    query = query.eq("status", sp.status);
  }

  const [{ data: docs }, { data: clients }] = await Promise.all([
    query,
    supabase.from("clients").select("id, name").eq("org_id", ctx.orgId).limit(500),
  ]);

  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const rows = docs ?? [];

  return (
    <>
      <PageHeader
        title="Документы"
        subtitle={`${rows.length} документов`}
        actions={
          canEditDocs(ctx.role) ? (
            <Link
              href="/documents/new"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90 transition"
            >
              Новый документ
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/documents"
          className={cx(
            "min-h-11 content-center rounded-lg border border-border px-3 font-medium",
            !sp.type && !sp.status && "bg-accent-soft text-accent",
          )}
        >
          Все типы
        </Link>
        {Object.entries(DOC_KINDS).map(([k, c]) => (
          <Link
            key={k}
            href={`/documents?type=${k}${sp.status ? `&status=${sp.status}` : ""}`}
            className={cx(
              "min-h-11 content-center rounded-lg border border-border px-3 font-medium",
              sp.type === k && "bg-accent-soft text-accent",
            )}
          >
            {c.shortLabel}
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="min-h-11 content-center text-xs text-muted mr-1">Статус:</span>
        <Link
          href={`/documents${sp.type ? `?type=${sp.type}` : ""}`}
          className={cx(
            "min-h-11 content-center rounded-lg border border-border px-3 text-xs",
            !sp.status && "bg-surface-2 font-medium",
          )}
        >
          Любой
        </Link>
        {Object.entries(DOC_STATUSES).map(([k, s]) => (
          <Link
            key={k}
            href={`/documents?status=${k}${sp.type ? `&type=${sp.type}` : ""}`}
            className={cx(
              "min-h-11 content-center rounded-lg border border-border px-3 text-xs",
              sp.status === k && "bg-surface-2 font-medium",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {!rows.length ? (
        <EmptyState
          title="Документов пока нет"
          hint="Сформируйте первый документ по кнопке выше или снимите фильтры"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted">
              <tr>
                {["№", "Тип", "Клиент", "Дата", "Сумма", "Статус", "Действия"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const kind = DOC_KINDS[d.doc_type as DocKind];
                const status = DOC_STATUSES[d.status as DocStatus] ?? { label: d.status, color: "" };
                return (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono font-medium">
                      <a
                        href={`/documents/${d.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline"
                      >
                        {d.number}
                      </a>
                    </td>
                    <td className="px-3 py-2">{kind?.label ?? d.doc_type}</td>
                    <td className="px-3 py-2">{clientName.get(d.client_id ?? "") ?? "—"}</td>
                    <td className="px-3 py-2">{d.issue_date ? formatDate(d.issue_date) : "—"}</td>
                    <td className="px-3 py-2 font-medium">{formatMoney(Number(d.amount_total))}</td>
                    <td className="px-3 py-2">
                      <span className={cx("text-xs font-medium", status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`/documents/${d.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded border border-border px-3 text-xs font-medium hover:bg-surface-2"
                      >
                        Открыть PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Card className="mt-6 text-sm text-muted">
        Документы формируются со строгой сквозной нумерацией по правилам документооборота Республики Казахстан. После выставления документ фиксируется в виде неизменяемого слепка данных.
      </Card>
    </>
  );
}
