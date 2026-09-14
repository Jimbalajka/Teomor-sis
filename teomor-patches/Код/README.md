# Теомор - Древо Навыков (веб-приложение)

Интерактивное древо навыков для настольной ролевой системы «Теомор».
Стек: React + TypeScript + Vite + [@xyflow/react](https://reactflow.dev).

## Запуск

```bash
cd app
npm install
npm run dev      # http://localhost:5173
```

Сборка статики (для хостинга):

```bash
npm run build    # -> app/dist/
npm run preview  # локальный просмотр сборки
```

## Структура

| Файл | Назначение |
|---|---|
| `src/types.ts` | Модель данных: узлы, рёбра, состояние. |
| `src/skillTreeData.ts` | Стартовое древо (узлы + связи). Правится здесь. |
| `src/nodeStatus.ts` | Логика статусов (locked/available/unlocked), требования. |
| `src/SkillTreeContext.tsx` | Состояние (reducer) + localStorage + агрегат модификаторов. |
| `src/CustomSkillNode.tsx` | Отрисовка узла: цвет ветки, статус, секрет, тултип. |
| `src/SkillTree.tsx` | Граф React Flow (узлы, рёбра, миникарта). |
| `src/Sidebar.tsx` | Вкладки (Древо/Лист/Карты), очки ОУ/ОО, Дары, модификаторы. |
| `src/CharacterSheet.tsx` | Лист персонажа (навыки по 4 характеристикам, автосохранение). |
| `src/CardsView.tsx` + `CardPreview.tsx` + `cardsData.ts` | Конструктор карт (Квель/Аспект/Сигил/Инструмент). |
| `src/races.ts` / `backgrounds.ts` | Данные рас и предысторий (редактируются). |
| `src/index.css` | Тёмная тема, состояния узлов, адаптив. |

Три вкладки: **Древо** (граф навыков + режим редактора), **Лист** (лист
персонажа), **Карты** (создание/редактирование карт по категориям, экспорт/импорт).

## Редактор древа (в приложении)

Кнопка «✎ Режим редактора» в сайдбаре:
- узлы таскаются мышью (позиция сохраняется);
- соединение: тяни от кружка-хэндла одного узла к другому (создаёт связь +
  родителя в требованиях);
- «+ Узел» добавляет узел; клик по узлу — правка полей справа (название, ветка,
  тип, цена, модификаторы, секрет, требования);
- «Экспорт» скачивает `skillTreeData.json`, «Импорт» загружает его обратно.

Всё правится в браузере и хранится в localStorage. Чтобы зафиксировать древо в
коде — Экспорт JSON и вставить содержимое как `initialSkillTree`.

## Как добавить узел вручную (в коде)

Добавь объект в `nodes` и связь в `edges` в `skillTreeData.ts`. Поля узла
описаны в `types.ts` (`SkillNode`).

Геймдизайн системы: `../docs/game-design.md`.

## ⚠ Windows / частичное копирование

**Замени весь `src/` целиком**, не отдельные файлы. Иначе:
- `EditorPanel`: ошибка `CostType | "transit"`
- нет вкладки «Конструктор» и блока «Плейтест»
- `Sidebar` / `characterSheetData` — «is not a module»

Файлы после фикса Windows:
- `BuildCardPanel.tsx` (был `CardConstructor.tsx`)
- `cardBuilderLogic.ts` (был `cardConstructor.ts`)

## ⚠ Windows / частичное копирование

**Замени весь `src/` целиком**, не отдельные файлы. Иначе:
- `EditorPanel`: ошибка `CostType | "transit"`
- нет вкладки «Конструктор» и блока «Плейтест»
- `Sidebar` / `characterSheetData` — «is not a module»

Файлы после фикса Windows:
- `BuildCardPanel.tsx` (был `CardConstructor.tsx`)
- `cardBuilderLogic.ts` (был `cardConstructor.ts`)
