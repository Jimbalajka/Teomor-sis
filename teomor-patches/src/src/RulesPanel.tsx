import { useState } from 'react';

const RULES: { h: string; items: string[] }[] = [
  {
    h: 'Бросок',
    items: [
      'kN + Куб Стиля (к6) + Навык (0–15) против Сложности.',
      'Куб Стиля к числу НЕ прибавляется.',
      'Сложность: 5 · 10 · 15 · 20 · 30 · 45 · 60 · 80.',
    ],
  },
  {
    h: 'Раны и КБ',
    items: [
      'Раны 2→6. КБ = 10 + Уклонение + Броня.',
      'Быстрая атака → 1 рана. Приём → по карте.',
    ],
  },
  {
    h: 'Аура',
    items: [
      'Цель −2 уровня → авто. ±1 и выше → бросок или приём.',
      'Против игрока — защита.',
    ],
  },
  {
    h: 'Усталость',
    items: [
      'Макс = 3 + floor(ур/4) + бонусы древа (узлы «+Усталость»).',
      'Пример: ур.15 → 3+3=6 (+ узлы). Тратится по картам-приёмам.',
      'Квель = потолок билда вне игры. За столом — закрашиваешь ячейки.',
    ],
  },
];

interface RulesPanelProps {
  expanded?: boolean;
}

export function RulesPanel({ expanded = false }: RulesPanelProps) {
  const [open, setOpen] = useState(true);
  if (expanded) {
    return (
      <div className="rules-panel rules-panel--full">
        <div className="rules-body">
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
      </div>
    );
  }
  return (
    <div className="rules-panel">
      <button className="rules-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} Памятка (ядро v2)
      </button>
      {open && (
        <div className="rules-body">
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
      )}
    </div>
  );
}
