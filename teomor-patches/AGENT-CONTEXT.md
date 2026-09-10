# AGENT-CONTEXT — Теомор (живой тезис)

> Обновлять после каждой сессии. Детали — в `Код/src/`, не дублировать сюда.

## Git / push
- **Репо:** `Jimbalajka/Teomor-sis` (НЕ agent-sputnik, НЕ Teomor)
- **Clone:** `/tmp/teomor-sis` или `~/Teomor-sis`
- **Токен:** `/home/ec2-user/agent/.env` → `GITHUB_TOKEN=...` (не коммитить)
- **Ветка:** `feat/core-v2-full` → PR в main
- **Канон:** `teomor-patches/Код/src/` + mirror `day1-bundle/app/src/`

## Текущий PR
- feat/skill-tree-all-branches → main (все 4 дара + центр)

## Приоритет работ (сейчас)
1. **Плейтест 3 перс.** — обновить пресеты под новые ID
2. UI sidebar — по скринам
3. Баланс позиций узлов

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

## Ловкость (зелёный) — сделано
- Duel/Ranged/Stealth/Acro/Cyber/Pero roads + keystone forks
- `ranged_style`, `acro_style`, `cyber_path`, `fork_pero`, `feat_shadow_dancer`

## Мудрость (янтарный) — сделано
- Witch/Psi/Divine/Leader roads + keystone forks
- Warlock/Sorcerer/Pactmaker/Summoner/Divine prof forks
- `feat_witch_oracle` (witch + psionics)

## Не делать
- Не просить токен — читать `.env`
- Не пушить в PhDSputnikFleet
- Не трогать пресеты пока не готова ветка

## Changelog
- 2026-03-28: green + amber + PR (all branches complete)
- 2026-03-28: general branch + exclusiveGroup + magic/red rework (D&D/PoE forks)
- 2026-03-28: magic branch b555728; sidebar 340px+scroll
- 2026-03-28: файл создан
