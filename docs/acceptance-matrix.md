# Матрица приёмки

Статус на 2026-11-18: **полное ТЗ не выполнено**. Наличие плана или таблицы БД не означает готовность функции. [105 пунктов с ID](acceptance-detail.md), [исходное ТЗ](requirements.md), [фактические проверки](testing.md). «Частично» не является приёмкой всего раздела.

| ID | Критерий | Реализация | Проверка | Статус |
|---|---|---|---|---|
| ENV | Репозиторий и runtime определены | GitHub connector, Node 24, PostgreSQL 15 binaries | list_repositories, CLI | Выполнено; Docker daemon не работает |
| AUTH | Bootstrap, Argon2id, sessions, invites/reset | server/core | PostgreSQL/API/E2E | Частично: работает; доставка invitation/reset ручная, SMTP нет |
| MFA | TOTP QR, recovery, replay, policy, WebAuthn | server/core | security/E2E | TOTP/recovery/policy проверены; passkeys/SSO/админ MFA recovery нет |
| RBAC | Roles/custom permissions, object isolation | server/core | cross-project API tests | Базовые роли/объектные проверки работают; custom permissions нет |
| WORK | Projects, tasks, comments, hierarchy, custom fields/search/trash | server/core | PostgreSQL/API/UI | Частично: CRUD/keys/comments/parent/labels/points; custom_fields JSON без схемы; fulltext/trash restore/files/mentions/bulk/recurrence нет |
| FLOW | Configurable workflow, returned guard, WIP | server/core | transition tests | Переходы/required fields через API settings, returned guard; роли переходов/WIP/swimlanes нет |
| VIEWS | Table, kanban, calendar, roadmap, Gantt | web | browser persistence | Таблица/канбан работают; roadmap только список дат; календарь/Gantt/column settings нет |
| SPRINT | Start/close/carry, capacity, scope events | server/core | immutable scope test | Start/close/carry/baseline/снимки проверены; capacity/multi-team/rhythm preset нет |
| REPORT | All requested metrics, filters, CSV/PDF | server/planning | formula/history tests | Scalar metrics + CSV/JSON работают; charts/периоды/исполнитель/PDF нет; CFD экспериментален |
| WIKI | Tree, markdown, revisions/diff/restore, search | server/planning | revision API/UI | Markdown/versions/restore проверены; parent API частичный; global wiki/diff/search/templates нет |
| TIME | Timer, timesheet approval/lock, leave/costs | server/planning | permissions and lock tests | Ручное время/утверждение дня API работают; timer/leave/capacity/rates/costs нет |
| GITLAB | All 13 GitLab CE requirements | server/integrations | local HTTP fixtures + real PG | Частично: auth/bind/links/branch/import/hooks/reconcile/retry; mapping/new issue/configurable transitions/dev panel нет; живой CE не проверен |
| CONNECT | SMTP/GitHub/Slack/Telegram/OIDC/LDAP/S3/WebDAV/ICS/import/export | server/integrations | API/contract tests | ICS API/CSV JSON export/GitLab import есть; остальные обязательные коннекторы отсутствуют |
| AUTO | Events/conditions/actions, dry run, retries, loop guard | — | — | Не реализовано; наличие таблиц не означает работу engine |
| UX | RU/EN, themes, responsive, keyboard, errors/concurrency | web | Chromium E2E/screenshots | Основные сценарии проверены; нет полной unsaved-changes защиты, a11y audit, realtime и rich permissions UI |
| OPS | Compose HTTPS, migrations, backups/restore, logs/health | root/ops | real native launch/restore | Native PG/API/web/worker запущены; backup restore проверен; Compose/TLS не проверены |
| QA | Unit, real PG integration, E2E, lint/build/audit/load | tests | testing.md | 38 серверных тестов, browser journey и HTTP security; build/type/lint green; production audit0, dev10 high; не все E2E ТЗ реализованы |
| SHIP | Commit/push/PR/remote SHA/CI | GitHub | remote readback | Состояние поставки сохраняется в checkpoint.md; полный продукт не заявлен |
