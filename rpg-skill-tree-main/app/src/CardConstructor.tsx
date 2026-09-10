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
} from './cardConstructor';

const emptyParts = (): BuildParts => ({
  sigilIds: [],
});

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
    title,
    items,
    selectedId,
    onSelect,
    multi,
    selectedIds,
  }: {
    title: string;
    items: GameCard[];
    selectedId?: string;
    onSelect: (id: string | undefined) => void;
    multi?: boolean;
    selectedIds?: string[];
  }) => (
    <div className="ctor-part-block">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="muted">Нет частей. Открой ветку на древе или добавь в справочник.</p>
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
                  className={`btn btn-mini2 ctor-part-btn${active ? ' btn-primary' : ''}`}
                  onClick={() =>
                    multi
                      ? toggleSigil(c.id)
                      : onSelect(active ? undefined : c.id)
                  }
                >
                  {c.name}
                  {c.cost > 0 && <span className="ctor-part-cost"> {c.cost}у</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="card-constructor panel">
      <h3>Конструктор приёма</h3>
      <p className="muted ctor-hint">
        Собери приём <b>вне игры</b>: выбери части → приложение считает усталость и
        механику. Название и описание — твой лор; состав виден в строке «Состав».
      </p>

      <div className="ctor-layout">
        <div className="ctor-parts">
          <PartList
            title="Квель (потолок усталости)"
            items={partsByCategory(catalog, 'kvel')}
            selectedId={parts.kvelId}
            onSelect={(id) => pick('kvelId', id)}
          />
          <PartList
            title="Аспект"
            items={partsByCategory(catalog, 'aspect')}
            selectedId={parts.aspectId}
            onSelect={(id) => pick('aspectId', id)}
          />
          <PartList
            title="Сигилы (можно несколько)"
            items={partsByCategory(catalog, 'sigil')}
            selectedIds={parts.sigilIds}
            onSelect={() => {}}
            multi
          />
          <PartList
            title="Инструмент"
            items={partsByCategory(catalog, 'instrument')}
            selectedId={parts.instrumentId}
            onSelect={(id) => pick('instrumentId', id)}
          />
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
            Описание (лор, визуал — пишет игрок)
            <textarea
              rows={4}
              value={description}
              placeholder="Вызываю пламя вокруг глаз противника..."
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="ctor-stats">
            <span>
              Усталость: <b>{cost}</b>
              {recipe.kvel && (
                <>
                  {' '}
                  / макс {recipe.kvel.fatigueMax ?? '—'}
                  {!okKvel && (
                    <span className="ctor-warn"> — превышает квель!</span>
                  )}
                </>
              )}
            </span>
            {mech && (
              <span className="ctor-mech">
                Состав: {mech}
              </span>
            )}
          </div>

          <div className="ctor-preview">
            <CardPreview card={preview} />
          </div>

          <div className="ctor-actions">
            <button
              className="btn btn-primary"
              disabled={!canSave}
              onClick={save}
            >
              {editCard ? 'Обновить приём' : 'Сохранить приём'}
            </button>
            {editCard && onCancelEdit && (
              <button className="btn" onClick={onCancelEdit}>
                Отмена
              </button>
            )}
          </div>
          {!name.trim() && (
            <p className="muted">Нужно название приёма.</p>
          )}
          {parts.sigilIds.length === 0 && (
            <p className="muted">Выбери хотя бы один сигил.</p>
          )}
        </div>
      </div>
    </div>
  );
}
