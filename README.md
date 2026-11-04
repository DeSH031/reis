# Рейс

Веб-приложение для казахстанских перевозчиков и экспедиторов: рейсы, прибыль по каждому рейсу, дебиторка, оповещения, ссылка водителя и ежедневный отчёт в Telegram. Документы (заявка, счёт, акт, ТТН) делаются отдельным модулем.

Демо: https://reis-nine.vercel.app (кнопка «Войти в демо»). Данные вымышленные: организация «ТОО «Демо Транс» (демо)».

## Стек
Next.js (App Router), TypeScript strict, Tailwind v4, Supabase (Postgres, Auth, RLS), Vercel, pnpm, Vitest, zod.

## Запуск локально
```bash
pnpm install
cp .env.example .env.local   # заполнить значения Supabase
pnpm dev
pnpm test        # юнит-тесты
pnpm build
```

## Структура
- `src/domain/*` — чистая бизнес-логика без ввода-вывода: прибыль (`profit`), дебиторка (`receivables`), оповещения (`alerts`), отчёт (`report`), разбор текста в рейс (`trips`), сумма прописью (`documents`).
- `src/app/(app)/*` — страницы после входа: обзор, рейсы, финансы, оповещения, справочники, настройки.
- `src/app/d/[token]` — страница водителя по ссылке, без входа.
- `src/app/api/cron/daily-report` — ежедневный отчёт в Telegram.
- `supabase/migrations` — схема, права (RLS), сид демо-данных, функции для ссылок водителя.

Подробнее: `docs/RUNBOOK.md`, `docs/PROFIT_ENGINE.md`, `docs/DEMO_SCRIPT.md`, `docs/RISKS.md`, `docs/DECISIONS.md`, `docs/OPERATIONS.md`.
