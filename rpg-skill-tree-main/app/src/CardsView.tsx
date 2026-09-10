import { useEffect, useRef, useState } from 'react';
import {
  CATEGORY_LABEL,
  initialCards,
  type CardCategory,
  type GameCard,
} from './cardsData';
import { CardPreview } from './CardPreview';
import { CardConstructor } from './CardConstructor';
import { RulesPanel } from './RulesPanel';
import { useSkillTree } from './SkillTreeContext';
import type { ZoneType } from './types';

const LS_CARDS = 'teomor_cards_v1';

const BRANCH_GEN: Record<ZoneType, string> = {
  magic: 'Магии',
  strength: 'Ближнего боя',
  dexterity: 'Ловкости',
  wisdom: 'Мудрости',
  center: '',
};

type CardsMode = 'collection' | 'constructor';

function loadCards(): GameCard[] {
  try {
    const raw = localStorage.getItem(LS_CARDS);
    if (!raw) return initialCards;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialCards;
    return parsed.map((c: GameCard & { osLimit?: number }) => ({
      ...c,
      fatigueMax: c.fatigueMax ?? c.osLimit,
    }));
  } catch {
    return initialCards;
  }
}

const CATS: (CardCategory | 'all')[] = [
  'all',
  'build',
  'kvel',
  'aspect',
  'sigil',
  'instrument',
];

function buildTreeCards(
  state: ReturnType<typeof useSkillTree>['state'],
  treeData: ReturnType<typeof useSkillTree>['treeData'],
): GameCard[] {
  const out: GameCard[] = [];
  const seen = new Set<string>();
  const add = (c: GameCard) => {
    const key = `${c.category}:${c.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };
  for (const id of state.allocatedNodes) {
    const node = treeData.nodes.find((n) => n.id === id);
    if (!node) continue;
    if (node.category === 'specialization') {
      add({
        id: `tk_${id}`,
        category: 'kvel',
        name: `Квель ${BRANCH_GEN[node.zone]}`,
        cost: 0,
        fatigueMax: 2,
        description: 'Общий Квель пути (из древа).',
      });
    }
    const picks = state.nodeChoices[id] ?? [];
    let isProfession = false;
    for (const c of node.choices ?? []) {
      const chosen = picks.filter((p) => c.options.some((o) => o.id === p));
      if (c.id === 'aspect') {
        isProfession = true;
        chosen.forEach((a) =>
          add({
            id: `ta_${id}_${a}`,
            category: 'aspect',
            name: a,
            cost: 1,
            description: 'Аспект (из древа).',
          }),
        );
      } else if (c.id === 'sigils') {
        chosen.forEach((s) =>
          add({
            id: `ts_${id}_${s}`,
            category: 'sigil',
            name: s,
            cost: 1,
            description: 'Сигил (из древа).',
          }),
        );
      }
    }
    if (isProfession) {
      add({
        id: `tkp_${id}`,
        category: 'kvel',
        name: `Квель: ${node.label}`,
        cost: 0,
        fatigueMax: 2,
        description: 'Специализированный Квель профессии (из древа).',
      });
    }
  }
  return out;
}

export function CardsView() {
  const { state, treeData } = useSkillTree();
  const [cards, setCards] = useState<GameCard[]>(loadCards);
  const [mode, setMode] = useState<CardsMode>('collection');
  const [filter, setFilter] = useState<CardCategory | 'all'>('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [editBuildId, setEditBuildId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const treeCards = buildTreeCards(state, treeData);

  useEffect(() => {
    localStorage.setItem(LS_CARDS, JSON.stringify(cards));
  }, [cards]);

  const sel = cards.find((c) => c.id === selId) ?? null;
  const editBuild = cards.find((c) => c.id === editBuildId) ?? null;
  const shown = cards.filter((c) => filter === 'all' || c.category === filter);

  const patch = (id: string, ch: Partial<GameCard>) =>
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...ch } : c)));

  const saveBuild = (card: GameCard) => {
    setCards((cs) => {
      const i = cs.findIndex((c) => c.id === card.id);
      if (i >= 0) {
        const next = [...cs];
        next[i] = card;
        return next;
      }
      return [...cs, card];
    });
    setEditBuildId(null);
    setMode('collection');
    setFilter('build');
    setSelId(card.id);
  };

  const addCard = () => {
    const cat: CardCategory =
      filter === 'all' || filter === 'build' ? 'sigil' : filter;
    const id = `card_${Date.now().toString(36)}`;
    setCards((cs) => [
      ...cs,
      {
        id,
        category: cat,
        name: 'Новая карта',
        cost: 1,
        description: '',
      },
    ]);
    setSelId(id);
    setMode('collection');
  };

  const del = (id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id));
    setSelId(null);
    if (editBuildId === id) setEditBuildId(null);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cards.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          setCards(parsed);
          setSelId(null);
        } else alert('Ожидался массив карт.');
      } catch {
        alert('Некорректный JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="cards-view">
      <div className="cards-toolbar">
        <div className="cards-mode">
          <button
            className={`btn btn-mini2 ${mode === 'collection' ? 'btn-primary' : ''}`}
            onClick={() => {
              setMode('collection');
              setEditBuildId(null);
            }}
          >
            Коллекция
          </button>
          <button
            className={`btn btn-mini2 ${mode === 'constructor' ? 'btn-primary' : ''}`}
            onClick={() => {
              setMode('constructor');
              setSelId(null);
              setEditBuildId(null);
            }}
          >
            Конструктор
          </button>
        </div>
        {mode === 'collection' && (
          <div className="cards-cats">
            {CATS.map((c) => (
              <button
                key={c}
                className={`btn btn-mini2 ${filter === c ? 'btn-primary' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c === 'all' ? 'Все' : CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        )}
        <div className="cards-actions">
          {mode === 'collection' && (
            <button className="btn btn-primary" onClick={addCard}>
              + Карта
            </button>
          )}
          {mode === 'collection' && (
            <button
              className="btn"
              onClick={() => {
                setMode('constructor');
                setEditBuildId(null);
              }}
            >
              + Приём
            </button>
          )}
          <button className="btn" onClick={exportJson}>
            Экспорт
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Импорт
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {mode === 'constructor' ? (
        <CardConstructor
          library={cards.filter((c) => c.category !== 'build')}
          treeCards={treeCards}
          onSave={saveBuild}
          editCard={editBuild}
          onCancelEdit={() => setEditBuildId(null)}
        />
      ) : (
        <div className="cards-main">
          <div className="cards-grid">
            {shown.map((c) => (
              <CardPreview
                key={c.id}
                card={c}
                selected={c.id === selId}
                onClick={() => setSelId(c.id)}
              />
            ))}
            {shown.length === 0 && (
              <p className="muted">
                Нет карт. «+ Карта» — справочник; «+ Приём» — конструктор.
              </p>
            )}
          </div>

          {sel && sel.category !== 'build' && (
            <div className="card-editor">
              <h3>Редактор карты</h3>
              <label>
                Категория
                <select
                  value={sel.category}
                  onChange={(e) =>
                    patch(sel.id, { category: e.target.value as CardCategory })
                  }
                >
                  {(
                    ['kvel', 'aspect', 'sigil', 'instrument'] as CardCategory[]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Название
                <input
                  value={sel.name}
                  onChange={(e) => patch(sel.id, { name: e.target.value })}
                />
              </label>

              {sel.category === 'kvel' ? (
                <div className="ed-row">
                  <label>
                    Ранг (10..1)
                    <input
                      type="number"
                      value={sel.rank ?? 10}
                      onChange={(e) =>
                        patch(sel.id, { rank: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Макс. усталость
                    <input
                      type="number"
                      value={sel.fatigueMax ?? 2}
                      onChange={(e) =>
                        patch(sel.id, { fatigueMax: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              ) : (
                <label>
                  Усталость
                  <input
                    type="number"
                    value={sel.cost}
                    onChange={(e) =>
                      patch(sel.id, { cost: Number(e.target.value) })
                    }
                  />
                </label>
              )}

              <div className="ed-row">
                <label>
                  Урон
                  <input
                    value={sel.damage ?? ''}
                    placeholder="1к8"
                    onChange={(e) => patch(sel.id, { damage: e.target.value })}
                  />
                </label>
                <label>
                  Дальность
                  <input
                    value={sel.range ?? ''}
                    placeholder="6 клеток"
                    onChange={(e) => patch(sel.id, { range: e.target.value })}
                  />
                </label>
              </div>
              <div className="ed-row">
                <label>
                  Площадь
                  <input
                    value={sel.area ?? ''}
                    placeholder="2х2"
                    onChange={(e) => patch(sel.id, { area: e.target.value })}
                  />
                </label>
                <label>
                  Состояние
                  <input
                    value={sel.states ?? ''}
                    placeholder="Ослепление"
                    onChange={(e) => patch(sel.id, { states: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Профессия/тип
                <input
                  value={sel.profession ?? ''}
                  placeholder="Волшебник / воин / маг"
                  onChange={(e) =>
                    patch(sel.id, { profession: e.target.value })
                  }
                />
              </label>
              <label>
                Описание
                <textarea
                  rows={3}
                  value={sel.description}
                  onChange={(e) =>
                    patch(sel.id, { description: e.target.value })
                  }
                />
              </label>

              <div className="card-editor-preview">
                <CardPreview card={sel} />
              </div>
              <button className="btn btn-danger" onClick={() => del(sel.id)}>
                Удалить карту
              </button>
            </div>
          )}

          {sel && sel.category === 'build' && (
            <div className="card-editor">
              <h3>Приём (сборка)</h3>
              <CardPreview card={sel} />
              {sel.mechanicalNote && (
                <p className="muted">Состав: {sel.mechanicalNote}</p>
              )}
              <div className="ctor-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditBuildId(sel.id);
                    setMode('constructor');
                  }}
                >
                  Редактировать в конструкторе
                </button>
                <button className="btn btn-danger" onClick={() => del(sel.id)}>
                  Удалить приём
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'collection' &&
        treeCards.filter((c) => filter === 'all' || c.category === filter)
          .length > 0 && (
          <div className="tree-cards">
            <h3 className="tree-cards-title">Карты из древа (авто)</h3>
            <div className="cards-grid">
              {treeCards
                .filter((c) => filter === 'all' || c.category === filter)
                .map((c) => (
                  <CardPreview key={c.id} card={c} />
                ))}
            </div>
          </div>
        )}

      <RulesPanel />
    </div>
  );
}
