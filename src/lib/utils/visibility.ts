export function onVisibilityChange(onHidden: () => void, onVisible: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  function handler() {
    if (document.hidden) onHidden();
    else onVisible();
  }
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
