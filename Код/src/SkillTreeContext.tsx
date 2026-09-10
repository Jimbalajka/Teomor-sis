import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { SkillNode, SkillTreeData, SkillTreeState, ZoneType } from './types';
import type { PlaytestPreset } from './playtestPresets';
import { migrateLegacyPoints } from './types';
import { initialSkillTree } from './skillTreeData';
import { blockReason } from './nodeStatus';
import { raceById } from './races';
import { backgroundById } from './backgrounds';
import { TREE_ECONOMY } from './treeEconomy';
import { buildRouteNodeSet, type TreeFocus } from './treeView';
import {
  computeFatigueMax,
  computeKB,
  computeWoundsMax,
  defaultCombatState,
  type CombatState,
} from './coreRules';

const LS_STATE = 'teomor_skill_tree_state_v4';
const LS_DATA = 'teomor_skill_tree_data_v13';


const defaultState: SkillTreeState = {
  level: 0,
  race: null,
  background: null,
  raceChoices: {},
  allocatedNodes: [],
  specializationLevels: {
    center: 0,
    magic: 0,
    strength: 0,
    dexterity: 0,
    wisdom: 0,
  },
  orPoints: 0,
  combat: defaultCombatState(0, {}),
  armorBonus: 0,
  manualModifiers: {},
  proficiencies: [],
  discoveredSecrets: [],
  nodeChoices: {},
};

type Action =
  | { type: 'CHOOSE_RACE'; raceId: string }
  | { type: 'SET_RACE_CHOICE'; choiceId: string; value: string }
  | { type: 'CHOOSE_BACKGROUND'; backgroundId: string }
  | { type: 'ALLOCATE_NODE'; node: SkillNode; choices?: Record<string, string[]>; treeData?: { nodes: SkillNode[] } }
  | { type: 'SET_NODE_CHOICE'; nodeId: string; optionIds: string[] }
  | { type: 'UPGRADE_SPECIALIZATION'; zone: ZoneType }
  | { type: 'DISCOVER_SECRET'; id: string }
  | { type: 'GAIN_LEVEL' }
  | { type: 'SET_ARMOR_BONUS'; value: number }
  | { type: 'TAKE_WOUND'; amount?: number }
  | { type: 'HEAL_WOUND'; amount?: number }
  | { type: 'ADD_FATIGUE'; amount: number }
  | { type: 'CLEAR_FATIGUE'; amount?: number }
  | { type: 'REST' }
  | { type: 'SET_COMBAT'; combat: Partial<CombatState> }
  | { type: 'SYNC_COMBAT_LIMITS'; combat: Pick<CombatState, 'woundsMax' | 'fatigueMax'> }
  | { type: 'RESET' }
  | { type: 'LOAD_PLAYTEST_PRESET'; preset: PlaytestPreset };

function clampCombat(
  combat: CombatState,
  limits: Pick<CombatState, 'woundsMax' | 'fatigueMax'>,
): CombatState {
  return {
    woundsMax: limits.woundsMax,
    fatigueMax: limits.fatigueMax,
    wounds: Math.min(combat.wounds, limits.woundsMax),
    fatigue: Math.min(combat.fatigue, limits.fatigueMax),
  };
}

function reducer(state: SkillTreeState, action: Action): SkillTreeState {
  switch (action.type) {
    case 'CHOOSE_RACE': {
      if (state.level >= 1) return state;
      const combat = defaultCombatState(1, {});
      return {
        ...state,
        race: action.raceId,
        level: 1,
        allocatedNodes: ['center_start'],
        orPoints: TREE_ECONOMY.startOrPoints,
        raceChoices: {},
        combat,
      };
    }

    case 'SET_RACE_CHOICE':
      return {
        ...state,
        raceChoices: { ...state.raceChoices, [action.choiceId]: action.value },
      };

    case 'CHOOSE_BACKGROUND': {
      if (state.level < 1) return state;
      return { ...state, background: action.backgroundId };
    }

    case 'ALLOCATE_NODE': {
      const { node } = action;
      if (blockReason(node, state, action.treeData) !== null) return state;
      const specializationLevels =
        node.category === 'specialization'
          ? {
              ...state.specializationLevels,
              [node.zone]: Math.max(1, state.specializationLevels[node.zone] ?? 0),
            }
          : state.specializationLevels;
      return {
        ...state,
        allocatedNodes: [...state.allocatedNodes, node.id],
        specializationLevels,
        orPoints: state.orPoints - node.cost.amount,
        nodeChoices: action.choices
          ? { ...state.nodeChoices, ...action.choices }
          : state.nodeChoices,
      };
    }

    case 'SET_NODE_CHOICE':
      return {
        ...state,
        nodeChoices: { ...state.nodeChoices, [action.nodeId]: action.optionIds },
      };

    case 'UPGRADE_SPECIALIZATION': {
      const { zone } = action;
      const current = state.specializationLevels[zone] ?? 0;
      if (current < 1) return state;
      if (current >= 10) return state;
      if (state.orPoints < TREE_ECONOMY.specUpgradeCost) return state;
      return {
        ...state,
        orPoints: state.orPoints - TREE_ECONOMY.specUpgradeCost,
        specializationLevels: {
          ...state.specializationLevels,
          [zone]: current + 1,
        },
      };
    }

    case 'DISCOVER_SECRET': {
      if (state.discoveredSecrets.includes(action.id)) return state;
      return {
        ...state,
        discoveredSecrets: [...state.discoveredSecrets, action.id],
      };
    }

    case 'GAIN_LEVEL': {
      if (state.level < 1) return state;
      const level = state.level + 1;
      const limits = {
        woundsMax: computeWoundsMax(level, {}),
        fatigueMax: computeFatigueMax(level, {}),
      };
      return {
        ...state,
        level,
        orPoints: state.orPoints + TREE_ECONOMY.orPerLevel,
        combat: clampCombat(state.combat, limits),
      };
    }

    case 'SET_ARMOR_BONUS':
      return { ...state, armorBonus: Math.max(0, action.value) };

    case 'TAKE_WOUND': {
      const n = action.amount ?? 1;
      return {
        ...state,
        combat: {
          ...state.combat,
          wounds: Math.min(state.combat.woundsMax, state.combat.wounds + n),
        },
      };
    }

    case 'HEAL_WOUND': {
      const n = action.amount ?? 1;
      return {
        ...state,
        combat: {
          ...state.combat,
          wounds: Math.max(0, state.combat.wounds - n),
        },
      };
    }

    case 'ADD_FATIGUE':
      return {
        ...state,
        combat: {
          ...state.combat,
          fatigue: Math.min(
            state.combat.fatigueMax,
            state.combat.fatigue + action.amount,
          ),
        },
      };

    case 'CLEAR_FATIGUE': {
      const n = action.amount ?? state.combat.fatigue;
      return {
        ...state,
        combat: {
          ...state.combat,
          fatigue: Math.max(0, state.combat.fatigue - n),
        },
      };
    }

    case 'REST':
      return {
        ...state,
        combat: { ...state.combat, wounds: 0, fatigue: 0 },
      };

    case 'SET_COMBAT': {
      const merged = { ...state.combat, ...action.combat };
      return {
        ...state,
        combat: clampCombat(merged, {
          woundsMax: merged.woundsMax,
          fatigueMax: merged.fatigueMax,
        }),
      };
    }

    case 'SYNC_COMBAT_LIMITS':
      return {
        ...state,
        combat: clampCombat(state.combat, action.combat),
      };

    case 'LOAD_PLAYTEST_PRESET': {
      const p = action.preset;
      const specLevels = {
        ...defaultState.specializationLevels,
        ...p.specializationLevels,
      };
      const manual = p.manualModifiers ?? {};
      const next: SkillTreeState = {
        ...defaultState,
        level: p.level,
        race: p.race,
        background: p.background ?? null,
        allocatedNodes: [...p.allocatedNodes],
        specializationLevels: specLevels,
        orPoints: p.orPoints,
        manualModifiers: manual,
        proficiencies: p.proficiencies ?? [],
        combat: defaultCombatState(p.level, manual),
        armorBonus: p.armorBonus ?? 0,
        discoveredSecrets: [],
        nodeChoices: p.nodeChoices ?? {},
        raceChoices: {},
      };
      if (p.sheetFields) {
        localStorage.setItem('teomor_sheet_v1', JSON.stringify(p.sheetFields));
        window.dispatchEvent(new Event('teomor-sheet-updated'));
      }
      return next;
    }

    case 'RESET':
      return defaultState;

    default:
      return state;
  }
}

interface SkillTreeContextValue {
  state: SkillTreeState;
  treeData: SkillTreeData;
  setTreeData: (
    updater: SkillTreeData | ((prev: SkillTreeData) => SkillTreeData),
  ) => void;
  dispatch: React.Dispatch<Action>;
  totalStatModifiers: Record<string, number>;
  kb: number;
  treeFocus: TreeFocus;
  setTreeFocus: (focus: TreeFocus) => void;
  showRouteHighlight: boolean;
  setShowRouteHighlight: (show: boolean) => void;
  routeHighlight: Set<string>;
  highlightRoute: (allocatedIds: string[]) => void;
}

const SkillTreeContext = createContext<SkillTreeContextValue | undefined>(
  undefined,
);

function loadState(): SkillTreeState {
  try {
    const raw =
      localStorage.getItem(LS_STATE) ??
      localStorage.getItem('teomor_skill_tree_state_v3');
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<SkillTreeState> & {
      developmentPoints?: number;
      transitPoints?: number;
    };
    const orPoints =
      migrateLegacyPoints(parsed) ??
      (typeof parsed.orPoints === 'number' ? parsed.orPoints : defaultState.orPoints);
    const level = typeof parsed.level === 'number' ? parsed.level : defaultState.level;
    const combat = parsed.combat ?? defaultCombatState(level, {});
    const armorBonus =
      typeof parsed.armorBonus === 'number' ? parsed.armorBonus : 0;
    return {
      level,
      race: parsed.race ?? defaultState.race,
      background: parsed.background ?? defaultState.background,
      raceChoices: parsed.raceChoices ?? defaultState.raceChoices,
      allocatedNodes: parsed.allocatedNodes ?? defaultState.allocatedNodes,
      specializationLevels: {
        ...defaultState.specializationLevels,
        ...(parsed.specializationLevels ?? {}),
      },
      orPoints,
      combat,
      armorBonus,
      manualModifiers: parsed.manualModifiers ?? defaultState.manualModifiers,
      proficiencies: parsed.proficiencies ?? defaultState.proficiencies,
      discoveredSecrets: parsed.discoveredSecrets ?? defaultState.discoveredSecrets,
      nodeChoices: parsed.nodeChoices ?? defaultState.nodeChoices,
    };
  } catch {
    return defaultState;
  }
}

function loadTree(): SkillTreeData {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (!raw) return initialSkillTree;
    const parsed = JSON.parse(raw) as SkillTreeData;
    if (parsed?.nodes && parsed?.edges) {
      return {
        ...parsed,
        nodes: parsed.nodes.map((n) => ({
          ...n,
          cost: { type: 'OR' as const, amount: n.cost?.amount ?? 1 },
        })),
      };
    }
    return initialSkillTree;
  } catch {
    return initialSkillTree;
  }
}

/** Ощутимый бонус за уровень Дара (1–10): +1 к ключевой характеристике за каждый уровень. */
const DAR_LEVEL_STAT: Partial<Record<ZoneType, string>> = {
  magic: 'Разум',
  strength: 'Мощь',
  dexterity: 'Моторика',
  wisdom: 'Стержень',
};

function computeTotals(
  state: SkillTreeState,
  treeData: SkillTreeData,
): Record<string, number> {
  const totals: Record<string, number> = {};
  const race = raceById(state.race);
  const bg = backgroundById(state.background);
  for (const src of [race, bg]) {
    if (!src) continue;
    for (const [stat, val] of Object.entries(src.statModifiers)) {
      totals[stat] = (totals[stat] ?? 0) + val;
    }
  }
  if (race?.choices) {
    for (const c of race.choices) {
      const chosen = state.raceChoices[c.id];
      if (c.kind === 'char' && chosen) {
        totals[chosen] = (totals[chosen] ?? 0) + (c.amount ?? 1);
      }
    }
  }
  for (const [stat, val] of Object.entries(state.manualModifiers ?? {})) {
    totals[stat] = (totals[stat] ?? 0) + val;
  }
  for (const id of state.allocatedNodes) {
    const node = treeData.nodes.find((n) => n.id === id);
    if (!node?.statModifiers) continue;
    for (const [stat, val] of Object.entries(node.statModifiers)) {
      totals[stat] = (totals[stat] ?? 0) + val;
    }
  }
  for (const [zone, stat] of Object.entries(DAR_LEVEL_STAT) as [ZoneType, string][]) {
    const darLvl = state.specializationLevels[zone] ?? 0;
    if (darLvl > 0 && stat) {
      totals[stat] = (totals[stat] ?? 0) + darLvl;
      totals['Усталость'] = (totals['Усталость'] ?? 0) + Math.floor(darLvl / 3);
    }
  }
  return totals;
}

export function SkillTreeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [treeData, setTreeData] = useState<SkillTreeData>(loadTree);
  const [treeFocus, setTreeFocus] = useState<TreeFocus>('all');
  const [showRouteHighlight, setShowRouteHighlight] = useState(false);
  const [routeHighlight, setRouteHighlight] = useState<Set<string>>(() => new Set());

  const highlightRoute = useCallback(
    (allocatedIds: string[]) => {
      setRouteHighlight(buildRouteNodeSet(allocatedIds, treeData));
    },
    [treeData],
  );

  const totalStatModifiers = useMemo(
    () => computeTotals(state, treeData),
    [state, treeData],
  );

  const kb = useMemo(
    () => computeKB(totalStatModifiers, state.armorBonus),
    [totalStatModifiers, state.armorBonus],
  );

  useEffect(() => {
    const woundsMax = computeWoundsMax(state.level, totalStatModifiers);
    const fatigueMax = computeFatigueMax(state.level, totalStatModifiers);
    if (
      state.combat.woundsMax !== woundsMax ||
      state.combat.fatigueMax !== fatigueMax
    ) {
      dispatch({
        type: 'SYNC_COMBAT_LIMITS',
        combat: { woundsMax, fatigueMax },
      });
    }
  }, [state.level, state.combat.woundsMax, state.combat.fatigueMax, totalStatModifiers]);

  useEffect(() => {
    localStorage.setItem(LS_STATE, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(LS_DATA, JSON.stringify(treeData));
  }, [treeData]);

  return (
    <SkillTreeContext.Provider
      value={{
        state,
        treeData,
        setTreeData,
        dispatch,
        totalStatModifiers,
        kb,
        treeFocus,
        setTreeFocus,
        showRouteHighlight,
        setShowRouteHighlight,
        routeHighlight,
        highlightRoute,
      }}
    >
      {children}
    </SkillTreeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSkillTree(): SkillTreeContextValue {
  const ctx = useContext(SkillTreeContext);
  if (!ctx)
    throw new Error('useSkillTree must be used within a SkillTreeProvider');
  return ctx;
}
