import { useEffect, useMemo, useState } from 'react';
import { useSkillTree } from './SkillTreeContext';
import { raceById } from './races';
import { backgroundById } from './backgrounds';
import { AbilitiesTable } from './AbilitiesTable';
import type { AbilityRow } from './abilityRows';
import { DERIVED_FIELDS, SKILL_GROUPS, type SkillGroup } from './characterSheetData';
import { collectStartingGrants } from './grants';
import {
  giftRank,
  rankArrow,
  treeSkillRank,
  zoneForChar,
} from './ranks';
import { MASTERY_TIERS_RU } from './skillTreeData';

const LS_SHEET = 'teomor_sheet_v1';

function loadSheet(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_SHEET) ?? '{}');
  } catch {
    return {};
  }
}

const zoneOfChar: Record<SkillGroup['char'], string> = {
  Мощь: 'strength',
  Разум: 'magic',
  Моторика: 'dexterity',
  Стержень: 'wisdom',
};

export function CharacterSheet() {
  const { state, treeData, kb } = useSkillTree();
  const { combat } = state;
  const [fields, setFields] = useState<Record<string, string>>(loadSheet);
  const [abilities, setAbilities] = useState<AbilityRow[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('teomor_abilities_v1') ?? '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_SHEET, JSON.stringify(fields));
  }, [fields]);

  useEffect(() => {
    const refresh = () => setFields(loadSheet());
    window.addEventListener('teomor-sheet-updated', refresh);
    const abRefresh = () => {
      try {
        setAbilities(JSON.parse(localStorage.getItem('teomor_abilities_v1') ?? '[]'));
      } catch {
        setAbilities([]);
      }
    };
    window.addEventListener('teomor-abilities-updated', abRefresh);
    return () => {
      window.removeEventListener('teomor-sheet-updated', refresh);
      window.removeEventListener('teomor-abilities-updated', abRefresh);
    };
  }, []);

  const set = (key: string, val: string) =>
    setFields((f) => ({ ...f, [key]: val }));

  const race = raceById(state.race);
  const bg = backgroundById(state.background);
  const grants = useMemo(() => collectStartingGrants(state), [state]);

  const proficiencies = useMemo(() => {
    const fromState = state.proficiencies ?? [];
    return [...new Set([...fromState, ...grants.proficiencies])];
  }, [state.proficiencies, grants.proficiencies]);

  const quels: string[] = [];
  const aspects: string[] = [];
  const sigils: string[] = [];
  const feats: string[] = [];
  const crafts: string[] = [];
  for (const id of state.allocatedNodes) {
    const node = treeData.nodes.find((n) => n.id === id);
    if (!node) continue;
    if (node.category === 'specialization') {
      const r = state.specializationLevels[node.zone] ?? 0;
      const label = r > 0 ? MASTERY_TIERS_RU[r - 1] ?? `р${r}` : 'нет';
      quels.push(`${node.label} (${label})`);
    }
    if (node.category === 'feat') feats.push(node.label);
    const picks = state.nodeChoices[id] ?? [];
    for (const c of node.choices ?? []) {
      const chosen = picks.filter((p) => c.options.some((o) => o.id === p));
      if (chosen.length === 0) continue;
      if (c.id === 'aspect') aspects.push(...chosen);
      else if (c.id === 'sigils') sigils.push(...chosen.map((s) => `${node.label}: ${s}`));
      else if (c.id === 'feat') feats.push(...chosen);
      else if (c.id === 'craft') crafts.push(...chosen);
    }
  }

  const derivedBlock = (title: string, items: string[]) =>
    items.length > 0 ? (
      <div className="derived-line">
        <b>{title}:</b> {items.join(', ')}
      </div>
    ) : null;

  return (
    <div className="sheet">
      <div className="sheet-head">
        <label className="sheet-name">
          Имя
          <input
            value={fields['name'] ?? ''}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>
        <div className="sheet-meta">
          <span>Раса: {race?.name ?? '—'}</span>
          <span>Предыстория: {bg?.name ?? '—'}</span>
          <span>Ранг героя: —</span>
          <span>КБ: {kb}</span>
          <span>
            Раны: {combat.wounds}/{combat.woundsMax}
          </span>
          <span>
            Усталость: {combat.fatigue}/{combat.fatigueMax}
          </span>
        </div>
      </div>

      <AbilitiesTable rows={abilities} />

      {proficiencies.length > 0 && (
        <div className="sheet-derived-choices panel">
          <div className="derived-line">
            <b>Владения:</b> {proficiencies.join(' · ')}
          </div>
        </div>
      )}

      {(quels.length || aspects.length || sigils.length || feats.length || crafts.length) > 0 && (
        <div className="sheet-derived-choices panel">
          {derivedBlock('Дары', quels)}
          {derivedBlock('Аспекты', aspects)}
          {derivedBlock('Сигилы', sigils)}
          {derivedBlock('Черты', feats)}
          {derivedBlock('Ремёсла', crafts)}
        </div>
      )}

      <div className="sheet-cols">
        {SKILL_GROUPS.map((group) => {
          const zone = zoneForChar(group.char)!;
          const gRank = giftRank(state, zone);
          const gArrow = rankArrow(gRank, 'mastery');
          return (
            <section
              key={group.char}
              className={`sheet-col zone-${zoneOfChar[group.char]}`}
            >
              <header className="sheet-char">
                <span className="sheet-char-name">{group.char}</span>
                <span className="sheet-char-val" title="Ранг через прокачку дара">
                  {gArrow.text}
                </span>
              </header>
              <ul className="sheet-skills">
                {group.skills.map((s) => {
                  const fromTree = treeSkillRank(state, treeData, s.name, zone);
                  const fromGrant = grants.skillRanks[s.name] ?? 0;
                  const rank = Math.max(fromTree.rank, fromGrant);
                  const kind = s.dice || fromTree.dice ? 'dice' : 'mastery';
                  const arrow = rankArrow(rank, kind);
                  return (
                    <li key={s.name}>
                      <span className="sheet-skill-name">{s.name}</span>
                      <span className="sheet-skill-val sheet-char-val" title={arrow.text}>
                        {arrow.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="sheet-derived">
        {DERIVED_FIELDS.map((f) => (
          <label key={f} className="sheet-field">
            {f}
            <input
              value={fields[`d:${f}`] ?? ''}
              onChange={(e) => set(`d:${f}`, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="sheet-blocks">
        {['Инструменты', 'Расходники', 'Инвентарь'].map((b) => (
          <label key={b} className="sheet-block">
            {b}
            <textarea
              rows={4}
              value={fields[`b:${b}`] ?? ''}
              onChange={(e) => set(`b:${b}`, e.target.value)}
            />
          </label>
        ))}
      </div>

      <p className="muted">
        Навыки и характеристики на листе — ранги (мастерство или кость), не «+N».
        Раса/предыстория дают стартовый ранг или владение. Ранг героя — позже.
      </p>
    </div>
  );
}
