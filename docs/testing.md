# Фактические проверки — 2026-11-18

Среда: Windows x64, Node 24.14.0, npm 11.9.0, PostgreSQL 15 binaries, Chromium Playwright. Машина имеет 16 логических CPU и 16781996032 байта RAM (~15.63 GiB). Это локальная вычислительная среда, не отдельный облачный хост. Docker CLI установлен, daemon pipe отсутствует. PostgreSQL запущена напрямую на loopback:55432, compiled API/frontend/worker — на loopback:3000. HTTP `/`, `/api/v1/ready`, `/api/docs-json` ответили успешно; setupRequired=true после удаления синтетических fixtures.

## Пройдено

- `npm test`: **38/38**. Настоящая PostgreSQL; схемы core/planning/GitLab раздельные. Bootstrap race, Argon2id/session flow, межпроектный RBAC, budget redaction, admin/owner reset hierarchy, MFA replay/recovery/policy, versions, returned guard, sprint carryover/race/frozen history.
- GitLab fixtures: локальный настоящий HTTP server + PostgreSQL. Проверены auth header, URL encoding, redirect/metadata block, DNS pinning, webhook token/dedup/stale-event handling, privacy activity feed, import после reconciliation, durable retry после outage и однократный concurrent claim. **Живой GitLab CE не проверен.**
- `tests/ops.integration.test.ts`: миграции применены дважды, pg_dump, pg_restore в чистую отдельную БД, проверены сохранённые UUID/версии/события, повторное восстановление в непустую БД отклонено.
- `npm run typecheck`, `npm run lint`, `npm run build`: exit 0. Собраны и реально запущены React bundle и compiled Nest backend; SQL migrations копируются в dist.
- Chromium UI E2E: bootstrap → project/task → workflow и reload → table → wiki → time → report → unconfigured GitLab → TOTP setup/enable → отвергнутый replay → recovery login и запрет повторного recovery → RU/EN/themes/mobile navigation. Скриншоты сохранены в `.runtime/ui-*.png`, выбранные безопасные экраны — docs/screenshots. QR/secret/recovery codes не публикуются.
- HTTP boundary E2E: anonymous private/admin access запрещён, cross-site Origin/ambient-cookie writes отклоняются, malformed JSON даёт 400, неизвестный API — 404 JSON, CSP/nosniff присутствуют.
- `npm run check:secrets`: распространённые шаблоны секретов/runtime файлов не найдены. Это ограниченный pattern scan, не полная security audit.
- Независимый субагент провёл статическое ревью; найденные takeover/privacy/status/import/history дефекты исправлены и покрыты регрессиями. Последнее ограниченное повторное ревью новых critical дефектов не обнаружило; само ревью не заменяет эксплуатационный аудит.

## Зависимости

`npm audit --omit=dev`: **0 vulnerabilities**. Полный `npm audit`: **10 high**, цепочка picomatch/fdir/tinyglobby/Vite/typescript-eslint (ReDoS GHSA-fc5q-39xc-vjpf). На момент проверки advisory помечает все версии picomatch; рекомендованный force меняет major/tooling и не применялся. Это незакрытое ограничение dev/build tools; полная проверка не объявляется зелёной. Реестр объявленных лицензий генерируется из lockfile, не является правовым аудитом.

## Короткий нагрузочный замер

`node ops/benchmark.mjs`: 5 разных авторизованных пользователей, 100 задач, 150 HTTP запросов без ошибок. 10 последовательностей list/report/update на пользователя, 5 пользователей параллельно. Loopback, PostgreSQL настоящая; worker отключён только на время этого изолированного request benchmark. Основной API запущен с worker. Без TLS, compiled JavaScript, NODE_ENV=development; прогрев отдельно не выполнялся.

| Операция | n | median ms | p95 ms | max ms |
|---|---:|---:|---:|---:|
| list tasks | 50 | 9.26 | 231.80 | 236.11 |
| reports | 50 | 11.10 | 28.31 | 248.27 |
| update task | 50 | 14.27 | 66.36 | 73.55 |

Окно запросов ~665 ms. RSS API до/после 112.09/113.87 MiB; CPU процесса за окно ~500 ms user +172 ms system. Сумма WorkingSet 22 процессов PostgreSQL при отдельном наблюдении ~328 MiB, общие страницы могут учитываться повторно; это не точный физический RSS всего deployment. Полные измерения в `docs/benchmark.json`. Это маленький smoke benchmark, не sustained load test и не подтверждение целевого сервера 4 CPU/8 GiB. Узкого места, требующего изменения архитектуры, этот замер не доказал.

## Не проверено / не реализовано

Live GitLab, production Docker/HTTPS, внешние SMTP/SSO/storage/connectors, файлы, все обязательные E2E исходного ТЗ, полная a11y и pentest. GitHub Actions и container build выполнятся после push; их результат отдельно фиксируется в checkpoint.md. Нельзя считать всё ТЗ закрытым на основании зелёных существующих тестов.
