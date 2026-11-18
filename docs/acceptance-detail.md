# Детальная трассировка требований

Критерии взяты из пунктов исходного ТЗ. «Частично» не означает приёмку всего пункта. Это консервативная инвентаризация; сводка и конкретные ограничения — в acceptance-matrix.md и checkpoint.md. Текстовые требования между списками также остаются обязательными.

| ID | Критерий из ТЗ | Статус | Реализация | Проверка / ограничение |
|---|---|---|---|---|
| R4-1 | TypeScript; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-2 | React для интерфейса; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-3 | NestJS для API и фоновых процессов; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-4 | PostgreSQL; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-5 | Redis и очередь заданий при необходимости; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R4-6 | совместимый с S3 файловый storage и вариант хранения на локальном диске; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R4-7 | Docker Compose для установки. | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-8 | версионируемый REST API и OpenAPI; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-9 | миграции БД; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-10 | транзакции, индексы, пагинацию; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-11 | фоновые задания с повторными попытками; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-12 | обновления интерфейса без перезагрузки там, где они нужны; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R4-13 | health/readiness endpoints; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-14 | структурированные логи без секретов; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R4-15 | конфигурацию через environment variables; | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R4-16 | отсутствие обязательных внешних SaaS. | Частично | server/, compose.yaml | Серверные тесты, build; Compose не запущен |
| R5-1 | первичную настройку владельца без стандартного публичного пароля; | Реализовано в указанном объёме | server/core/ | core integration + browser E2E |
| R5-2 | вход по email/паролю, приглашения, выход и восстановление пароля; | Частично | server/core/ | Ручные приглашения/reset; SMTP нет |
| R5-3 | отключённую по умолчанию свободную регистрацию; | Частично | server/core/ | Ручные приглашения/reset; SMTP нет |
| R5-4 | безопасное хеширование паролей Argon2id; | Реализовано в указанном объёме | server/core/ | core integration + browser E2E |
| R5-5 | управление сессиями, устройствами и отзывом доступа; | Реализовано в указанном объёме | server/core/ | core integration + browser E2E |
| R5-6 | TOTP 2FA с QR-кодом; | Реализовано в указанном объёме | server/core/ | core integration + browser E2E |
| R5-7 | одноразовые резервные коды, хранимые в виде хешей; | Реализовано в указанном объёме | server/core/ | core integration + browser E2E |
| R5-8 | обязательную 2FA по политике организации; | Реализовано в указанном объёме | server/core/ | core integration + browser E2E |
| R5-9 | WebAuthn/passkeys как дополнительный способ входа; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R5-10 | безопасное подключение, отключение и восстановление факторов; | Частично | server/core/ | Ручные приглашения/reset; SMTP нет |
| R5-11 | защиту от повторного использования TOTP и перебора; | Реализовано в указанном объёме | server/core/ | core integration + browser E2E |
| R5-12 | SSO через OIDC и подключение LDAP/AD. | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R6-1 | организацию, команды, проекты, подпроекты и портфели; | Не завершено | server/core/ | Часть полей есть; полный критерий не принят |
| R6-2 | шаблоны проектов и задач; | Не завершено | server/core/ | Часть полей есть; полный критерий не принят |
| R6-3 | типы: epic, feature, story, task, bug, subtask; | Частично | server/core/, web/ | core tests + E2E; см. summary matrix |
| R6-4 | стабильные ключи задач, например ATR-123; | Частично | server/core/, web/ | core tests + E2E; см. summary matrix |
| R6-5 | описания с Markdown, комментарии, упоминания, реакции и вложения; | Частично | server/core/, web/ | Markdown/comments, labels, assignee, points; нет mentions/files/fulltext UI |
| R6-6 | исполнителя, автора, наблюдателей, приоритет, метки, компоненты, версии и сроки; | Частично | server/core/, web/ | Markdown/comments, labels, assignee, points; нет mentions/files/fulltext UI |
| R6-7 | оценки времени и story points; | Частично | server/core/, web/ | Markdown/comments, labels, assignee, points; нет mentions/files/fulltext UI |
| R6-8 | типизированные пользовательские поля; | Не завершено | server/core/ | Часть полей есть; полный критерий не принят |
| R6-9 | иерархию, связи, блокировки и зависимости; | Частично | server/core/, web/ | core tests + E2E; см. summary matrix |
| R6-10 | историю изменений, массовые операции и повторяющиеся задачи; | Частично | server/core/, web/ | core tests + E2E; см. summary matrix |
| R6-11 | архивирование, корзину и контролируемое восстановление; | Не завершено | server/core/ | Часть полей есть; полный критерий не принят |
| R6-12 | полнотекстовый поиск и сохранённые фильтры. | Частично | server/core/, web/ | Markdown/comments, labels, assignee, points; нет mentions/files/fulltext UI |
| R6-13 | таблица с настройкой столбцов; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R6-14 | канбан с drag-and-drop, swimlanes и WIP-лимитами; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R6-15 | календарь; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R6-16 | roadmap; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R6-17 | диаграмма Ганта с зависимостями, вехами, рабочими днями и базовым планом. | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R7-1 | burndown и burnup; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-2 | velocity; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-3 | planned/completed scope; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-4 | изменения объёма спринта; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-5 | predictability; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-6 | lead time и cycle time; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-7 | cumulative flow; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-8 | throughput; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-9 | aging незавершённых задач; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-10 | возвраты с проверки и rework; | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R7-11 | план/факт времени и загрузки. | Частично | server/planning/ | metrics.md; scalar tests; полного набора отчётов нет |
| R8-1 | wiki проекта и общую базу знаний; | Частично | server/planning/, web/ | Versions/manual time/day approval; остальные части не приняты |
| R8-2 | дерево страниц, редактор, версии, сравнение и восстановление; | Частично | server/planning/, web/ | Versions/manual time/day approval; остальные части не приняты |
| R8-3 | ссылки между страницами и задачами; | Частично | server/planning/, web/ | Versions/manual time/day approval; остальные части не приняты |
| R8-4 | шаблоны документов и поиск с учётом прав; | Частично | server/planning/, web/ | Versions/manual time/day approval; остальные части не приняты |
| R8-5 | ручной учёт времени и таймер; | Частично | server/planning/, web/ | Versions/manual time/day approval; остальные части не приняты |
| R8-6 | timesheets, согласование и блокировку утверждённых периодов; | Частично | server/planning/, web/ | Versions/manual time/day approval; остальные части не приняты |
| R8-7 | рабочие календари, отпуска и capacity; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R8-8 | обзор перегрузки участников; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R8-9 | ставки, бюджеты проектов и план/факт затрат. | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R9-1 | Подключение собственного GitLab по URL через подходящий токен или OAuth. | Частично | server/integrations/ | HTTP fixtures + PostgreSQL; живой CE не проверен |
| R9-2 | Проверку соединения, разрешений и доступных проектов. | Частично | server/integrations/ | HTTP fixtures + PostgreSQL; живой CE не проверен |
| R9-3 | Несколько подключений и привязку нескольких репозиториев к проекту. | Частично | server/integrations/ | HTTP fixtures + PostgreSQL; живой CE не проверен |
| R9-4 | Связь задач с branches, commits, merge requests, issues, pipelines и releases. | Частично | server/integrations/ | HTTP fixtures + PostgreSQL; живой CE не проверен |
| R9-5 | Распознавание ключей задач в названиях веток, сообщениях коммитов и MR. | Частично | server/integrations/ | HTTP fixtures + PostgreSQL; живой CE не проверен |
| R9-6 | Панель разработки в задаче: MR, состояние ревью, pipeline и ссылки в GitLab. | Частично | server/integrations/, web/GitLabActions.tsx | Часть API/UI; см. gitlab.md |
| R9-7 | Создание ветки из задачи с настраиваемым шаблоном имени. | Частично | server/integrations/, web/GitLabActions.tsx | Часть API/UI; см. gitlab.md |
| R9-8 | Создание GitLab issue и настраиваемую двустороннюю синхронизацию выбранных полей. | Частично | server/integrations/, web/GitLabActions.tsx | Часть API/UI; см. gitlab.md |
| R9-9 | Сопоставление пользователей, labels и milestones. | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R9-10 | Настраиваемые переходы задач по событиям GitLab. | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R9-11 | Приём project webhooks для необходимых событий. | Частично | server/integrations/ | HTTP fixtures + PostgreSQL; живой CE не проверен |
| R9-12 | Фоновую сверку данных через API после пропущенных событий. | Частично | server/integrations/ | HTTP fixtures + PostgreSQL; живой CE не проверен |
| R9-13 | Страницу диагностики, ошибок, повторной синхронизации и состояния подключения. | Частично | server/integrations/, web/GitLabActions.tsx | Часть API/UI; см. gitlab.md |
| R10-1 | SMTP: приглашения, восстановление доступа, уведомления и дайджесты; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R10-2 | GitHub: связь задач с commits, PR и статусами проверок; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R10-3 | Telegram и Slack: настраиваемые исходящие уведомления; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R10-4 | OIDC и LDAP/AD; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R10-5 | S3-совместимое хранилище; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R10-6 | WebDAV/Nextcloud для привязки файлов; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R10-7 | календарную подписку iCalendar; | Частично | server/planning/, server/integrations/ | ICS API, JSON/CSV export, GitLab import; отсутствует общий import |
| R10-8 | импорт/экспорт CSV и JSON; | Частично | server/planning/, server/integrations/ | ICS API, JSON/CSV export, GitLab import; отсутствует общий import |
| R10-9 | импорт задач из GitLab; | Частично | server/planning/, server/integrations/ | ICS API, JSON/CSV export, GitLab import; отсутствует общий import |
| R10-10 | документированный REST API; | Частично | server/planning/, server/integrations/ | ICS API, JSON/CSV export, GitLab import; отсутствует общий import |
| R10-11 | исходящие webhooks с подписью, retries и журналом доставок. | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R11-1 | русский язык по умолчанию и английская локализация; | Частично | web/ | Browser E2E + screenshots; нет полного accessibility audit |
| R11-2 | светлая и тёмная темы; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R11-3 | desktop-first с адаптацией для мобильных; | Частично | web/ | Browser E2E + screenshots; нет полного accessibility audit |
| R11-4 | клавиатурная навигация и доступные компоненты; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R11-5 | быстрый поиск, фильтры и горячие клавиши; | Частично | web/ | Browser E2E + screenshots; нет полного accessibility audit |
| R11-6 | состояния загрузки, пустых данных, ошибок, отсутствия прав и потери соединения; | Частично | web/ | Browser E2E + screenshots; нет полного accessibility audit |
| R11-7 | валидация форм и понятная обратная связь; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R11-8 | защита от потери несохранённых изменений; | Не реализовано / не подтверждено | — | Нет принятой проверки |
| R11-9 | корректная обработка одновременного редактирования. | Частично | web/ | Browser E2E + screenshots; нет полного accessibility audit |
| R12-1 | unit-тесты вычислений, workflow, прав и конфликтов синхронизации; | Частично | tests/, docs/testing.md | Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты |
| R12-2 | integration-тесты API с настоящей PostgreSQL; | Частично | tests/, docs/testing.md | Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты |
| R12-3 | тесты фоновых заданий, миграций и идемпотентности; | Частично | tests/, docs/testing.md | Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты |
| R12-4 | Playwright E2E основных пользовательских сценариев; | Частично | tests/, docs/testing.md | Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты |
| R12-5 | тесты безопасности авторизации и MFA; | Частично | tests/, docs/testing.md | Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты |
| R12-6 | проверки сборки, типов и lint; | Частично | tests/, docs/testing.md | Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты |
| R12-7 | проверка зависимостей и случайно закоммиченных секретов. | Частично | tests/, docs/testing.md | Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты |
