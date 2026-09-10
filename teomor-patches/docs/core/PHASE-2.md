# Этап 2 — состояние приложения (ядро v2)

PR после мержа #19. Один PR на этап.

## Что сделано

### Новые файлы
- `coreRules.ts` — константы ядра v2: КБ, раны, усталость, аура, сложность, потолки 0–15/20.

### `types.ts`
- `SkillTreeState.combat` — раны и усталость (тек/макс).
- `SkillTreeState.armorBonus` — ручной бонус брони для КБ.

### `SkillTreeContext.tsx`
- Ключ localStorage: `teomor_skill_tree_state_v4` (fallback с v3).
- Экшены: `TAKE_WOUND`, `HEAL_WOUND`, `ADD_FATIGUE`, `CLEAR_FATIGUE`, `REST`, `SET_ARMOR_BONUS`.
- Автопересчёт `woundsMax` / `fatigueMax` при смене уровня и модификаторов древа.
- Контекст: `kb` (10 + Уклонение + броня).

### UI
- **Sidebar** — панель боя: КБ, раны, усталость, отдых.
- **CharacterSheet** — КБ/раны/усталость из состояния (не ручной ввод).
- **Карты** — `osLimit` → `fatigueMax`, подписи «уст.» вместо «ОС».

## Скопировать в app/src/
```
coreRules.ts
types.ts
SkillTreeContext.tsx
Sidebar.tsx
characterSheetData.ts
CharacterSheet.tsx
cardsData.ts
CardPreview.tsx
CardsView.tsx
```

## Проверка
```bash
npm run build
```
Открыть приложение → Sidebar: +рана, +усталость → значения на листе совпадают.

## Следующий этап (3)
Лист персонажа: полная привязка навыков 0–15, убрать остатки «Порог/Лимит ОС» в `skillTreeData.ts`.
