import Link from "next/link";
import { requireOrg } from "@/core/session";
import { Button, Card, PageHeader, inputCls } from "@/core/ui";
import { importTrips } from "./actions";

const ERR: Record<string, string> = { file: "Выберите файл (до 2 МБ).", read: "Не удалось прочитать файл. Нужен .xlsx или .csv.", cols: "Не найдены колонки «Откуда», «Куда», «Ставка» в первой строке." };

/* eslint-disable @next/next/no-html-link-for-pages */
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; skip?: string; nc?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireOrg();
  return (
    <>
      <PageHeader title="Импорт рейсов из Excel" actions={<Link href="/trips" className="text-sm text-accent">← К рейсам</Link>} />
      {sp.err && <Card className="mb-4 text-sm text-red-700">{ERR[sp.err] ?? "Ошибка загрузки."}</Card>}
      {sp.ok !== undefined && (
        <Card className="mb-4 text-sm">
          Загружено рейсов: {sp.ok}. Пропущено строк: {sp.skip}. Клиентов не найдено в справочнике: {sp.nc}. <Link href="/trips" className="text-accent">Открыть рейсы →</Link>
        </Card>
      )}
      <Card>
        <p className="mb-3 text-sm text-muted">Загрузите вашу таблицу (.xlsx или .csv). В первой строке — названия колонок: Дата, Клиент, Откуда, Куда, Ставка, Км, Расходы (или отдельно Топливо и Зарплата водителя). Обязательны Откуда, Куда, Ставка. Одна сумма «Расходы» делится на топливо и зарплату и помечается как оценка. Рейсы с прошедшей датой станут «Доставлен», по ним сразу посчитается прибыль.</p>
        <form action={importTrips} className="grid gap-3">
          <input type="file" name="file" accept=".xlsx,.csv" className={inputCls + " py-2"} aria-label="Файл Excel" />
          <div className="flex items-center gap-4">
            <Button type="submit">Загрузить</Button>
            <a href="/trips/import/template" download className="text-sm text-accent">Скачать образец (CSV)</a>
          </div>
        </form>
      </Card>
    </>
  );
}
