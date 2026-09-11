# AGENT-CONTEXT — Теомор (живой тезис)

> Обновлять после каждой сессии. Детали — в `Код/src/`, не дублировать сюда.

## Git / push
- **Репо:** `Jimbalajka/Teomor-sis` (НЕ agent-sputnik, НЕ Teomor)
- **Clone:** `/tmp/teomor-sis` или `~/Teomor-sis`
- **Токен:** `/home/ec2-user/agent/.env` → `GITHUB_TOKEN=...` (не коммитить)
- **Ветка:** `feat/core-v2-full` → PR в main
- **Канон:** `teomor-patches/Код/src/` + mirror `day1-bundle/app/src/`

## Текущий PR
- #12 — playtest UI fixes (может быть merged)
- Следующий push — magic branch + sidebar

## Приоритет работ (сейчас)
1. **UI:** sidebar — прокрутка, крупнее шрифты/кнопки
2. **Древо:** синяя ветка (Дар Медведя) — 3 школы с разными плюс/минус, дороги, кросс-ветки
3. **Плейтест 3 перс.** — ОТЛОЖЕНО до нормального древа
4. Красная/зелёная/янтарная ветки — после синей

## Core v2 (кратко)
- Валюта: **ОР** | Бой: **КБ**=10+укл+броня | **Раны** 2–6 | **Усталость**
- Дары: +1 ключ. стат за ур.; дороги `road_sch_*_0..3`
- Виэт: `sch_viet`, `road_sch_viet_*` | Кибер: `sch_cybernetics`, `road_sch_cybernetics_*`

## Магия — 3 маршрута (синий)
| Школа | ID | Философия |
|-------|-----|-----------|
| Волшебство | `sch_wizardry` | DPS, Sигилы, усталость↑ |
| Мистика | `sch_mysticism` | контроль, психика, броня↓ |
| Ремесленник | `sch_craft` | предметы, холодные, без фокуса слабее |

Кросс-узлы: `feat_warmage`, `feat_oracle`, `feat_sigil_scribe`, `ts_arcane_bridge` (2 школы).

## Не делать
- Не просить токен — читать `.env`
- Не пушить в PhDSputnikFleet
- Не трогать пресеты пока не готова ветка

## Changelog
- 2026-03-28: файл создан; фокус на magic branch + sidebar
