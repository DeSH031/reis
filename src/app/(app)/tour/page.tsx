import Link from "next/link";
import { Card, PageHeader } from "@/core/ui";

const STEPS = [
  { href: "/dashboard", title: "Обзор", text: "Прибыль за 30 дней, маржа, просрочка клиентов. Видно, сколько рейсов без данных по расходам." },
  { href: "/trips", title: "Рейсы", text: "Таблица и канбан. У каждого доставленного рейса своя прибыль или пометка «не хватает данных»." },
  { href: "/trips/new?q=Алматы Астана завтра 22 т 600000", title: "Быстрый ввод", text: "Рейс создаётся из одной строки текста, как диспетчер пишет в мессенджере." },
  { href: "/finance", title: "Финансы", text: "Кто сколько должен и на сколько дней просрочка. Платёж вносится в два клика." },
  { href: "/finance/import", title: "Банковская выписка", text: "Платежи сами привязываются к счетам по номеру или сумме." },
  { href: "/alerts", title: "Оповещения", text: "Убыточные рейсы, просрочки и пропуски в данных в одном списке." },
];

export default function Tour() {
  return (
    <>
      <PageHeader title="Режим показа" subtitle="Маршрут демо на 5 минут: идите по шагам сверху вниз" />
      <ol className="space-y-3">{STEPS.map((s, i) => (
        <li key={s.href}>
          <Link href={s.href}><Card className="flex items-start gap-4 hover:bg-surface-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">{i + 1}</span>
            <span><span className="block text-lg font-medium">{s.title}</span><span className="text-sm text-muted">{s.text}</span></span>
          </Card></Link>
        </li>))}</ol>
    </>
  );
}
