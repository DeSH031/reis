# Эксплуатация

## Ежедневный отчёт в Telegram
- Cron: `vercel.json`, `0 3 * * *` UTC = 08:00 Алматы. На плане Hobby Vercel допускает только один запуск в сутки и может сдвинуть его в пределах часа.
- Маршрут `/api/cron/daily-report` защищён заголовком `Authorization: Bearer $CRON_SECRET` (Vercel подставляет его сам, если переменная `CRON_SECRET` задана в проекте).
- Нужные переменные Vercel: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`.
- Организация получает отчёт, если в `org_settings` включён `report_enabled` и задан `telegram_chat_id`.
- Повторная отправка в тот же день не происходит (уникальность `org_id, channel, report_date`); неудачная отправка повторяется при следующем запуске.
- Ручной запуск: `curl -H "Authorization: Bearer $CRON_SECRET" https://<домен>/api/cron/daily-report`.
