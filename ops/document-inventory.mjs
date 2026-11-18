import {readFile,writeFile} from 'node:fs/promises';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
const licenses=['package\tversion\tdeclared_license'];
for(const [path,value] of Object.entries(lock.packages||{}))if(path)licenses.push([path.replace(/^node_modules\//,''),value.version||'',typeof value.license==='string'?value.license:'not declared in lockfile; inspect distributed package'].join('\t'));
await writeFile('docs/third-party-licenses.tsv',licenses.join('\n')+'\n');
const spec=await readFile('docs/requirements.md','utf8');
const rows=[];let section=0,index=0;
const rules=[
 [4,/TypeScript|React|NestJS|PostgreSQL|Docker Compose|REST API|миграции|транзакции|фоновые задания|health\/readiness|конфигурацию|SaaS/i,'Частично','server/, compose.yaml','Серверные тесты, build; Compose не запущен'],
 [5,/первичную настройку|безопасное хеширование|управление сессиями|TOTP 2FA|одноразовые резервные|обязательную 2FA|защиту от повторного/i,'Реализовано в указанном объёме','server/core/','core integration + browser E2E'],
 [5,/вход по email|отключённую по умолчанию|безопасное подключение/i,'Частично','server/core/','Ручные приглашения/reset; SMTP нет'],
 [6,/типы:|стабильные ключи|иерархию|историю изменений|Рабочие|представления/i,'Частично','server/core/, web/','core tests + E2E; см. summary matrix'],
 [6,/описания с|исполнителя|оценки времени|полнотекстовый/i,'Частично','server/core/, web/','Markdown/comments, labels, assignee, points; нет mentions/files/fulltext UI'],
 [6,/организацию|шаблоны|типизированные|архивирование/i,'Не завершено','server/core/','Часть полей есть; полный критерий не принят'],
 [7,/burndown|burnup|velocity|planned\/completed|изменения объёма|predictability|lead time|cumulative flow|throughput|aging|возвраты|план\/факт/i,'Частично','server/planning/','metrics.md; scalar tests; полного набора отчётов нет'],
 [8,/wiki|дерево страниц|ссылки между|шаблоны документов|ручной учёт|timesheets/i,'Частично','server/planning/, web/','Versions/manual time/day approval; остальные части не приняты'],
 [9,/Подключение|Проверку соединения|Несколько подключений|Связь задач|Распознавание|Приём project webhooks|Фоновую сверку/i,'Частично','server/integrations/','HTTP fixtures + PostgreSQL; живой CE не проверен'],
 [9,/Панель разработки|Создание ветки|Создание GitLab issue|страницу диагностики/i,'Частично','server/integrations/, web/GitLabActions.tsx','Часть API/UI; см. gitlab.md'],
 [10,/календарную подписку|импорт\/экспорт|импорт задач|REST API/i,'Частично','server/planning/, server/integrations/','ICS API, JSON/CSV export, GitLab import; отсутствует общий import'],
 [11,/русский язык|светлую|desktop-first|клавиатурную|быстрый поиск|состояния загрузки|валидацию|одновременного/i,'Частично','web/','Browser E2E + screenshots; нет полного accessibility audit'],
 [12,/.*/,'Частично','tests/, docs/testing.md','Фактические проверки перечислены в testing.md; все сценарии ТЗ не закрыты'],
];
for(const line of spec.split(/\r?\n/)){
 const heading=line.match(/^## (\d+)\./);if(heading){section=Number(heading[1]);index=0;continue;}
 if(section<4||section>12)continue;
 const item=line.match(/^[-]\s+(.+)/)||section===9&&line.match(/^\d+\.\s+(.+)/);if(!item)continue;
 const text=item[1].replace(/\|/g,'/');const rule=rules.find(([s,re])=>s===section&&re.test(text));
 rows.push([`R${section}-${++index}`,text,rule?.[2]||'Не реализовано / не подтверждено',rule?.[3]||'—',rule?.[4]||'Нет принятой проверки'].join(' | '));
}
await writeFile('docs/acceptance-detail.md','# Детальная трассировка требований\n\nКритерии взяты из пунктов исходного ТЗ. «Частично» не означает приёмку всего пункта. Это консервативная инвентаризация; сводка и конкретные ограничения — в acceptance-matrix.md и checkpoint.md. Текстовые требования между списками также остаются обязательными.\n\n| ID | Критерий из ТЗ | Статус | Реализация | Проверка / ограничение |\n|---|---|---|---|---|\n'+rows.map(r=>'| '+r+' |').join('\n')+'\n');
console.log(`Inventoried ${licenses.length-1} dependency declarations and ${rows.length} requirement bullets.`);
