import { useEffect, useMemo, useState } from 'react';
import type { GameCard } from './cardsData';
import { CardPreview } from './CardPreview';
import {
  buildCardFromParts,
  catalogParts,
  computeBuildCost,
  mechanicalSummary,
  mergeBuildFields,
  partsByCategory,
  resolveRecipe,
  withinKvelLimit,
  type BuildParts,
} from './cardBuilderLogic';

const emptyParts = (): BuildParts => ({
  sigilIds: [],
});

const PART_SECTIONS = [
  {
    step: 1,
    title: 'Квель',
    hint: 'Потолок усталости приёма. Без квеля — считаем общий лимит пути.',
    field: 'kvelId' as const,
    category: 'kvel' as const,
    multi: false,
  },
  {
    step: 2,
    title: 'Аспект',
    hint: 'Стихия или природа эффекта. Задаёт урон/состояние в строке карты.',
    field: 'aspectId' as const,
    category: 'aspect' as const,
    multi: false,
  },
  {
    step: 3,
    title: 'Сигилы',
    hint: 'Механика приёма — можно несколько. Минимум один обязателен.',
    field: 'sigilIds' as const,
    category: 'sigil' as const,
    multi: true,
  },
  {
    step: 4,
    title: 'Инструмент',
    hint: 'Оружие или фокус-предмет. Необязательно; добавляет дальность/урон.',
    field: 'instrumentId' as const,
    category: 'instrument' as const,
    multi: false,
  },
] as const;

interface CardConstructorProps {
  library: GameCard[];
  treeCards: GameCard[];
  onSave: (card: GameCard) => void;
  editCard?: GameCard | null;
  onCancelEdit?: () => void;
}

export function CardConstructor({
  library,
  treeCards,
  onSave,
  editCard,
  onCancelEdit,
}: CardConstructorProps) {
  const catalog = useMemo(
    () => catalogParts([...library, ...treeCards]),
    [library, treeCards],
  );

  const [parts, setParts] = useState<BuildParts>(
    editCard?.buildParts ?? emptyParts(),
  );
  const [name, setName] = useState(editCard?.name ?? '');
  const [description, setDescription] = useState(editCard?.description ?? '');

  useEffect(() => {
    if (!editCard) return;
    setParts(editCard.buildParts ?? emptyParts());
    setName(editCard.name);
    setDescription(editCard.description);
  }, [editCard]);

  const recipe = useMemo(() => resolveRecipe(parts, catalog), [parts, catalog]);
  const cost = computeBuildCost(recipe);
  const fields = mergeBuildFields(recipe);
  const mech = mechanicalSummary(recipe);
  const okKvel = withinKvelLimit(cost, recipe.kvel);

  const preview: GameCard = {
    id: editCard?.id ?? 'preview',
    category: 'build',
    name: name.trim() || 'Приём без названия',
    cost,
    ...fields,
    description: description.trim() || '— опиши визуал и отыгрыш —',
    mechanicalNote: mech,
    fatigueMax: recipe.kvel?.fatigueMax,
    buildParts: parts,
  };

  const selectedParts = useMemo(() => {
    const ids = [
      parts.kvelId,
      parts.aspectId,
      parts.instrumentId,
      ...parts.sigilIds,
    ].filter(Boolean) as string[];
    return ids
      .map((id) => catalog.find((c) => c.id === id))
      .filter(Boolean) as GameCard[];
  }, [parts, catalog]);

  const toggleSigil = (id: string) => {
    setParts((p) => {
      const has = p.sigilIds.includes(id);
      return {
        ...p,
        sigilIds: has
          ? p.sigilIds.filter((x) => x !== id)
          : [...p.sigilIds, id],
      };
    });
  };

  const pick = (field: keyof BuildParts, id: string | undefined) => {
    setParts((p) => ({ ...p, [field]: id }));
  };

  const canSave =
    parts.sigilIds.length > 0 && name.trim().length > 0 && okKvel;

  const save = () => {
    if (!canSave) return;
    onSave(
      buildCardFromParts(
        parts,
        catalog,
        name,
        description,
        editCard?.id,
      ),
    );
    if (!editCard) {
      setParts(emptyParts());
      setName('');
      setDescription('');
    }
  };

  const PartList = ({
    step,
    title,
    hint,
    items,
    selectedId,
    onSelect,
    multi,
    selectedIds,
  }: {
    step: number;
    title: string;
    hint: string;
    items: GameCard[];
    selectedId?: string;
    onSelect: (id: string | undefined) => void;
    multi?: boolean;
    selectedIds?: string[];
  }) => {
    const activeItem = !multi
      ? items.find((c) => c.id === selectedId)
      : undefined;

    return (
      <div className="ctor-part-block">
        <h4>
          <span className="ctor-step">{step}</span> {title}
        </h4>
        <p className="ctor-part-hint muted">{hint}</p>
        {items.length === 0 ? (
          <p className="muted ctor-empty">
            Нет частей — открой ветку на древе или загрузи плейтест.
          </p>
        ) : (
          <ul className="ctor-part-list">
            {items.map((c) => {
              const active = multi
                ? selectedIds?.includes(c.id)
                : selectedId === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    title={c.description}
                    className={`btn btn-mini2 ctor-part-btn${active ? ' btn-primary' : ''}`}
                    onClick={() =>
                      multi
                        ? toggleSigil(c.id)
                        : onSelect(active ? undefined : c.id)
                    }
                  >
                    {c.name}
                    {c.cost > 0 && (
                      <span className="ctor-part-cost"> +{c.cost}уст</span>
                    )}
                    {c.category === 'kvel' && c.fatigueMax != null && (
                      <span className="ctor-part-cost"> макс{c.fatigueMax}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {activeItem?.description && (
          <p className="ctor-part-active muted">{activeItem.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="card-constructor panel">
      <h3>{editCard ? 'Редактирование приёма' : 'Конструктор приёма'}</h3>
      <p className="muted ctor-hint">
        Собери приём <b>вне игры</b>: шаги 1–4 слева → справа живое превью карты.
        Название и описание — твой лор; усталость и состав считает приложение.
      </p>

      {selectedParts.length > 0 && (
        <div className="ctor-chips">
          <span className="ctor-chips-label">Выбрано:</span>
          {selectedParts.map((c) => (
            <span key={c.id} className={`ctor-chip cat-${c.category}`}>
              {c.name}
            </span>
          ))}
        </div>
      )}

      <div className="ctor-layout">
        <div className="ctor-parts">
          {PART_SECTIONS.map((sec) => (
            <PartList
              key={sec.field}
              step={sec.step}
              title={sec.title}
              hint={sec.hint}
              items={partsByCategory(catalog, sec.category)}
              selectedId={
                sec.multi ? undefined : (parts[sec.field] as string | undefined)
              }
              selectedIds={sec.multi ? parts.sigilIds : undefined}
              multi={sec.multi}
              onSelect={(id) => {
                if (!sec.multi) pick(sec.field, id);
              }}
            />
          ))}
        </div>

        <div className="ctor-right">
          <div className="ctor-preview-sticky">
            <div className="ctor-preview-label">Превью карты</div>
            <div className="ctor-preview">
              <CardPreview card={preview} selected />
            </div>

            <div className="ctor-stats panel-inset">
              <div className="ctor-stat-row">
                <span>Усталость приёма</span>
                <strong className={!okKvel ? 'ctor-warn' : ''}>
                  {cost}
                  {recipe.kvel && ` / макс ${recipe.kvel.fatigueMax ?? '—'}`}
                </strong>
              </div>
              {!okKvel && (
                <p className="ctor-warn ctor-stat-warn">
                  Превышает потолок квеля — убери сигил или смени квель.
                </p>
              )}
              {mech && (
                <div className="ctor-mech">
                  <span className="muted">Состав:</span> {mech}
                </div>
              )}
            </div>
          </div>

          <div className="ctor-form">
            <label>
              Название приёма
              <input
                value={name}
                placeholder="Огненный вихрь"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Описание (лор, визуал)
              <textarea
                rows={4}
                value={description}
                placeholder="Вызываю пламя вокруг глаз противника..."
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="ctor-actions">
              <button
                className="btn btn-primary"
                disabled={!canSave}
                onClick={save}
              >
                {editCard ? 'Сохранить изменения' : 'Сохранить приём'}
              </button>
              {editCard && onCancelEdit && (
                <button className="btn" onClick={onCancelEdit}>
                  Отмена
                </button>
              )}
            </div>
            {!name.trim() && (
              <p className="muted ctor-validation">Нужно название приёма.</p>
            )}
            {parts.sigilIds.length === 0 && (
              <p className="muted ctor-validation">Выбери хотя бы один сигил (шаг 3).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
