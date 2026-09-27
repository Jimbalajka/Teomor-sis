# AGENT-CONTEXT — Теомор (живой тезис)

> **Первым делом каждую сессию:** `DECISIONS.md` + `BRIEF.md` → этот файл → `v3/docs/CORE.md` → `Код/src/`.
> Обновлять после каждой сессии.

## СЕЙЧАС (2026-09-27) — stub v3H: навыки ВНУТРИ гекса, не тропа

**Сделано к проверке (LAYOUT_REV=69):**
1. Тропа-цепочка навыков убрана. Навыки листа = **круги на орбите гекса**.
2. Дар Змея → Моторика + кости у дара; боевой гекс / практика-гекс с навыками внутри.
3. Боевой: Ближний бой, Дальний бой, Скрытность, Воровские Навыки (+ черты-заглушки).
4. Практика: Ловкость рук, Печати, Верховая Езда, Вождение, Судовождение, Пилотирование.
5. Акробатика / Уклонение — кости у дара (не в гексе).
6. Остальные дары — тот же каркас (split навыков по двум гексам).
**Live:** https://teomor.acheaches.unstoppable-ai.site/0a95a994-teomor/ (hard refresh).
**Ждём OK.**

## Дневник layout — Проблема → Решение (НЕ ЛОМАТЬ)

### HOTFIX 2026-09-21 ночь — «нет гексов/ромбов»
**Проблема:** на экране бардак без видимых гексов/ромбов.
**Причина:** `syncClusterFramesFromNodes` затирал `lastClusterFrames`; школы/профы без `hub`.
**Решение:** `applyPoeLayout` ставит `hub: hex|diamond`; пустой sync не затирает; `LAYOUT_REV=51` перепаковывает один раз. Проверка: 21 hex + 38 diamond frames.


### Проблема
Паутина всех `parentIds` + орбиты/радиус/stampCluster → наслоения, полукруги школ, каша в центре.

### Решение (утверждено автором 2026-09-20: «Вооот идеально», LS **v39**)
1. Всё на одном холсте — быстрый обзор.
2. Школа = локальная доска (гекс + ромбы суб-профов наружу).
3. Связи только «шоссе» (центр→дар→школа→суб-проф + короткие спицы); длинная паутина parentIds скрыта (`isHighwayEdge`).
4. Рамки через ViewportPortal (`ClusterFramesLayer`), не RF-ноды.
5. Мелкие налезания — ручная правка в редакторе, не новый алгоритм.

### Эталон на диске
- Код: `Код/src/treeLayout.ts` — **CELL=200** school-pack (`applyHighwayLayout`).
- Полный бэкап (не куцый): `teomor-patches/backups-ideal-schoolpack-v39/` — layout + SkillTree + Context + frames + data.
- Реконструкция коммитом: `0b1c94f` (+ LS-recovery стабильных ключей).
- Live: https://teomor.acheaches.unstoppable-ai.site/0a95a994-teomor/ (hard refresh).

### Запрещено без явного запроса автора
- polar / `ZONE_ANGLE` / «звезда»
- `stampCluster` на центр
- cartesian «псевдосетка» day1 как основной layout
- сжимать CELL (140 и т.п.) без просьбы
- **неполный бэкап** (только skillTreeData без treeLayout/SkillTree/Context/frames)
- бамп LS-ключа без просьбы (затирает ручные x/y)

### Правило адекватности
Если решение уже записано здесь или в чате — делать **ровно по нему**, целиком. Не сдавать кривое/неполное и не подменять другим алгоритмом «на всякий случай».

## SoT (источники истины)

| Тема | Файл |
|------|------|
| **Правила v3 (новое ядро)** | `teomor-patches/v3/docs/CORE.md` |
| **Код древа v3 (каркас)** | `teomor-patches/v3/code/` |
| **Правила v2 (эталон)** | `teomor-patches/docs/core/CORE.md` |
| Краткая выжимка | `teomor-patches/docs/CORE-summary.md` |
| **Каталог сигилов** | `teomor-patches/docs/design/sigil-catalog.md` |
| **Каталог аспектов** | `teomor-patches/docs/design/aspect-catalog.md` |
| **Каталог квелей** | `teomor-patches/docs/design/kvel-catalog.md` |
| **Каталог квелей** | `teomor-patches/docs/design/kvel-catalog.md` |
| Полная старая книга (справочник) | `rpg-skill-tree-main/docs/book-player.md` в Teomor-sis |
| Код приложения | `teomor-patches/Код/` (`npm run dev`) |
| Зеркало | `teomor-patches/day1-bundle/app/src/` |


## Режим работы — как «Боту 3» (обязательно)

Пользователь просил вести себя **как Боту 3**: тот не терял контекст, потому что **писал в файлы и коммитил**, а не «держал в голове».

### Старт каждой сессии по Теомору (до первого ответа)
1. Прочитать **этот файл** целиком.
2. Прочитать `docs/core/CORE.md` (правила v2).
3. `git log -5 --oneline` + `git status` в agent и/или Teomor-sis.
4. Только потом код / правки / вопросы пользователю.

### «Запомни» / PDF / контекст из чата
- **Сразу** записать в `AGENT-CONTEXT.md` (решения, приоритеты) или `docs/reference/user-profile.md` (личные prefs).
- **Сразу** `git commit` — в том же ходе, до «готово».
- Ответить: *записано в …, коммит …* — не «хорошо, запомню».

### Запрещено (из-за этого пользователь злится)
- Спрашивать «какой проект?» — это **Теомор**, контекст здесь.
- Переписывать правила не из CORE.md (book-player — только справочник).
- Обещать «10 минут» и молчать — сразу сказать, что сломалось.
- Делать вид, что контекст есть, **не открыв файлы**.

### Конец сессии / после значимой работы
- Обновить § Changelog и § Текущий PR в этом файле.
- Закоммитить незакрытый код в `Код/src/`.
- PR: `Jimbalajka/Teomor-sis`, токен в `.env`, не спрашивать.

### Текущее состояние (обновлять!)
- **PR:** https://github.com/Jimbalajka/Teomor-sis/pull/35 (`feat/core-v3-kvel-mastery` → `main`)
- **PR:** https://github.com/Jimbalajka/Teomor-sis/pull/24 (`feat/tree-fork-logic` → `main`)
- **Локальная ветка agent:** `feat/tree-fork-logic`
- **Канон кода:** `teomor-patches/Код/` → mirror `day1-bundle/app/src/`

## Git / push
- **Репо:** `Jimbalajka/Teomor-sis` (НЕ agent-sputnik, НЕ Teomor)
- **Clone:** `/tmp/teomor-sis` или `~/Teomor-sis`
- **Токен:** `/home/ec2-user/agent/.env` → `GITHUB_TOKEN=...` (не коммитить)
- **Ветка:** новый PR на каждую пачку правок (не переиспользовать смерженный номер)
- **Канон:** `Код/` (npm run dev) + mirror `teomor-patches/day1-bundle/app/src/`

## Текущий PR
- **#37** https://github.com/Jimbalajka/Teomor-sis/pull/37 — `feat/tree-cluster-slots` → `main`

## Приоритет работ (сейчас)
0. **Плейтест ядра v3** — `v3/docs/CORE.md`; древо-каркас в `v3/code/` (не ломать v2 UI)
1. **Плейтест 3 перс.** — обновить пресеты под новые ID
2. UI sidebar — по скринам
3. Баланс позиций — `applyHighwayLayout` (шаг↑, слоты за |x|max), live URL в `docs/reference/teomor.md`

## Core v2 (кратко)
- Валюта: **ОР** | Бой: **КБ**=10+укл+броня | **Раны** 2–6 | **Усталость**
- Дары: +1 ключ. стат за ур.; дороги `road_sch_*_0..3`
- Виэт: `sch_viet`, `road_sch_viet_*` | Кибер: `sch_cybernetics`, `road_sch_cybernetics_*`

## Общая ветка (центр)
- `g_hub` → **⚔ выбор:** `g_path_body` | `g_path_mind` | `g_path_master` + PoE-roads
- Кольцо: `g_resolve`, `g_alert`, синтез `g_second_wind` (2 родителя)

## Механика развилок
- `exclusiveGroup` в types + nodeStatus — один узел из группы
- Суб-классы: `prof_${school}` (один на школу)
- Подсказка: `⚔ Выбор` в description + tooltip

## Магия (синий) — сделано
- D&D: Arcane Recovery, Portent, Evoker/Abjurer, Grim Harvest, Stoneskin…
- PoE: keystone fork `wiz_keystone` (стекло vs батарея)
- Forks: necro/blood/chrono/illus/geo/mystic/alch/ench/artifice

## Сила (красный) — сделано
- Viet stances: `viet_stance` exclusive
- Berserk/Smith/Awaken roads + `berserk_keystone` fork
- `tough_style`, `fork_berserk`, `fork_smith`, `feat_iron_blood`

## Ловкость (зелёный) — Дар Змея (2026-09-14)
- **6 профессий:** Аристократ, Стрелок, Тень, Цигун, Наемник Туо (5 кланов), Кибернетика
- **Развилка:** 2 базовых навыка → продолжение ИЛИ углубление A ИЛИ B (вручную exclusive)
- **Туо:** без продолжения — сразу 5 кланов (`st_tuo_*`) после `ts_tuo_base2`
- **Афферист:** `prof_shadow_affair` требует **2 ур. Дара Голубя**
- **Цигун ≠ Изумрудная стопа:** ци-серии vs печати-конечности
- **Кибернетика:** имплант = сигил; квели `cyb_queima` / `cyb_mente` / `cyb_relampago`
- **Код:** `Код/src/dexterityProfessions.ts` + spread в `skillTreeData.ts`

## Мудрость (янтарный) — сделано
- Witch/Psi/Divine/Leader roads + keystone forks
- Warlock/Sorcerer/Pactmaker/Summoner/Divine prof forks
- `feat_witch_oracle` (witch + psionics)

## Визуальный SoT древа (обязательно)
- Эталон: скрины пользователя с **логикой путей и развилок** (Y/поперечный веер от ствола), не «звезда из центра».
- `exclusiveGroup` = аккуратная развилка поперёк шоссе (`placeExclusiveFork`), не каша.
- Центр: компас + `g_hub` → 3 пути. Не заявлять «готово», пока не совпало со скрином.
- Каждая пачка UI = **новый PR**. Режим как «Боту 3»: писать в файлы + коммит, не держать в голове.

## Не делать
- **Всегда новый PR** на каждую пачку правок. Не дописывать в открытый PR и не тыкать в смерженный.
- **Всегда новый PR** на каждую пачку правок. Не дописывать в открытый PR и не тыкать в смерженный.
- **НЕ затирать** `Код/src/SkillTree*.tsx` / Context тонкой копией из agent — там живут toolbar, treeFocus, routeHighlight, applyHighwayLayout
- UI-правки Теомора → сразу дать кликабельную HTTPS-ссылку (см. `docs/reference/teomor.md`), не «готово» без просмотра
- Не менять архитектуру UI/CSS без запроса
- Не добавлять banner/verify/buildInfo слои
- Не менять архитектуру UI/CSS без запроса
- Не добавлять banner/verify/buildInfo слои
- Не просить токен — читать `.env`
- Не пушить в PhDSputnikFleet
- Не трогать пресеты пока не готова ветка

## Changelog
- 2026-09-27: stub v3H — навыки листа кругами внутри гексов, тропа убрана; LAYOUT_REV=69
- 2026-09-20: CORE v3 папка `teomor-patches/v3/` (квель+мастерство+к8); каркас древа v3; v2 не заменён
- 2026-09-15: fork logic по эталону путей (placeExclusiveFork для всех exclusiveGroup); центр-компас; LS v17; PR #34
- 2026-09-15: restore UI (treeFocus/route) + denser highway spacing; slots вне веток; LS v15; live https://teomor.acheaches.unstoppable-ai.site/0a95a994-teomor/
- 2026-09-15: сетка древа — `treeLayout.ts` (CELL 160), pack без наложений; слоты Черт/Ремёсел вынесены; дубли addRoad убраны; LS_DATA v9
- 2026-03-28: green + amber + PR (all branches complete)
- 2026-03-28: general branch + exclusiveGroup + magic/red rework (D&D/PoE forks)
- 2026-03-28: файл создан
- 2026-09-11: режим «Боту 3» в AGENT-CONTEXT; PR #34; CORE.md SoT


## Текущий PR
- **#31** https://github.com/Jimbalajka/Teomor-sis/pull/31 — `feat/tree-poe-compact-no-frames` → `main`

## 2026-09-21 rollback
Откат на резервную копию `backups-tree-pre-noklass` + UI/layout с `6a2f6ab` (working hex map). LS `v48_backup_restore`. Live пересобран. PR нет.

## 2026-09-21 LS recovery
Причина пропажи сохранёнки: постоянный bump `LS_DATA` + `applyPoeLayout` при load затирал x/y. Исправлено: стабильные ключи `teomor_skill_tree_data` / `teomor_skill_tree_state`, fallback по старым ключам (v39…), позиции из LS не пересчитываются. Не бампать LS без явной просьбы.
