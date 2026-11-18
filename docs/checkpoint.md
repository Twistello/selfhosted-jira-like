# SDD ledger — plan: docs/implementation-plan.md

2026-11-18: Empty repository confirmed through connected GitHub. Local clone created. Node v24.14.0/npm 11.9.0. Docker CLI installed, daemon pipe absent. Native PostgreSQL 15 binaries available. Network works with approved escalation. No existing README, AGENTS.md or user code.

Ruling: user explicitly opts out of intermediate design approval; proceed with given stack and document choices. Independent modules use disjoint ownership; coordinator owns all shared contracts.

| Pair/task | Interface/conflict scan | Ruling |
|---|---|---|
| infra/core | Db and schema consumed by core | coordinator writes before implementation |
| core/UI | shared auth/task/sprint routes | architecture.md binds field/route names |
| core/GitLab | tasks/events changes | integration must use transactions and project authorization |
| planning/UI | /projects/:id/pages,time,reports | coordinator defines endpoints before UI wiring |
| each task | files scoped, tests describe actual behaviors | no conflict; verify full suite at integration |

## Checkpoint 2026-11-18

**Это частичная реализация, полное ТЗ НЕ выполнено.** Пользователь разрешил сохранять коммиты и точный checkpoint, если весь объём не помещается в один сеанс. Никакой PR не должен сливаться как завершённый продукт.

### Реализовано и проверено

- Репозиторий клонирован, рабочая ветка `feat/selfhosted-platform`. Основная БД после тестов очищена только от синтетических fixtures; первичная настройка владельца открыта, стандартного пароля нет.
- TypeScript/Nest/React/PostgreSQL, миграции/транзакции/health/readiness, compiled launch и background PostgreSQL worker.
- Argon2id/cookie sessions, owner bootstrap race protection, TOTP QR/recovery/replay/MFA policy, manual invitations/reset, owner/admin role hierarchy, project RBAC, financial budget redaction.
- CRUD проектов/задач/comments/parent/labels/points, workflow/required fields API, returned-task guard, version conflicts, sprint start/close/carryover с baseline/scope events и immutable closure snapshot задач/времени.
- Wiki Markdown/revisions/restore, ручное время/утверждение дня, scalar metrics, CSV/JSON export и session-authenticated ICS API.
- GitLab CE token URL allowlist/DNS pinning, соединения/binding/visibility, branches/dev links/issues import+частичная sync, authenticated/dedup webhooks, retries/reconciliation, privacy guards. Fixtures и настоящая PostgreSQL; живой CE НЕ проверен.
- RU/EN/themes/responsive board/table/wiki/time/reports/security, admin GitLab binding/reconcile/webhook UI. Безопасные скриншоты docs/screenshots; полные локальные .runtime/ui-*.png.
- Dockerfile/Compose/Caddy/CI/README/license/operations/metrics/testing и детальная матрица 105 пунктов.

### Фактическая верификация

- `npm test`: 38/38 pass; real PostgreSQL, включая restore в чистую БД.
- `npm run test:e2e`: 2/2 pass (HTTP security + UI/MFA journey), 10.5 s общий запуск последней проверки.
- build/typecheck/lint/check:secrets: pass. Production audit:0; полный audit:10 high в dev-tools, не закрыты.
- Независимый review выявил 5 дефектов; исправлены и проверены. Повторное ограниченное статическое review residual historical time/estimate дефекта не нашло.
- Benchmark: 5 users, 100 tasks, 150 requests; медианы9.26/11.10/14.27ms; API RSS113.87MiB. Условия/ограничения docs/testing.md.
- Windows local environment: PostgreSQL loopback55432, compiled app/web/worker loopback3000. Запуск: `npm start`; UI `http://127.0.0.1:3000`. Docker daemon отсутствует; deployment Compose/HTTPS пока не проверен.

### Незавершённое — порядок дальнейшей реализации

1. Security/auth: WebAuthn/passkeys, SMTP приглашения/reset/notifications, публичный безопасный запрос восстановления без выдачи токена, OIDC+LDAP с MFA trust policy, user/device revocation UI, audit login/logout/rights events, scoped expiring API tokens, custom project permissions. Сохранять текущий role hierarchy и не обходить MFA.
2. Work: teams/portfolios/templates, typed field definitions, mentions/reactions/watchers/components/releases, attachments with local+S3 storage/MIME/ACL, task links/dependency CRUD/cycle guard, bulk/recurrence/trash restore/fulltext/saved filters. Финансовые поля не возвращать обычным ролям.
3. Planning UI: calendar, real Gantt/work calendars/baselines/dependencies, table column settings/swimlanes/WIP, sprint capacity/multi-team/two-phase preset. Закрытые snapshots никогда не менять.
4. Analytics: event-correct burnup/burndown/velocity/scope/CFD, filters period/assignee/project, PDF и персональные dashboards. Сначала определить и протестировать формулы, особенно удаление/перенос/reopen.
5. Wiki/time: global knowledge base/tree move/diff/search/templates, timer, approval periods, leave/capacity/rates/budgets/cost planning с отдельными финансовыми правами.
6. GitLab: create new remote issue, assignee/labels/milestones mappings, per-field authority/conflict policy, configurable MR/pipeline workflow actions, complete development UI, diagnostics jobs/retry API/UI, поддержка и проверка версий на живом временном GitLab CE. Default privacy остаётся administrators, импорт в общие задачи требует consent.
7. Remaining connectors: GitHub PR/checks, Telegram/Slack, WebDAV/Nextcloud, S3, iCalendar subscription auth tokens, CSV/JSON import; event-condition-action automation с dry-run/cycle guard/signed outgoing hooks/retries/delivery log. Таблицы automation сейчас НЕ означают наличие engine.
8. UX: полный unsaved-changes guard, a11y audit, keyboard hotkeys, realtime с проектным ACL; расширить браузерные E2E до всех11 сценариев ТЗ.
9. Ops/security: живой Compose/container/TLS/restore test, sustained5-user load на целевых4CPU/8GiB, обновление dev vulnerabilities, полноценные OpenAPI DTO, dependency license review и secrets scanner уровня gitleaks.

### Как продолжать

Прочитать этот checkpoint и матрицу, проверить `git status/log`, не повторять завершённые задачи. Применять Superpowers; пользователь явно разрешил subagents и работу без промежуточных согласований. Общие db/schema/main/package файлы меняет координатор, новые независимые модули — отдельные агенты. Сначала следующий незавершённый security/auth модуль, тесты рисков до кода; затем review и полный test suite. Не выдавать текущие зелёные тесты за готовность отсутствующих функций.

### Поставка

Source commit `58534f2831b3787f564933b2f3dc323bb1615276` отправлен и подтверждён `git ls-remote`. Репозиторий: https://github.com/Twistello/selfhosted-jira-like . Ветка: `feat/selfhosted-platform`. Draft PR: https://github.com/Twistello/selfhosted-jira-like/pull/1 . В изначально пустом remote initial docs commit `9b2216d64e0a17d9aa22c9aa43d348a7f46e00a1` стал base `main`; продукт остаётся в feature branch. PR не слит, corporate deployment не выполнялся.

CI source commit: https://github.com/Twistello/selfhosted-jira-like/actions/runs/44295971275 . На момент записи выполняется; локальные результаты не подменяют результат Actions. Следующий documentation-only commit обновляет этот checkpoint без изменения проверенного runtime-кода. Итог CI нужно читать по указанному run и зафиксировать при продолжении, если он ещё не завершён.

CI followup: первый run завершился с37/38: restore test выявил PostgreSQL client/server major mismatch (`SET transaction_timeout` из нового client не поддерживается15). Исправление: явные dockerized15 client wrappers через PG_BIN; тест не отключён. Ephemeral CI encryption key дополнительно маскируется в logs. Новый run после fix нужно дождаться; старое падение не скрывается.
