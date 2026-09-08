import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type {
  SkillNode,
  SkillTreeData,
  SkillTreeState,
  ZoneType,
} from './types';
import { initialSkillTree } from './skillTreeData';
import { blockReason } from './nodeStatus';
import { raceById } from './races';
import { backgroundById } from './backgrounds';

const LS_STATE = 'teomor_skill_tree_state_v2';
const LS_DATA = 'teomor_skill_tree_data_v6';

// Старт: 0 уровень, раса не выбрана, очков нет, центр не активирован.
// Активация центра (выбор расы) -> 1 уровень + стартовые очки.
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
  developmentPoints: 0,
  transitPoints: 0,
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
  | { type: 'GAIN_LEVEL' } // +1 ОУ и +2 ОО (симуляция левелапа)
  | { type: 'RESET' };

function reducer(state: SkillTreeState, action: Action): SkillTreeState {
  switch (action.type) {
    case 'CHOOSE_RACE': {
      if (state.level >= 1) return state; // раса выбирается только на старте
      return {
        ...state,
        race: action.raceId,
        level: 1,
        allocatedNodes: ['center_start'],
        developmentPoints: 2, // стартовые ОУ (хватает открыть 1 Дар)
        transitPoints: 2, // стартовые ОО
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
      const isOR = node.cost.type === 'OR';
      // Открытие специализации сразу поднимает её ветку до 1 уровня.
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
        developmentPoints: isOR
          ? state.developmentPoints - node.cost.amount
          : state.developmentPoints,
        transitPoints: isOR
          ? state.transitPoints
          : state.transitPoints - node.cost.amount,
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
      if (current < 1) return state; // ветка ещё не открыта
      if (current >= 10) return state;
      if (state.developmentPoints < 1) return state;
      return {
        ...state,
        developmentPoints: state.developmentPoints - 1,
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
      if (state.level < 1) return state; // сначала выбери расу
      return {
        ...state,
        level: state.level + 1,
        developmentPoints: state.developmentPoints + 1,
        transitPoints: state.transitPoints + 1,
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
  /** Итоговые модификаторы для листа персонажа (read-only агрегат). */
  totalStatModifiers: Record<string, number>;
}

const SkillTreeContext = createContext<SkillTreeContextValue | undefined>(
  undefined,
);

function loadState(): SkillTreeState {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<SkillTreeState>;
    return { ...defaultState, ...parsed };
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
  // Бонусы расы и предыстории.
  const race = raceById(state.race);
  const bg = backgroundById(state.background);
  for (const src of [race, bg]) {
    if (!src) continue;
    for (const [stat, val] of Object.entries(src.statModifiers)) {
      totals[stat] = (totals[stat] ?? 0) + val;
    }
  }
  // Выборы расы вида «+1 к характеристике».
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
