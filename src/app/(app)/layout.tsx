import { requireOrg } from "@/core/session";
import { NavLinks } from "./nav";
import { logout } from "@/app/login/actions";
import { resetDemo } from "./actions";
import { Button } from "@/core/ui";
import { t } from "@/core/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-border bg-surface p-4 md:flex md:flex-col md:gap-6">
        <div>
          <p className="text-lg font-semibold">{t("app.name")}</p>
          <p className="text-xs text-muted">{ctx.orgName}</p>
        </div>
        <NavLinks />
        <form action={logout} className="mt-auto">
          <Button variant="ghost" type="submit" className="w-full justify-start">Выйти</Button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-col pb-16 md:pb-0">
        {ctx.isDemo && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-accent-soft px-4 py-2 text-sm text-accent">
            <span>{t("demo.banner")}</span>
            {ctx.role === "owner" && (
              <form action={resetDemo}>
                <button type="submit" className="min-h-11 font-medium underline">Сбросить демо</button>
              </form>
            )}
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface p-1 md:hidden">
        <NavLinks mobile />
      </div>
    </div>
  );
}
