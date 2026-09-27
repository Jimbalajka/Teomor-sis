import type { Race } from './types';

// Предыстории: ранг навыка или владение — без «+N» на листе.
export type Background = Omit<Race, 'speed'>;

export const backgrounds: Background[] = [
  {
    id: 'street_rat',
    name: 'Дитя улиц',
    blurb: 'Вырос в трущобах, знаешь тёмные переулки и чужие карманы.',
    statModifiers: {},
    skillRanks: { Скрытность: 1, 'Ловкость рук': 1 },
    abilities: ['Знание городского дна и связей в преступном мире'],
    proficiencies: ['Уличное чутьё'],
  },
  {
    id: 'scholar',
    name: 'Учёный',
    blurb: 'Годы за книгами и колбами. Знание там, где другие видят хаос.',
    statModifiers: {},
    skillRanks: { 'Точная Наука': 1, Анализ: 1 },
    abilities: ['Доступ к библиотекам и академическим кругам'],
    proficiencies: ['Академическая грамотность'],
  },
  {
    id: 'soldier',
    name: 'Солдат',
    blurb: 'Служил в строю, знаешь дисциплину и цену приказа.',
    statModifiers: {},
    skillRanks: { Атлетика: 1, Запугивание: 1 },
    abilities: ['Воинское звание/связи, знание уставов'],
    proficiencies: ['Воинский устав'],
  },
  {
    id: 'merchant',
    name: 'Торговец',
    blurb: 'Языком продашь снег зимой. Чуешь выгоду и ложь.',
    statModifiers: {},
    skillRanks: { Убеждение: 1, Проницательность: 1 },
    abilities: ['Торговая сеть, скидки у знакомых лавочников'],
    proficiencies: ['Торговый язык'],
  },
  {
    id: 'hunter',
    name: 'Охотник',
    blurb: 'Дикие земли - твой дом. Читаешь следы и зверя.',
    statModifiers: {},
    skillRanks: { Выживание: 1, Природа: 1 },
    abilities: ['Ориентирование в глуши, добыча пропитания'],
    proficiencies: ['Следопытство'],
  },
  {
    id: 'artisan',
    name: 'Ремесленник',
    blurb: 'Руки помнят ремесло. Чинишь и создаёшь.',
    statModifiers: {},
    skillRanks: { Ремонт: 1, ЭлектроМех: 1 },
    abilities: ['Мастерская, гильдейские связи'],
    proficiencies: ['Ремесленный инструмент'],
  },
  {
    id: 'acolyte',
    name: 'Послушник',
    blurb: 'Рос при храме/культе. Слово веры и людские сердца.',
    statModifiers: {},
    skillRanks: { Внимание: 1, Лидерство: 1 },
    abilities: ['Убежище в родной общине, знание обрядов'],
    proficiencies: ['Обряды общины'],
  },
];

export const backgroundById = (id: string | null): Background | undefined =>
  id ? backgrounds.find((b) => b.id === id) : undefined;
