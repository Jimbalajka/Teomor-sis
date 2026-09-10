# День 1 — миграция на ядро v2 (ОР)

## Вариант А: готовый бандл
Скопируй всё из `day1-bundle/app/src/` в свой `app/src/`.

## Вариант Б: патчи по файлам
Из `src/`: types, treeEconomy, SkillTreeContext, nodeStatus, Sidebar, RulesPanel.

## Документы
`docs/playtest/DAY1-CHARACTERS.md` — перенос 3 персонажей (включая киборга)
`docs/playtest/PAMYATKA-STOLA.md` — печать за стол
`docs/playtest/DAY1-CHECKLIST.md`

## localStorage
Ключ `teomor_skill_tree_state_v4` (этап 2; fallback с v3). Старые ОУ+ОО → сумма в ОР. Раны/усталость — в `state.combat`.

## День 2
Узлы Виэт, Кибернетика, карты JSON.
