import { useEffect, useMemo, useState } from 'react';
import { CardConstructor } from './BuildCardPanel';
import { CardPreview } from './CardPreview';
import {
  loadCatalogFromStorage,
  saveCatalogToStorage,
  type GameCard,
} from './cardsData';
import { useSkillTree } from './SkillTreeContext';
import type { ZoneType } from './types';

const BRANCH_GEN: Record<ZoneType, string> = {
  magic: 'Магии',
  strength: 'Ближнего боя',
  dexterity: 'Ловкости',
  wisdom: 'Мудрости',
  center: '',
};

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

export function ConstructorView() {
  const { state, treeData } = useSkillTree();
  const [cards, setCards] = useState<GameCard[]>(loadCatalogFromStorage);
  const [editBuild, setEditBuild] = useState<GameCard | null>(null);
  const treeCards = useMemo(
    () => buildTreeCards(state, treeData),
    [state, treeData],
  );

  const library = cards.filter((c) => c.category !== 'build');
  const builds = cards.filter((c) => c.category === 'build');

  useEffect(() => {
    saveCatalogToStorage(cards);
  }, [cards]);

  useEffect(() => {
    const refresh = () => setCards(loadCatalogFromStorage());
    window.addEventListener('teomor-catalog-updated', refresh);
    return () => window.removeEventListener('teomor-catalog-updated', refresh);
  }, []);

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
    setEditBuild(null);
  };

  const deleteBuild = (id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id));
    if (editBuild?.id === id) setEditBuild(null);
  };

  return (
    <div className="cards-view">
      <div className="ctor-header-stats muted">
        Части из древа: <b>{treeCards.length}</b> · Справочник:{' '}
        <b>{Math.max(0, library.length - treeCards.length)}</b> · Сохранённые приёмы:{' '}
        <b>{builds.length}</b>
      </div>

      <CardConstructor
        library={library}
        treeCards={treeCards}
        onSave={saveBuild}
        editCard={editBuild}
        onCancelEdit={() => setEditBuild(null)}
      />

      {builds.length > 0 && (
        <div className="tree-cards">
          <h3 className="tree-cards-title">Сохранённые приёмы</h3>
          <p className="muted ctor-saved-hint">
            Нажми на карту, чтобы отредактировать состав или описание.
          </p>
          <div className="cards-grid ctor-saved-grid">
            {builds.map((c) => (
              <div key={c.id} className="ctor-saved-item">
                <CardPreview
                  card={c}
                  selected={editBuild?.id === c.id}
                  onClick={() => setEditBuild(c)}
                />
                <button
                  type="button"
                  className="btn btn-mini2 ctor-delete"
                  onClick={() => deleteBuild(c.id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
