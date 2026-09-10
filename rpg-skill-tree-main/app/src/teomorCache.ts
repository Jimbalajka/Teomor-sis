import { TREE_BUILD } from './buildInfo';

const PREFIX = 'teomor_';

export function clearTeomorLocalCache(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function applyResetQueryParam(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') !== '1') return false;
  clearTeomorLocalCache();
  localStorage.setItem('teomor_tree_build', TREE_BUILD);
  window.location.replace(window.location.pathname + window.location.hash);
  return true;
}
