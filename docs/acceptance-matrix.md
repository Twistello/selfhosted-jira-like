# Матрица приёмки

Статусы до реализации: **не выполнено**. Наличие плана или таблицы БД не означает готовность функции. Детальный источник требований: requirements.md.

| ID | Критерий | Реализация | Проверка | Статус |
|---|---|---|---|---|
| ENV | Репозиторий и runtime определены | GitHub connector, Node 24, PostgreSQL 15 binaries | list_repositories, CLI | Выполнено; Docker daemon не работает |
| AUTH | Bootstrap, Argon2id, sessions, invites/reset | server/core | PostgreSQL/API/E2E | Не выполнено |
| MFA | TOTP QR, recovery, replay, policy, WebAuthn | server/core | security/E2E | Не выполнено |
| RBAC | Roles/custom permissions, object isolation | server/core | cross-project API tests | Не выполнено |
| WORK | Projects, tasks, comments, hierarchy, custom fields/search/trash | server/core | PostgreSQL/API/UI | Не выполнено |
| FLOW | Configurable workflow, returned guard, WIP | server/core | transition tests | Не выполнено |
| VIEWS | Table, kanban, calendar, roadmap, Gantt | web | browser persistence | Не выполнено |
| SPRINT | Start/close/carry, capacity, scope events | server/core | immutable scope test | Не выполнено |
| REPORT | All requested metrics, filters, CSV/PDF | server/planning | formula tests | Не выполнено |
| WIKI | Tree, markdown, revisions/diff/restore, search | server/planning | revision API/UI | Не выполнено |
| TIME | Timer, timesheet approval/lock, leave/costs | server/planning | permissions and lock tests | Не выполнено |
| GITLAB | All 13 GitLab CE requirements | server/integrations | contract tests + live if possible | Не выполнено; no credentials |
| CONNECT | SMTP/GitHub/Slack/Telegram/OIDC/LDAP/S3/WebDAV/ICS/import/export | server/integrations | test servers | Не выполнено |
| AUTO | Events/conditions/actions, dry run, retries, loop guard | server/integrations | behavior tests | Не выполнено |
| UX | RU/EN, themes, responsive, keyboard, errors/concurrency | web | Playwright/screenshots | Не выполнено |
| OPS | Compose HTTPS, migrations, backups/restore, logs/health | root/ops | real launch/restore | Не выполнено |
| QA | Unit, real PG integration, E2E, lint/build/audit/load | tests | actual execution report | Не выполнено |
| SHIP | Commit/push/PR/remote SHA/CI | GitHub | remote readback | Не выполнено |
