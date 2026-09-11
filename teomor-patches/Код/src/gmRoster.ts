import {
  computeFatigueMax,
  computeWoundsMax,
  defaultCombatState,
  type CombatState,
} from './coreRules';
import { PLAYTEST_PRESETS, type PlaytestPreset } from './playtestPresets';

export interface GmBuff {
  id: string;
  label: string;
  /** Оставшихся раундов; без поля — до снятия вручную. */
  rounds?: number;
}

export interface GmPlayer {
  id: string;
  name: string;
  level: number;
  presetId?: string;
  combat: CombatState;
  buffs: GmBuff[];
  notes: string;
}

const LS_GM = 'teomor_gm_roster_v1';

function uid(): string {
  return `gm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function combatFromPreset(p: PlaytestPreset): CombatState {
  return defaultCombatState(p.level, p.manualModifiers ?? {});
}

export function playerFromPreset(p: PlaytestPreset): GmPlayer {
  return {
    id: p.id,
    name: p.sheetFields?.name ?? p.label,
    level: p.level,
    presetId: p.id,
    combat: combatFromPreset(p),
    buffs: [],
    notes: '',
  };
}

export function defaultGmRoster(): GmPlayer[] {
  return PLAYTEST_PRESETS.map(playerFromPreset);
}

export function loadGmRoster(): GmPlayer[] {
  try {
    const raw = localStorage.getItem(LS_GM);
    if (!raw) return defaultGmRoster();
    const parsed = JSON.parse(raw) as GmPlayer[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultGmRoster();
    return parsed.map((p) => ({
      ...p,
      buffs: p.buffs ?? [],
      notes: p.notes ?? '',
      combat: {
        wounds: p.combat?.wounds ?? 0,
        woundsMax: p.combat?.woundsMax ?? 2,
        fatigue: p.combat?.fatigue ?? 0,
        fatigueMax: p.combat?.fatigueMax ?? 4,
      },
    }));
  } catch {
    return defaultGmRoster();
  }
}

export function saveGmRoster(roster: GmPlayer[]): void {
  localStorage.setItem(LS_GM, JSON.stringify(roster));
}

export function refreshPlayerLimits(
  player: GmPlayer,
  modifiers: Record<string, number> = {},
): GmPlayer {
  const woundsMax = computeWoundsMax(player.level, modifiers);
  const fatigueMax = computeFatigueMax(player.level, modifiers);
  return {
    ...player,
    combat: {
      woundsMax,
      fatigueMax,
      wounds: Math.min(player.combat.wounds, woundsMax),
      fatigue: Math.min(player.combat.fatigue, fatigueMax),
    },
  };
}

export function adjustWounds(player: GmPlayer, delta: number): GmPlayer {
  const wounds = Math.max(
    0,
    Math.min(player.combat.woundsMax, player.combat.wounds + delta),
  );
  return { ...player, combat: { ...player.combat, wounds } };
}

export function adjustFatigue(player: GmPlayer, delta: number): GmPlayer {
  const fatigue = Math.max(
    0,
    Math.min(player.combat.fatigueMax, player.combat.fatigue + delta),
  );
  return { ...player, combat: { ...player.combat, fatigue } };
}

export function restPlayer(player: GmPlayer): GmPlayer {
  return {
    ...player,
    combat: { ...player.combat, wounds: 0, fatigue: 0 },
  };
}

export function addBuff(player: GmPlayer, label: string, rounds?: number): GmPlayer {
  const trimmed = label.trim();
  if (!trimmed) return player;
  return {
    ...player,
    buffs: [
      ...player.buffs,
      { id: uid(), label: trimmed, rounds: rounds && rounds > 0 ? rounds : undefined },
    ],
  };
}

export function removeBuff(player: GmPlayer, buffId: string): GmPlayer {
  return { ...player, buffs: player.buffs.filter((b) => b.id !== buffId) };
}

/** Конец раунда: у эффектов с таймером −1; истёкшие снимаются. */
export function tickBuffRounds(player: GmPlayer): GmPlayer {
  const buffs = player.buffs
    .map((b) =>
      b.rounds == null ? b : { ...b, rounds: b.rounds - 1 },
    )
    .filter((b) => b.rounds == null || b.rounds > 0);
  return { ...player, buffs };
}

export function newCustomPlayer(name = 'Новый игрок'): GmPlayer {
  const level = 1;
  return {
    id: uid(),
    name,
    level,
    combat: defaultCombatState(level, {}),
    buffs: [],
    notes: '',
  };
}

export function presetByPlayerId(presetId: string): PlaytestPreset | undefined {
  return PLAYTEST_PRESETS.find((p) => p.id === presetId);
}
