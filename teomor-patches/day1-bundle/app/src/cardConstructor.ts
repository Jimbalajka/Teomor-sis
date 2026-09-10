import type { GameCard } from './cardsData';

/** Ссылки на части сборки (хранятся в сохранённом приёме). */
export interface BuildParts {
  kvelId?: string;
  aspectId?: string;
  sigilIds: string[];
  instrumentId?: string;
}

export interface BuildRecipe {
  kvel?: GameCard;
  aspect?: GameCard;
  sigils: GameCard[];
  instrument?: GameCard;
}

const PART_CATEGORIES = ['kvel', 'aspect', 'sigil', 'instrument'] as const;

/** Каталог частей для конструктора (библиотека + древо). */
export function catalogParts(all: GameCard[]): GameCard[] {
  const seen = new Set<string>();
  return all.filter((c) => {
    if (!PART_CATEGORIES.includes(c.category as (typeof PART_CATEGORIES)[number]))
      return false;
    const key = `${c.category}:${c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveRecipe(
  parts: BuildParts,
  catalog: GameCard[],
): BuildRecipe {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return {
    kvel: parts.kvelId ? byId.get(parts.kvelId) : undefined,
    aspect: parts.aspectId ? byId.get(parts.aspectId) : undefined,
    sigils: parts.sigilIds
      .map((id) => byId.get(id))
      .filter((c): c is GameCard => !!c),
    instrument: parts.instrumentId ? byId.get(parts.instrumentId) : undefined,
  };
}

/** Усталость приёма = сумма стоимостей аспекта и сигилов (инструмент/квель не тратят). */
export function computeBuildCost(recipe: BuildRecipe): number {
  let total = 0;
  if (recipe.aspect) total += recipe.aspect.cost;
  for (const s of recipe.sigils) total += s.cost;
  return total;
}

function joinUnique(values: (string | undefined)[]): string | undefined {
  const uniq = [...new Set(values.filter(Boolean) as string[])];
  return uniq.length ? uniq.join(', ') : undefined;
}

/** Механика сборки: объединяем поля частей (без генерации «лора»). */
export function mergeBuildFields(
  recipe: BuildRecipe,
): Pick<GameCard, 'damage' | 'range' | 'area' | 'states' | 'profession'> {
  const src = [...recipe.sigils, recipe.aspect, recipe.instrument].filter(
    Boolean,
  ) as GameCard[];
  return {
    damage: joinUnique(src.map((c) => c.damage)),
    range: joinUnique(src.map((c) => c.range)),
    area: joinUnique(src.map((c) => c.area)),
    states: joinUnique(src.map((c) => c.states)),
    profession: joinUnique(src.map((c) => c.profession)),
  };
}

/** Строка состава для подсказки (не заменяет описание игрока). */
export function mechanicalSummary(recipe: BuildRecipe): string {
  const names: string[] = [];
  if (recipe.kvel) names.push(recipe.kvel.name);
  if (recipe.aspect) names.push(recipe.aspect.name);
  recipe.sigils.forEach((s) => names.push(s.name));
  if (recipe.instrument) names.push(recipe.instrument.name);
  return names.join(' + ');
}

export function buildCardFromParts(
  parts: BuildParts,
  catalog: GameCard[],
  playerName: string,
  playerDescription: string,
  id?: string,
): GameCard {
  const recipe = resolveRecipe(parts, catalog);
  const cost = computeBuildCost(recipe);
  const fields = mergeBuildFields(recipe);
  const mech = mechanicalSummary(recipe);

  return {
    id: id ?? `build_${Date.now().toString(36)}`,
    category: 'build',
    name: playerName.trim() || 'Приём без названия',
    cost,
    ...fields,
    description: playerDescription.trim(),
    buildParts: parts,
    mechanicalNote: mech,
    fatigueMax: recipe.kvel?.fatigueMax,
  };
}

/** Проверка: приём не дороже потолка усталости квеля. */
export function withinKvelLimit(cost: number, kvel?: GameCard): boolean {
  if (!kvel?.fatigueMax) return true;
  return cost <= kvel.fatigueMax;
}

export function partsByCategory(
  catalog: GameCard[],
  category: GameCard['category'],
): GameCard[] {
  return catalog.filter((c) => c.category === category);
}
