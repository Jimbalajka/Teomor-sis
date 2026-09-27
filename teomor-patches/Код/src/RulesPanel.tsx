import { useState } from 'react';
import {
  AURA_AUTOFALL_GAP,
  AURA_MAX,
  CHECK_BASE,
  MASTERY_TIERS,
  checkDifficulty,
  successOnD8,
} from './coreRules';

const RULES: { h: string; items: string[] }[] = [
  {
    h: 'За столом',
    items: [
      'Аура · мастерство · условие · к8 · Раны · Усталость · карты приёмов.',
      'Квель — лимит мощи/усталости приёма, не число авто.',
      'Кость к8 вживую; приложение считает КБ, потолки, лимиты квеля.',
    ],
  },
  {
    h: 'Проверка',
    items: [
      'Аура > уровень цели и нет условия → автоуспех.',
      `Уровень цели ≥ аура + ${AURA_AUTOFALL_GAP} → автопровал; Мастер может дать проверку — успех с эхом (последствие).`,
      `Иначе к8 ≥ ${CHECK_BASE} + ступень_цели − ступень_моя.`,
      'Условие сцены форсит проверку даже при старшей ауре.',
      'Цель без листа: уровень 1…10 (+ ярлык ступени). Сундуку полный квель не нужен.',
    ],
  },
  {
    h: 'Аура',
    items: [
      `Одно число лиги героя: 1…${AURA_MAX} (эпик редко 11–12).`,
      'Растёт вехами кампании, не суммой квелей.',
    ],
  },
  {
    h: 'Мастерство',
    items: [
      `Ступени: ${MASTERY_TIERS.join(' → ')} (0…6).`,
      `Сложность = ${CHECK_BASE} + их − моя. Выше 8 — нужен приём/инструмент.`,
      'к8: 1 → риск крит-провала; 8 → риск крит-успеха (взрыв ещё раз).',
    ],
  },
  {
    h: 'Квель',
    items: [
      'Ранг 1…10: потолок усталости приёма, пассив/стойка, доступ к домену.',
      'Не класс. Не ось авто за столом.',
      'Приём: Квель + Аспект(ы) + Сигилы; сумма ≤ лимит квеля.',
    ],
  },
  {
    h: 'Раны · КБ · Усталость',
    items: [
      'Раны 2→6. HP числами — нет.',
      'КБ = 10 + Уклонение + Броня (слой A/B позже).',
      'Усталость на карте-приёме впечатана — за столом закрашиваешь деления.',
    ],
  },
  {
    h: 'Вдохновение · Уныние',
    items: [
      'Вдохновение (макс 3): перекинуть к8 · снять уныние/рану.',
      'Уныние (макс 3): форс условия · рана · −1 ступень на бросок.',
      'Длинный отдых сбрасывает оба.',
    ],
  },
];

interface RulesPanelProps {
  expanded?: boolean;
  /** Аура героя для подсказки */
  level?: number;
}

export function RulesPanel({ expanded = false, level = 1 }: RulesPanelProps) {
  const [open, setOpen] = useState(true);
  const aura = level;
  const example = checkDifficulty(3, 3); // эксперт vs эксперт

  const body = (
    <div className="rules-body">
      <p className="rules-kn-hint muted">
        Аура {aura} · пример эксперт vs эксперт: к8 ≥ {example} ({successOnD8(example)}) · CORE v3
      </p>
      {RULES.map((r) => (
        <section key={r.h} className="rules-sec">
          <h4>{r.h}</h4>
          <ul>
            {r.items.map((i, k) => (
              <li key={k}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );

  if (expanded) {
    return <div className="rules-panel rules-panel--full">{body}</div>;
  }

  return (
    <div className="rules-panel">
      <button type="button" className="rules-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} Памятка (CORE v3)
      </button>
      {open && body}
    </div>
  );
}
