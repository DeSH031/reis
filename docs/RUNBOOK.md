# Runbook

## Деплой
Пуш в `main` репозитория `DeSH031/reis` запускает деплой на Vercel (проект `reis`). Проверка после деплоя: открыть https://reis-nine.vercel.app, нажать «Войти в демо», открыть «Рейсы», «Финансы», «Обзор».

## Переменные окружения (Vercel)
Обязательные: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Для демо: `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_ORG_ID`.
Для Telegram и cron: `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`.

## База данных
Миграции лежат в `supabase/migrations` и применяются по порядку. Права ограничены политиками RLS по организации; анонимный доступ есть только к функциям водителя (`driver_get_trip`, `driver_set_status`, `driver_add_cost`) по токену.

## Сброс демо
В приложении кнопка «Сбросить демо» вызывает функцию `reset_demo`, она пересоздаёт демо-данные детерминированно.

## Ссылка водителя
Кнопка «Ссылка для водителя» в карточке рейса создаёт токен на 14 дней. В базе хранится только sha256 токена. Утерянную ссылку нельзя восстановить, выдайте новую.

## Частые проблемы
- Демо-вход даёт ошибку: проверьте `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_ORG_ID` в Vercel.
- Нет отчёта в Telegram: см. `docs/OPERATIONS.md`.
