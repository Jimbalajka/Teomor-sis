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
  const treeCards = useMemo(
    () => buildTreeCards(state, treeData),
    [state, treeData],
  );

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
  };

  const builds = cards.filter((c) => c.category === 'build');

  return (
    <div className="cards-view">
      <CardConstructor
        library={cards.filter((c) => c.category !== 'build')}
        treeCards={treeCards}
        onSave={saveBuild}
      />
      {builds.length > 0 && (
        <div className="tree-cards">
          <h3 className="tree-cards-title">Сохранённые приёмы</h3>
          <div className="cards-grid">
            {builds.map((c) => (
              <CardPreview key={c.id} card={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
