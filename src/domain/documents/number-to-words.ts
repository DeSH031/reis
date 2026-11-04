const ONES_M = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const ONES_F = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

const SCALES: { forms: [string, string, string]; female: boolean }[] = [
  { forms: ["", "", ""], female: false },
  { forms: ["тысяча", "тысячи", "тысяч"], female: true },
  { forms: ["миллион", "миллиона", "миллионов"], female: false },
  { forms: ["миллиард", "миллиарда", "миллиардов"], female: false },
  { forms: ["триллион", "триллиона", "триллионов"], female: false },
];

export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

function triplet(n: number, female: boolean): string {
  const parts: string[] = [];
  parts.push(HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest >= 10 && rest < 20) parts.push(TEENS[rest - 10]);
  else {
    parts.push(TENS[Math.floor(rest / 10)]);
    parts.push((female ? ONES_F : ONES_M)[rest % 10]);
  }
  return parts.filter(Boolean).join(" ");
}

/** Целое число прописью (0 .. 999 трлн). */
export function integerToWords(n: number, female = false): string {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("integerToWords: неотрицательное целое");
  if (n === 0) return "ноль";
  const groups: number[] = [];
  let x = n;
  while (x > 0) { groups.push(x % 1000); x = Math.floor(x / 1000); }
  if (groups.length > SCALES.length) throw new RangeError("Число слишком большое");
  const out: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const scale = SCALES[i];
    out.push(triplet(g, i === 0 ? female : scale.female));
    if (i > 0) out.push(plural(g, scale.forms));
  }
  return out.join(" ");
}

/** Сумма в тенге прописью. Вход — целые тиыны, чтобы не терять точность. */
export function tengeToWords(tiyn: number): string {
  if (!Number.isInteger(tiyn)) throw new RangeError("tengeToWords: ожидаются целые тиыны");
  const neg = tiyn < 0;
  const abs = Math.abs(tiyn);
  const tenge = Math.floor(abs / 100);
  const t = abs % 100;
  const words = integerToWords(tenge);
  const res = `${words} ${plural(tenge, ["тенге", "тенге", "тенге"])} ${String(t).padStart(2, "0")} ${plural(t, ["тиын", "тиына", "тиынов"])}`;
  const full = neg ? `минус ${res}` : res;
  return full.charAt(0).toUpperCase() + full.slice(1);
}
