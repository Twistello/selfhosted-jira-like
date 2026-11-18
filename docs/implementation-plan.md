# Self-hosted platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Track actual results in docs/checkpoint.md.

**Goal:** Реализовать полное пользовательское ТЗ, не выдавая частичную готовность за завершение.
**Architecture:** NestJS modular monolith, React, PostgreSQL; server-side RBAC and immutable sprint events.
**Tech Stack:** TypeScript, React, NestJS, pg, Argon2, Playwright, Docker Compose.
**Spec:** docs/requirements.md; docs/architecture.md defines common API.

## Global constraints
- Никаких платных GitLab функций, искусственных лимитов или фиктивных данных.
- Секреты не коммитить, чужие изменения сохранять; только рабочая ветка, без force-push/merge.
- Проверять PostgreSQL и браузером; внешние интеграции проверять контрактно без корпоративных доступов.

## Review focus
- Concurrent bootstrap must create exactly one owner.
- Object IDs must not grant access to another project.
- MFA code and recovery replay must be rejected.
- Sprint carryover must preserve original scope history.
- Repeated or stale GitLab events must not repeat workflow changes.

## Tasks
1. Infrastructure and contracts (coordinator): package/tsconfig, migrations, Db, main, Compose and CI. Test DB migrations twice, rollback on error, run health endpoints.
2. Auth and work (core agent): write failing integration tests for bootstrap, login, RBAC, MFA replay, task version conflicts, returned-task guard, sprint carryover; implement CoreModule, rerun tests. Only server/core/** and tests/core*.ts.
3. UI (frontend agent): implement web/** against shared API; setup/login, projects, board/table, task editor, sprints, wiki/time/reports/settings, RU/EN and themes. Write E2E, then validate actual browser. Only web/** and tests/ui*.ts.
4. GitLab (integration agent): test extraction, authentication, dedup and stale-event handling; implement IntegrationsModule and jobs with retry. Only server/integrations/** and tests/gitlab*.ts.
5. Planning (coordinator): wiki versions, time, analytics, export and event-based metrics. Write behavior tests before implementation, integrate all modules and verify.
6. Acceptance/security review: independent reviewer; fix findings, run tests/typecheck/build/lint, PostgreSQL integrations and Playwright; load test five users, backup/restore.
7. Delivery: update detailed acceptance matrix with actual evidence, checkpoint incomplete requirements, commit, push authorized branch, draft PR and verify remote SHA/CI. Never claim full delivery if any mandatory requirement remains.

Each implementation task follows red → green → review. Separate subsystem files prevent edit conflicts; root alone changes common schema/contracts.
