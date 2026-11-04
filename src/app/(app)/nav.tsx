"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/core/ui";

const ITEMS = [
  { href: "/dashboard", label: "Обзор" },
  { href: "/trips", label: "Рейсы" },
  { href: "/documents", label: "Документы" },
  { href: "/finance", label: "Финансы" },
  { href: "/alerts", label: "Оповещения" },
  { href: "/directory/clients", label: "Справочники" },
  { href: "/settings", label: "Настройки" },
];

export function NavLinks({ mobile }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Основная навигация" className={cx(mobile ? "flex justify-around" : "flex flex-col gap-1")}>
      {ITEMS.map((i) => {
        const active = path === i.href || path.startsWith(i.href.split("/").slice(0, 2).join("/") + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium",
              active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2",
              mobile && "flex-1 justify-center px-1 text-xs",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
