import type { SkillTreeData, SkillNode, SkillEdge, ZoneType } from './types';
import { applyPoeLayout } from './treeLayout';

/**
 * STUB v3 map — 2026-09-26 (rev H)
 * SoT: BRIEF.md + фото листа docs/reference/sheet-skills/
 *
 * Круг = навык/характеристика (мастерство или кость).
 * Гекс = круги навыков листа на орбите + черты (≤6 на кольцо).
 * Ромб = квели.
 * «Рем:» на листе — не узел. На фото нет Мистики (Разум) и Псионики (Стержень).
 */

type Z = ZoneType;

export const MASTERY_TIERS_RU = [
  'новичок',
  'ученик',
  'эксперт',
  'адепт',
  'мастер',
  'зверь',
] as const;

export const MASTERY_MAX = MASTERY_TIERS_RU.length;

export const SKILL_DICE_LADDER = [
  '1к4',
  '1к6',
  '1к8',
  '1к10',
  '1к12',
  '2к6',
  '2к8',
  '2к10',
  '2к12',
] as const;

export const SKILL_DICE_MAX = SKILL_DICE_LADDER.length;

type GiftPack = {
  zone: Z;
  id: string;
  label: string;
  charId: string;
  charLabel: string;
  /** Навыки листа → круги внутри гексов (не тропа). */
  skills: readonly string[];
  diceSkills?: ReadonlyArray<{ slug: string; name: string }>;
  socialHexLabel: string;
  socialDiaLabel: string;
};

/** Навыки строго по колонкам листа/фото. Без Мистики. */
const GIFT_PACKS: readonly GiftPack[] = [
  {
    zone: 'dexterity',
    id: 'gift_snake',
    label: 'Дар Змея',
    charId: 'char_motor',
    charLabel: 'Моторика',
    diceSkills: [
      { slug: 'acrobatics', name: 'Акробатика' },
      { slug: 'dodge', name: 'Уклонение' },
    ],
    skills: [
      'Судовождение',
      'Вождение',
      'Пилотирование',
      'Верховая Езда',
      'Скрытность',
      'Воровские Навыки',
      'Ловкость рук',
      'Ближний бой',
      'Дальний бой',
      'Печати',
    ],
    socialHexLabel: 'Социальный',
    socialDiaLabel: 'Социальные квели',
  },
  {
    zone: 'magic',
    id: 'gift_bear',
    label: 'Дар Медведя',
    charId: 'char_mind',
    charLabel: 'Разум',
    skills: [
      'Гуманитарная Наука',
      'Точная Наука',
      'Безумная Наука',
      'Медицина',
      'Анализ',
      'Поиск Информации',
      'Природа',
      'Ремонт',
      'Хакерство',
      'ЭлектроМех',
      'Волшебство',
      'Алхимия',
    ],
    socialHexLabel: 'Социальный',
    socialDiaLabel: 'Социальные квели',
  },
  {
    zone: 'wisdom',
    id: 'gift_dove',
    label: 'Дар Голубя',
    charId: 'char_core',
    charLabel: 'Стержень',
    skills: [
      'Убеждение',
      'Запугивание',
      'Обман',
      'Выступление',
      'Лидерство',
      'Дрессировка',
      'Внимание',
      'Проницательность',
      'Интуиция',
      'Колдовство',
    ],
    socialHexLabel: 'Социальный',
    socialDiaLabel: 'Социальные квели',
  },
  {
    zone: 'strength',
    id: 'gift_zubanya',
    label: 'Дар Зюбания',
    charId: 'char_might',
    charLabel: 'Мощь',
    diceSkills: [
      { slug: 'health', name: 'Здоровье' },
      { slug: 'athletics', name: 'Атлетика' },
    ],
    skills: ['Выживание', 'Ближний бой', 'Запугивание', 'Импланты'],
    socialHexLabel: 'Социальный',
    socialDiaLabel: 'Социальные квели',
  },
];

/** Черты на боевом гексе (заглушки). Навыки листа — круги на орбите гекса. */
const HEX_COMBAT_TRAITS = ['Черта боя I', 'Черта боя II'] as const;
const HEX_SOCIAL_TRAITS = ['Черта слова I', 'Черта слова II'] as const;

type HexSkillSplit = { combat: readonly string[]; practical: readonly string[] };

/** Расклад навыков листа по гексам. */
const SHEET_HEX_SPLIT: Partial<Record<string, HexSkillSplit>> = {
  gift_snake: {
    combat: ['Ближний бой', 'Дальний бой', 'Скрытность', 'Воровские Навыки'],
    practical: [
      'Ловкость рук',
      'Печати',
      'Верховая Езда',
      'Вождение',
      'Судовождение',
      'Пилотирование',
    ],
  },
  gift_zubanya: {
    combat: ['Выживание', 'Ближний бой'],
    practical: ['Запугивание', 'Импланты'],
  },
};

function splitSheetSkills(g: GiftPack): HexSkillSplit {
  const explicit = SHEET_HEX_SPLIT[g.id];
  if (explicit) return explicit;
  const mid = Math.ceil(g.skills.length / 2);
  return { combat: g.skills.slice(0, mid), practical: g.skills.slice(mid) };
}

function masteryDesc(name: string): string {
  return (
    `${name}. Мастерство в одном круге: нет → ` +
    `${MASTERY_TIERS_RU.join(' → ')}. Текст позже.`
  );
}

function diceDesc(name: string): string {
  return (
    `${name}. Не мастерство — кость: ` +
    `${SKILL_DICE_LADDER[0]} → … → ${SKILL_DICE_LADDER[SKILL_DICE_LADDER.length - 1]}.`
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '_')
    .replace(/^_|_$/g, '');
}

const nodes: SkillNode[] = [
  {
    id: 'center_start',
    x: 0,
    y: 0,
    label: 'Очаг',
    zone: 'center',
    category: 'root',
    cost: { type: 'OR', amount: 0 },
    description: 'Корень. 4 дара. Навыки = круги внутри гексов. Stub v3H.',
  },
];

for (const g of GIFT_PACKS) {
  nodes.push({
    id: g.id,
    x: 0,
    y: 0,
    label: g.label,
    zone: g.zone,
    category: 'specialization',
    cost: { type: 'OR', amount: 2 },
    level: 0,
    maxLevel: MASTERY_MAX,
    requirements: { parentIds: ['center_start'] },
    description:
      `${g.label}. Мастерство «${g.charLabel}»: нет → ${MASTERY_TIERS_RU.join(' → ')}. ` +
      'Открывает круги навыков, гексы скилов/черт и ромбы квелей.',
  });

  nodes.push({
    id: g.charId,
    x: 0,
    y: 0,
    label: g.charLabel,
    zone: g.zone,
    category: 'transit_specialized',
    cost: { type: 'OR', amount: 1 },
    level: 0,
    maxLevel: MASTERY_MAX,
    requirements: {
      parentIds: [g.id],
      requiredSpecialization: { zone: g.zone, level: 1 },
    },
    description:
      `Характеристика ${g.label}. Мастерство: нет → ${MASTERY_TIERS_RU.join(' → ')}.`,
  });

  for (const d of g.diceSkills ?? []) {
    nodes.push({
      id: `sk_${g.zone}_dice_${d.slug}`,
      x: 0,
      y: 0,
      label: d.name,
      zone: g.zone,
      category: 'transit_specialized',
      cost: { type: 'OR', amount: 1 },
      level: 0,
      maxLevel: SKILL_DICE_MAX,
      requirements: {
        parentIds: [g.id],
        requiredSpecialization: { zone: g.zone, level: 1 },
      },
      description: diceDesc(d.name),
    });
  }

  const sheetSplit = splitSheetSkills(g);

  const packs = [
    {
      key: 'combat',
      hexLabel: 'Боевой',
      diaLabel: 'Боевые квели',
      sheetSkills: sheetSplit.combat,
      traits: HEX_COMBAT_TRAITS,
      kvels: ['Квель боя I', 'Квель боя II', 'Квель боя III', 'Квель боя IV'],
    },
    {
      key: 'social',
      hexLabel: g.id === 'gift_snake' ? 'Практика' : g.socialHexLabel,
      diaLabel: g.socialDiaLabel,
      sheetSkills: sheetSplit.practical,
      traits: sheetSplit.practical.length >= 6 ? ([] as const) : HEX_SOCIAL_TRAITS,
      kvels: ['Квель слова I', 'Квель слова II', 'Квель слова III', 'Квель слова IV'],
    },
  ] as const;

  for (const p of packs) {
    const hexId = `hex_${g.zone}_${p.key}`;
    nodes.push({
      id: hexId,
      x: 0,
      y: 0,
      label: p.hexLabel,
      zone: g.zone,
      category: 'subcategory',
      cost: { type: 'OR', amount: 1 },
      requirements: {
        parentIds: [g.id],
        requiredSpecialization: { zone: g.zone, level: 1 },
      },
      description:
        `Гекс «${p.hexLabel}» ${g.label}. Круги навыков на орбите внутри гекса.`,
    });

    p.sheetSkills.forEach((name, si) => {
      nodes.push({
        id: `sk_${g.zone}_${p.key}_${si + 1}_${slugify(name)}`,
        x: 0,
        y: 0,
        label: name,
        zone: g.zone,
        category: 'transit_specialized',
        cost: { type: 'OR', amount: 1 },
        level: 0,
        maxLevel: MASTERY_MAX,
        requirements: {
          parentIds: [hexId],
          requiredSpecialization: { zone: g.zone, level: 1 },
        },
        description: masteryDesc(name),
      });
    });

    p.traits.forEach((name, ti) => {
      nodes.push({
        id: `trait_${g.zone}_${p.key}_${ti + 1}`,
        x: 0,
        y: 0,
        label: name,
        zone: g.zone,
        category: 'feat',
        cost: { type: 'OR', amount: 1 },
        requirements: {
          parentIds: [hexId],
          requiredSpecialization: { zone: g.zone, level: 1 },
        },
        description: `${name}. Черта гекса. Текст позже.`,
      });
    });

    const diaId = `dia_${g.zone}_${p.key}_kvel`;
    nodes.push({
      id: diaId,
      x: 0,
      y: 0,
      label: p.diaLabel,
      zone: g.zone,
      category: 'transit_specialized',
      hub: 'diamond',
      cost: { type: 'OR', amount: 1 },
      requirements: {
        parentIds: [g.id],
        requiredSpecialization: { zone: g.zone, level: 1 },
      },
      description: `Ромб ${p.diaLabel.toLowerCase()}. Текст позже.`,
    });

    p.kvels.forEach((name, ki) => {
      nodes.push({
        id: `kvel_${g.zone}_${p.key}_${ki + 1}`,
        x: 0,
        y: 0,
        label: name,
        zone: g.zone,
        category: 'feat',
        cost: { type: 'OR', amount: 1 },
        requirements: {
          parentIds: [diaId],
          requiredSpecialization: { zone: g.zone, level: 2 },
        },
        description: `${name}. Текст позже.`,
      });
    });
  }
}

const edges: SkillEdge[] = [];
for (const n of nodes) {
  for (const p of n.requirements?.parentIds ?? []) {
    edges.push({ from: p, to: n.id });
  }
}

export const initialSkillTree: SkillTreeData = {
  nodes: applyPoeLayout(nodes),
  edges,
};
