import type { Race, SkillTreeState } from './types';
import { raceById } from './races';
import { backgroundById } from './backgrounds';

const CHAR_NAMES = new Set(['Мощь', 'Разум', 'Моторика', 'Стержень', 'Живучесть']);

export type StartingGrants = {
  skillRanks: Record<string, number>;
  proficiencies: string[];
  /** Для КБ — единственный числовой остаток скелета. */
  armor: number;
};

function mergeRank(into: Record<string, number>, name: string, rank: number) {
  if (rank <= 0) return;
  into[name] = Math.max(into[name] ?? 0, rank);
}

function absorbModifiers(
  mods: Record<string, number> | undefined,
  out: StartingGrants,
) {
  if (!mods) return;
  for (const [k, v] of Object.entries(mods)) {
    if (k === 'Броня') {
      out.armor += v;
      continue;
    }
    if (CHAR_NAMES.has(k)) {
      if (v > 0) out.proficiencies.push(`Наследие: ${k}`);
      else if (v < 0) out.proficiencies.push(`Слабость: ${k}`);
      continue;
    }
    // навык → стартовый ранг
    mergeRank(out.skillRanks, k, v);
  }
}

function absorbSource(
  src: Pick<Race, 'statModifiers' | 'skillRanks' | 'proficiencies' | 'abilities'> | undefined,
  out: StartingGrants,
) {
  if (!src) return;
  absorbModifiers(src.statModifiers, out);
  for (const [k, v] of Object.entries(src.skillRanks ?? {})) mergeRank(out.skillRanks, k, v);
  for (const p of src.proficiencies ?? []) out.proficiencies.push(p);
}

/** Стартовые ранги/владения от расы и предыстории (без «+N» на лист). */
export function collectStartingGrants(state: SkillTreeState): StartingGrants {
  const out: StartingGrants = { skillRanks: {}, proficiencies: [], armor: 0 };
  const race = raceById(state.race);
  const bg = backgroundById(state.background);
  absorbSource(race, out);
  absorbSource(bg, out);
  if (race?.choices) {
    for (const c of race.choices) {
      const chosen = state.raceChoices[c.id];
      if (!chosen) continue;
      if (c.kind === 'char') {
        out.proficiencies.push(`Наследие: ${chosen}`);
      } else if (c.kind === 'note') {
        out.proficiencies.push(`${c.label}: ${chosen}`);
      }
    }
  }
  // уникальные строки
  out.proficiencies = [...new Set(out.proficiencies)];
  return out;
}
