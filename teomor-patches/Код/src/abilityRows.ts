import type { GameCard } from './cardsData';
import { initialCards, loadCatalogFromStorage } from './cardsData';

export interface AbilityRow {
  name: string;
  kvel: string;
  action: string;
  cost: string;
  note: string;
}

export function cardToAbilityRow(c: GameCard): AbilityRow {
  const kvel =
    c.category === 'kvel'
      ? c.name
      : c.buildParts?.kvelId ?? c.profession ?? '—';
  let action = '1';
  if (c.cost === 0 && c.category !== 'instrument') action = 'фокус';
  if (c.category === 'instrument') action = '—';
  const cost =
    c.category === 'kvel' || c.category === 'aspect'
      ? '—'
      : c.category === 'instrument'
        ? '—'
        : c.cost === 0
          ? '0'
          : `${c.cost} уст.`;
  const parts = [c.description];
  if (c.damage) parts.push(`урон ${c.damage}`);
  if (c.range) parts.push(c.range);
  if (c.area) parts.push(c.area);
  if (c.states) parts.push(c.states);
  return {
    name: c.name,
    kvel,
    action,
    cost,
    note: parts.filter(Boolean).join(' · '),
  };
}

export function abilitiesFromCardIds(cardIds: string[]): AbilityRow[] {
  const catalog = loadCatalogFromStorage();
  const byId = new Map([...initialCards, ...catalog].map((c) => [c.id, c]));
  const rows: AbilityRow[] = [];
  const seen = new Set<string>();
  for (const id of cardIds) {
    const c = byId.get(id);
    if (!c || seen.has(id)) continue;
    seen.add(id);
    rows.push(cardToAbilityRow(c));
  }
  return rows;
}

export function mergeAbilityRows(
  fromCards: AbilityRow[],
  extra: AbilityRow[],
): AbilityRow[] {
  const out = [...extra];
  const names = new Set(extra.map((r) => r.name));
  for (const r of fromCards) {
    if (!names.has(r.name)) out.push(r);
  }
  return out;
}
