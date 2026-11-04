import { createClient } from "@/core/supabase/server";
import { requireOrg } from "@/core/session";
import { Button, Card, PageHeader, inputCls } from "@/core/ui";
import { saveSettings } from "./actions";

function F({ label, name, value, type = "text" }: { label: string; name: string; value?: string | number | null; type?: string }) {
  return (
    <label className="text-sm"><span className="mb-1 block text-muted">{label}</span>
      <input name={name} type={type} step="any" defaultValue={value ?? ""} className={inputCls} /></label>
  );
}

export default async function SettingsPage() {
  const ctx = await requireOrg();
  const supabase = await createClient();
  const { data: s } = await supabase.from("org_settings").select("*").eq("org_id", ctx.orgId).maybeSingle();
  const r = (s?.requisites ?? {}) as Record<string, string>;
  const owner = ctx.role === "owner";
  return (
    <>
      <PageHeader title="Настройки" subtitle={ctx.orgName} />
      {!owner && <p className="mb-4 text-sm text-muted">Изменять настройки может только владелец.</p>}
      <form action={saveSettings} className="space-y-4">
        <fieldset disabled={!owner} className="space-y-4">
          <Card>
            <h2 className="mb-3 font-medium">Реквизиты (попадают в документы)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Название" name="req_name" value={r.name} /><F label="БИН/ИИН" name="req_bin" value={r.bin} />
              <F label="Адрес" name="req_address" value={r.address} /><F label="Телефон" name="req_phone" value={r.phone} />
              <F label="Банк" name="req_bank" value={r.bank} /><F label="БИК" name="req_bik" value={r.bik} />
              <F label="IBAN" name="req_iban" value={r.iban} />
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Налоги и расчёты</h2>
            <label className="mb-3 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="vat_payer" defaultChecked={!!s?.vat_payer} />Плательщик НДС</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Ставка НДС, %" name="vat_percent" type="number" value={s?.vat_percent} />
              <F label="Цена топлива, ₸/л" name="fuel_price" type="number" value={s?.fuel_price} />
              <F label="Суточные, ₸/сутки" name="per_diem" type="number" value={s?.per_diem} />
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Пороги оповещений</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Минимальная маржа, %" name="margin_alert_percent" type="number" value={s?.margin_alert_percent} />
              <F label="Акт не подписан, дней" name="act_unsigned_days" type="number" value={s?.act_unsigned_days} />
            </div>
          </Card>
        </fieldset>
        {owner && <Button type="submit">Сохранить</Button>}
      </form>
    </>
  );
}
