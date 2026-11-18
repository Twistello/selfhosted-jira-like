# Архитектура

Решение архитектора, 2026-11-18: модульный монолит TypeScript, NestJS REST `/api/v1`, React/Vite, PostgreSQL 15+. Для пяти пользователей очередь PostgreSQL с блокировкой SKIP LOCKED проще Redis; внешние SaaS не обязательны. Альтернатива: микросервисы увеличивают стоимость эксплуатации; готовый трекер не отвечает требованию самостоятельной реализации. Пользователь разрешил самостоятельные обратимые решения и работу без промежуточных подтверждений.

Модули: auth (Argon2id, opaque cookie sessions, TOTP, RBAC); work (проекты, задачи, переходы и спринты); planning (wiki, время, отчёты); integrations (GitLab CE, durable webhooks/jobs). PostgreSQL хранит предметные сущности и события в транзакциях. Версия задачи обеспечивает optimistic concurrency; события спринта сохраняются отдельно от текущего состава.

## Контракт между исполнителями

API возвращает JSON, ошибки `{message: string}`. UUID в `id`, даты ISO 8601, snake_case в полях. Cookie `sid`, HTTPOnly, SameSite=Lax, Secure в production. Все mutations проверяют Origin. Браузер использует один origin, Vite proxy в разработке. Авторизация серверная, идентификатор actor берётся только из сессии.

Общие файлы владельца: package.json, tsconfig*, server/db.ts, server/migrations/*, server/main.ts. Db экспортирует `pool`, `query(text, values?)`, `transaction(fn)` (fn получает PoolClient); `migrate()`. Auth экспортирует `AuthService.actor(req)`, `AuthService.requireProject(actor, projectId, write=false)`, `AuthService.requireAdmin(actor)`; actor = `{id,email,name,role,mfa_enabled}`. Владельцы/администраторы видят все проекты; остальные только членство; observer/guest read-only. Чувствительные интеграционные поля только администраторам.

Роуты auth: GET auth/status → `{setupRequired}`; POST auth/setup/login/logout; GET auth/me → actor; GET auth/mfa/setup → `{secret,uri,qr}`; POST auth/mfa/enable `{code}` → `{recoveryCodes}`. Login `{email,password,code?}`. GET/POST projects, GET/POST projects/:id/tasks, PATCH tasks/:id `{version,...}`, GET tasks/:id, POST tasks/:id/comments. GET/POST projects/:id/sprints, POST sprints/:id/start и /close `{target_sprint_id?}`; GET projects/:id/events.

Frontend в web/, core backend в server/core/, integrations в server/integrations/, дополнительный domain в server/planning/. Независимые файлы не требуют worktrees; общие изменения делает координатор. Экспортируемые Nest modules: CoreModule, IntegrationsModule, PlanningModule. Никаких секретов в ответах, логах и git. Внешние соединения без credentials явно не настроены.

## Безопасность и эксплуатация

Токены и TOTP шифруются AES-256-GCM ключом APP_ENCRYPTION_KEY вне БД. Хеши recovery кодов и сессий SHA-256; пароли Argon2id. Webhook дедупликация по delivery UUID и connection. Outbound URL разрешены только явным allowlist, redirects запрещены, metadata адреса запрещены. Для private GitLab нужен явно разрешённый origin. SQL только параметризованный. Миграции с advisory lock. Нет публичного пароля или автоматических учётных записей.

Целевой deployment: Compose (Caddy HTTPS, app, PostgreSQL internal network, volumes). В текущей Windows среде доступен PostgreSQL 15 binary; Docker daemon недоступен. Запуск и измерения будут отражены только после фактической проверки.
