import Link from "next/link";
import { demoLogin } from "@/app/login/actions";
import { Button } from "@/core/ui";
import { t } from "@/core/i18n";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-6">
      <p className="text-sm font-medium text-accent">{t("app.name")}</p>
      <h1 className="text-4xl font-semibold tracking-tight">Документы, прибыль по рейсам и дебиторка в одном месте</h1>
      <p className="text-lg text-muted">
        Заявка, счёт, акт и ТТН в один клик. Реальная прибыль по каждому рейсу, неподписанные акты и отчёт в Telegram каждое утро.
      </p>
      <div className="flex flex-wrap gap-3">
        <form action={demoLogin}>
          <Button type="submit">{t("login.demo")}</Button>
        </form>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">
          Войти
        </Link>
      </div>
    </main>
  );
}
