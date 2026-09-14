import type { Race } from './types';

// Предыстории. ВАЖНО: дают бонусы только к навыкам (не к характеристикам).
// Тот же тип, что и раса (id/name/blurb/statModifiers/abilities), speed игнорируется.
// Файл редактируемый: добавляй/меняй предыстории здесь.
export type Background = Omit<Race, 'speed'>;

export const backgrounds: Background[] = [
  {
    id: 'street_rat',
    name: 'Дитя улиц',
    blurb: 'Вырос в трущобах, знаешь тёмные переулки и чужие карманы.',
    statModifiers: { Скрытность: 1, 'Ловкость рук': 1 },
    abilities: ['Знание городского дна и связей в преступном мире'],
  },
  {
    id: 'scholar',
    name: 'Учёный',
    blurb: 'Годы за книгами и колбами. Знание там, где другие видят хаос.',
    statModifiers: { 'Точная Наука': 1, Анализ: 1 },
    abilities: ['Доступ к библиотекам и академическим кругам'],
  },
  {
    id: 'soldier',
    name: 'Солдат',
    blurb: 'Служил в строю, знаешь дисциплину и цену приказа.',
    statModifiers: { Атлетика: 1, Запугивание: 1 },
    abilities: ['Воинское звание/связи, знание уставов'],
  },
  {
    id: 'merchant',
    name: 'Торговец',
    blurb: 'Языком продашь снег зимой. Чуешь выгоду и ложь.',
    statModifiers: { Убеждение: 1, Проницательность: 1 },
    abilities: ['Торговая сеть, скидки у знакомых лавочников'],
  },
  {
    id: 'hunter',
    name: 'Охотник',
    blurb: 'Дикие земли - твой дом. Читаешь следы и зверя.',
    statModifiers: { Выживание: 1, Природа: 1 },
    abilities: ['Ориентирование в глуши, добыча пропитания'],
  },
  {
    id: 'artisan',
    name: 'Ремесленник',
    blurb: 'Руки помнят ремесло. Чинишь и создаёшь.',
    statModifiers: { Ремонт: 1, ЭлектроМех: 1 },
    abilities: ['Мастерская, гильдейские связи'],
  },
  {
    id: 'acolyte',
    name: 'Послушник',
    blurb: 'Рос при храме/культе. Слово веры и людские сердца.',
    statModifiers: { Внимание: 1, Лидерство: 1 },
    abilities: ['Убежище в родной общине, знание обрядов'],
  },
];

export const backgroundById = (id: string | null): Background | undefined =>
  id ? backgrounds.find((b) => b.id === id) : undefined;
