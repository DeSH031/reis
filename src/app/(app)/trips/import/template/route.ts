export function GET() {
  const csv = "﻿Дата;Клиент;Откуда;Куда;Ставка;Км;Расходы\n2026-10-20;Северный Ветер;Алматы;Астана;640000;1200;480000\n2026-10-22;Алтын Трейд;Алматы;Шымкент;380000;690;290000\n";
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="trips-template.csv"' } });
}
