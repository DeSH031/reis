/** Разбор свободного текста в черновик рейса без нейросети: города, ставка, дата, вес, клиент. */
export const CITIES = [
  "Алматы", "Астана", "Шымкент", "Караганда", "Актобе", "Атырау", "Павлодар", "Костанай", "Усть-Каменогорск",
  "Хоргос", "Актау", "Тараз", "Кызылорда", "Семей", "Петропавловск", "Уральск", "Талдыкорган", "Кокшетау",
];
const ALIASES: Record<string, string> = { "нур-султан": "Астана", "нурсултан": "Астана", "уск": "Усть-Каменогорск", "оскемен": "Усть-Каменогорск", "хоргос (граница)": "Хоргос" };

export interface TripDraft { origin: string | null; dest: string | null; price: number | null; loadingDate: string | null; weightT: number | null; clientId: string | null }

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const stem = (c: string) => norm(c).slice(0, Math.max(4, norm(c).length - 2));

function addDays(key: string, n: number): string {
  return new Date(Date.parse(key + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
}

export function parseTripText(text: string, todayKey: string, clients: { id: string; name: string }[] = []): TripDraft {
  const t = norm(text);
  // города в порядке упоминания: первый — откуда, второй — куда
  const found: { city: string; pos: number }[] = [];
  const dictionary = [...CITIES.map((c) => [norm(c), c] as const), ...Object.entries(ALIASES).map(([a, c]) => [a, c] as const)];
  for (const [key, city] of dictionary) {
    const probe = key.includes("-") || key.length < 5 ? key : stem(city);
    const pos = t.indexOf(probe);
    if (pos >= 0 && !found.some((f) => f.city === city)) found.push({ city, pos });
  }
  found.sort((a, b) => a.pos - b.pos);

  let price: number | null = null;
  const m = t.match(/(\d[\d\s]*[.,]?\d*)\s*(тыс|к\b|k\b|тг|₸|тенге)?/g) ?? [];
  for (const raw of m) {
    const mm = raw.match(/^(\d[\d\s]*[.,]?\d*)\s*(тыс|к|k|тг|₸|тенге)?$/);
    if (!mm) continue;
    let v = Number(mm[1].replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(v)) continue;
    if (mm[2] === "тыс" || mm[2] === "к" || mm[2] === "k") v *= 1000;
    if (v >= 20_000 && v <= 50_000_000 && (price === null || v > price)) price = v;
  }

  const w = t.match(/(\d+(?:[.,]\d+)?)\s*(?:т\b|тонн)/);
  let loadingDate: string | null = null;
  if (/послезавтра/.test(t)) loadingDate = addDays(todayKey, 2);
  else if (/завтра/.test(t)) loadingDate = addDays(todayKey, 1);
  else if (/сегодня/.test(t)) loadingDate = todayKey;
  else {
    const d = t.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
    if (d) {
      const year = d[3] ? (d[3].length === 2 ? 2000 + Number(d[3]) : Number(d[3])) : Number(todayKey.slice(0, 4));
      const mo = Number(d[2]), da = Number(d[1]);
      if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) loadingDate = `${year}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }

  const client = clients.find((c) => t.includes(norm(c.name)));
  return {
    origin: found[0]?.city ?? null, dest: found[1]?.city ?? null, price, loadingDate,
    weightT: w ? Number(w[1].replace(",", ".")) : null, clientId: client?.id ?? null,
  };
}
