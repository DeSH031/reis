const NBSP = " ";
const MINUS = "−";
const TZ = "Asia/Almaty";

function group(n: number): string {
  const s = Math.abs(Math.trunc(n)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatMoney(value: number): string {
  const r = Math.round(value);
  return `${r < 0 ? MINUS : ""}${group(r)}${NBSP}₸`;
}

export function formatSignedMoney(value: number): string {
  const r = Math.round(value);
  if (r === 0) return `0${NBSP}₸`;
  return `${r < 0 ? MINUS : "+"}${group(r)}${NBSP}₸`;
}

export function formatPercent(value: number, digits = 1): string {
  const s = Math.abs(value).toFixed(digits).replace(".", ",");
  return `${value < 0 ? MINUS : ""}${s}${NBSP}%`;
}

export function formatCompactMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : "";
  const fmt = (x: number) => x.toFixed(1).replace(".", ",").replace(/,0$/, "");
  if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000)}${NBSP}млрд${NBSP}₸`;
  if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000)}${NBSP}млн${NBSP}₸`;
  if (abs >= 1_000) return `${sign}${fmt(abs / 1_000)}${NBSP}тыс.${NBSP}₸`;
  return formatMoney(value);
}

export function formatDistance(km: number): string {
  return `${group(km)}${NBSP}км`;
}

export function formatDate(d: Date | string): string {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
  }).format(typeof d === "string" ? new Date(d) : d);
  return parts;
}
