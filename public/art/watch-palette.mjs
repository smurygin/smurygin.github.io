/** CSS owns the palette; invalidate cached pixels when its inputs change. */
export function watchPalette(refresh) {
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', refresh);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', refresh);
  };
}
