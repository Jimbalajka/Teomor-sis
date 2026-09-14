import { useSkillTree } from './SkillTreeContext';
import type { TreeFocus } from './treeView';

export function SkillTreeToolbar() {
  const {
    treeFocus,
    setTreeFocus,
    showRouteHighlight,
    setShowRouteHighlight,
    routeHighlight,
  } = useSkillTree();

  const setFocus = (f: TreeFocus) => setTreeFocus(f);

  return (
    <div className="tree-toolbar">
      <button
        type="button"
        className={treeFocus === 'all' ? 'active' : ''}
        onClick={() => setFocus('all')}
      >
        Все дары
      </button>
      <button
        type="button"
        className={treeFocus === 'my_dar' ? 'active' : ''}
        onClick={() => setFocus('my_dar')}
      >
        Мой дар
      </button>
      <button
        type="button"
        className={showRouteHighlight ? 'active' : ''}
        onClick={() => setShowRouteHighlight(!showRouteHighlight)}
        disabled={routeHighlight.size === 0}
        title={routeHighlight.size === 0 ? 'Загрузите пресет плейтеста' : 'Подсветить маршрут'}
      >
        Маршрут
      </button>
    </div>
  );
}
