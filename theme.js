/* Applied before CSS paints, independently of account/catalog loading. */
(function () {
  'use strict';
  const key = 'polo-fragrance-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch (_) { /* Theme switching also works when storage is unavailable. */ }
  function apply() {
    const dark = (preference || (system.matches ? 'dark' : 'light')) === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-checked', String(dark));
      button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }
  apply();
  document.addEventListener('DOMContentLoaded', function () {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    apply();
    button.addEventListener('click', function () {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch (_) {}
      apply();
      document.getElementById('theme-status').textContent = preference === 'dark' ? 'Dark theme enabled.' : 'Light theme enabled.';
    });
  });
  system.addEventListener('change', function () { if (!preference) apply(); });
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== null) return;
    preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
    apply();
  });
}());
