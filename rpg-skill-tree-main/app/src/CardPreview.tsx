import { CATEGORY_LABEL, type GameCard } from './cardsData';

// Визуал карты в духе концепта: козырёк (название + стоимость ОС + категория),
// строка параметров (урон/дальность/площадь/состояние), тело с описанием.
export function CardPreview({
  card,
  onClick,
  selected,
}: {
  card: GameCard;
  onClick?: () => void;
  selected?: boolean;
}) {
  const params = [
    card.damage && `⭐ ${card.damage}`,
    card.range && `⟶ ${card.range}`,
    card.area && `■ ${card.area}`,
    card.states && `✷ ${card.states}`,
  ].filter(Boolean) as string[];

  return (
    <div
      className={`card-tile cat-${card.category}${selected ? ' card-selected' : ''}`}
      onClick={onClick}
    >
      <div className="card-brow">
        <span className="card-cost">
          {card.category === 'kvel'
            ? `Лим ${card.osLimit ?? 0}`
            : `${card.cost} ОС`}
        </span>
        <span className="card-name">{card.name}</span>
        <span className="card-cat">{CATEGORY_LABEL[card.category]}</span>
      </div>

      {card.category === 'kvel' && card.rank != null && (
        <div className="card-params">Ранг Квеля: {card.rank}</div>
      )}
      {params.length > 0 && <div className="card-params">{params.join('  ·  ')}</div>}

      <div className="card-body">{card.description}</div>
      {card.profession && <div className="card-prof">{card.profession}</div>}
    </div>
  );
}
