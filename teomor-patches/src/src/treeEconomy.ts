/** Экономика прокачки древа (ядро v2). */
export const TREE_ECONOMY = {
  /** После выбора расы: было 2 ОУ + 2 ОО. */
  startOrPoints: 4,
  /** За уровень персонажа: было +1 ОУ + +1 ОО. */
  orPerLevel: 2,
  /** Повышение специализации (ур. 2–10). */
  specUpgradeCost: 1,
} as const;
