import { demoLogin, magicLink, passwordLogin } from "./actions";
import { Button, Card, inputCls } from "@/core/ui";
import { t } from "@/core/i18n";

const ERRORS: Record<string, string> = {
  invalid: "Неверная почта или пароль",
  "demo-off": "Демо-вход не настроен",
  "demo-failed": "Не удалось войти в демо, попробуйте ещё раз",
  "no-org": "Для этого пользователя не назначена организация",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
      {sp.error && <p role="alert" className="rounded-lg bg-surface-2 p-3 text-sm text-negative">{ERRORS[sp.error] ?? "Ошибка входа"}</p>}
      {sp.sent && <p className="rounded-lg bg-surface-2 p-3 text-sm">Ссылка для входа отправлена на почту.</p>}
      <form action={demoLogin}>
        <Button type="submit" className="w-full">{t("login.demo")}</Button>
      </form>
      <Card>
        <form action={passwordLogin} className="flex flex-col gap-3">
          <input name="email" type="email" required placeholder="Почта" autoComplete="email" className={inputCls} />
          <input name="password" type="password" required placeholder="Пароль" autoComplete="current-password" className={inputCls} />
          <Button type="submit" variant="secondary">Войти</Button>
        </form>
        <form action={magicLink} className="mt-3 flex gap-2">
          <input name="email" type="email" required placeholder="Или ссылка на почту" className={inputCls} />
          <Button type="submit" variant="ghost">Отправить</Button>
        </form>
      </Card>
    </main>
  );
}
