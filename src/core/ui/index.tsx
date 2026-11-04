import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" };
export function Button({ variant = "primary", className, ...p }: BtnProps) {
  const v = {
    primary: "bg-accent text-accent-fg hover:opacity-90",
    secondary: "bg-surface border border-border hover:bg-surface-2",
    ghost: "hover:bg-surface-2",
    danger: "bg-negative text-white hover:opacity-90",
  }[variant];
  return (
    <button
      {...p}
      className={cx("inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-50", v, className)}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-border bg-surface p-5", className)}>{children}</div>;
}

export function PageHeader({ title, actions, subtitle }: { title: string; actions?: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm placeholder:text-muted";
