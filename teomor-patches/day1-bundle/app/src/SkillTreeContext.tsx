import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { SkillNode, SkillTreeData, SkillTreeState, ZoneType } from './types';
import { migrateLegacyPoints } from './types';
import { initialSkillTree } from './skillTreeData';
import { blockReason } from './nodeStatus';
import { raceById } from './races';
import { backgroundById } from './backgrounds';
import { TREE_ECONOMY } from './treeEconomy';

const LS_STATE = 'teomor_skill_tree_state_v3';
const LS_DATA = 'teomor_skill_tree_data_v6';

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
  discoveredSecrets: [],
  nodeChoices: {},
};

type Action =
  | { type: 'CHOOSE_RACE'; raceId: string }
  | { type: 'SET_RACE_CHOICE'; choiceId: string; value: string }
  | { type: 'CHOOSE_BACKGROUND'; backgroundId: string }
  | { type: 'ALLOCATE_NODE'; node: SkillNode; choices?: Record<string, string[]> }
  | { type: 'SET_NODE_CHOICE'; nodeId: string; optionIds: string[] }
  | { type: 'UPGRADE_SPECIALIZATION'; zone: ZoneType }
  | { type: 'DISCOVER_SECRET'; id: string }
  | { type: 'GAIN_LEVEL' }
  | { type: 'RESET' };

function reducer(state: SkillTreeState, action: Action): SkillTreeState {
  switch (action.type) {
    case 'CHOOSE_RACE': {
      if (state.level >= 1) return state;
      return {
        ...state,
        race: action.raceId,
        level: 1,
        allocatedNodes: ['center_start'],
        orPoints: TREE_ECONOMY.startOrPoints,
        raceChoices: {},
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
      if (blockReason(node, state) !== null) return state;
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

    case 'GAIN_LEVEL':
      if (state.level < 1) return state;
      return {
        ...state,
        level: state.level + 1,
        orPoints: state.orPoints + TREE_ECONOMY.orPerLevel,
      };

    case 'RESET':
      return defaultState;

    default:
      return state;
  }
}

interface SkillTreeContextValue {
  state: SkillTreeState;
  treeData: SkillTreeData;
  setTreeData: (updater: SkillTreeData | ((prev: SkillTreeData) => SkillTreeData)) => void;
  dispatch: React.Dispatch<Action>;
  totalStatModifiers: Record<string, number>;
}

const SkillTreeContext = createContext<SkillTreeContextValue | undefined>(
  undefined,
);

function loadState(): SkillTreeState {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<SkillTreeState> & {
      developmentPoints?: number;
      transitPoints?: number;
    };
    const orPoints =
      migrateLegacyPoints(parsed) ??
      (typeof parsed.orPoints === 'number' ? parsed.orPoints : defaultState.orPoints);
    return {
      ...defaultState,
      ...parsed,
      orPoints,
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
    if (parsed?.nodes && parsed?.edges) return parsed;
    return initialSkillTree;
  } catch {
    return initialSkillTree;
  }
}

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
  for (const id of state.allocatedNodes) {
    const node = treeData.nodes.find((n) => n.id === id);
    if (!node?.statModifiers) continue;
    for (const [stat, val] of Object.entries(node.statModifiers)) {
      totals[stat] = (totals[stat] ?? 0) + val;
    }
  }
  return totals;
}

export function SkillTreeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [treeData, setTreeData] = useState<SkillTreeData>(loadTree);

  useEffect(() => {
    localStorage.setItem(LS_STATE, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(LS_DATA, JSON.stringify(treeData));
  }, [treeData]);

  const totalStatModifiers = computeTotals(state, treeData);

  return (
    <SkillTreeContext.Provider
      value={{ state, treeData, setTreeData, dispatch, totalStatModifiers }}
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
