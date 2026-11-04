import { ru, type MessageKey } from "./ru";

export type Locale = "ru";
const catalogs: Record<Locale, Record<MessageKey, string>> = { ru };

export function t(key: MessageKey, params?: Record<string, string | number>, locale: Locale = "ru"): string {
  let s = catalogs[locale][key] ?? ru[key];
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export type { MessageKey };
