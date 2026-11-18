# Эксплуатация

## Конфигурация и HTTPS

`.env` не хранится в git. `APP_ENCRYPTION_KEY` — 32 случайных байта в base64, вне БД. Сохраните его в отдельном защищённом backup. Автоматической ротации ключа пока нет: простая замена сделает существующие секреты нечитаемыми. `PUBLIC_URL` — точный внешний origin; в production требуется HTTPS. `HOST=127.0.0.1` по умолчанию; Compose использует `0.0.0.0` внутри контейнера. `TRUST_PROXY=1` включается только за собственным reverse proxy.

Production Compose использует `NODE_ENV=production` из Dockerfile, secure cookies, Caddy, internal PostgreSQL network. TLS termination и контейнерная установка подготовлены, но не проверены в текущей среде. До рабочего использования нужны дальнейший security review и закрытие обязательных пробелов ТЗ.

## Backup и restore

Остановите изменяющие операции на время согласованного backup; PostgreSQL dump сам согласован на уровне БД. Текущая версия не хранит пользовательские файлы, поэтому файлового backup пока нет. Резервная копия содержит персональные данные и хеши; храните её с ограниченными правами и шифрованием средствами администратора.

```sh
npm run backup -- /secure/backups/forgeboard.dump
# На чистой отдельной БД:
DATABASE_URL=postgresql://user:password@host:5432/restore_db npm run restore -- /secure/backups/forgeboard.dump
```

Нужны `pg_dump`/`pg_restore` в PATH либо `PG_BIN` с каталогом PostgreSQL. В PowerShell переменные окружения задаются через `$env:DATABASE_URL`. Restore отказывается работать, если в БД уже есть таблицы; он не удаляет рабочие данные. Запускайте приложение с исходным ключом шифрования. Реальная проверка pg_dump → чистая БД → сравнение пользователей/версий/событий включена в `tests/ops.integration.test.ts`. Процедура восстановления HTTPS и внешних файлов не проверена и не реализована.

Используйте PostgreSQL client tools той же major версии, что сервер. CI выявил, что более новый pg_restore может добавить `SET transaction_timeout`, который PostgreSQL15 не понимает. CI использует клиент из `postgres:15-alpine` через явные wrappers. Пример экспорта без публикации БД: `docker compose exec db pg_dump -U forgeboard -d forgeboard -Fc -f /tmp/backup.dump`, затем `docker compose cp db:/tmp/backup.dump /secure/backups/forgeboard.dump`. Команды Compose не выполнялись локально.

## Обновления

Сделайте backup БД и отдельно сохраните ключ. Изучите миграции и release notes; выполните проверку восстановления на копии. Затем обновите код и выполните `npm ci`, `npm run build`, `npm run migrate`, перезапустите API. Миграции применяются транзакционно с advisory lock и повторный запуск безопасен; текущая первая миграция создаёт схему, down migration отсутствует. Откат несовместимого изменения — восстановление backup в новую БД с прежней версией приложения, а не ручное удаление таблиц.

## Наблюдаемость и доступ

JSON request logs содержат request ID, method/path/status/duration, без query values/body/cookies. Startup Nest logs пока текстовые. `/health` проверяет процесс, `/ready` — БД. Административный `/api/v1/admin/runtime` даёт RSS/heap/CPU процесса. Метрики всей машины и PostgreSQL собирает оператор; Prometheus endpoint пока отсутствует.

Owner/admin видят проекты глобально. Другие пользователи должны иметь членство; observer/guest не пишут. Бюджет доступен owner/admin; отдельных пользовательских финансовых разрешений ещё нет. Токены сброса/приглашения пока выдаются администратору для ручной доставки, SMTP отсутствует. API tokens/scopes, passkeys, OIDC, LDAP, восстановление потерянного MFA администратором не реализованы. Нельзя заменять это прямой правкой БД в штатной инструкции.
