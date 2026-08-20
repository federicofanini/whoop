/**
 * Applies the stored theme before the first paint.
 *
 * A dark-mode dashboard that renders white for one frame on every load is worse
 * than one that has no light mode at all, and React cannot help — the class has
 * to be on `<html>` before the body paints. So this is a blocking inline script,
 * deliberately: it is ~200 bytes and runs synchronously in the head.
 */
const SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('strap-theme');
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = stored === 'light' || stored === 'dark' ? stored : system;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
