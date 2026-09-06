(() => {
  const ROOT = "../";
  const ICONS = {
    overview: `${ROOT}assets/icone/hv-squadra-panoramica.webp`,
    roster: `${ROOT}assets/icone/hv-squadra-rosa.webp`,
    auction: `${ROOT}assets/icone/hv-squadra-asta.webp`,
    stats: `${ROOT}assets/icone/hv-squadra-statistiche.webp`,
    prediction: `${ROOT}assets/icone/hv-squadra-previsione-serie-a.webp`,
    origin: `${ROOT}assets/icone/hv-squadra-origine-rosa.webp`,
    movements: `${ROOT}assets/icone/hv-squadra-movimenti-rosa.svg`
  };

  function loadFinalIconCss() {
    if (document.getElementById('squadra-icons-final-css')) return;
    const link = document.createElement('link');
    link.id = 'squadra-icons-final-css';
    link.rel = 'stylesheet';
    link.href = 'squadra-icons-final.css';
    document.head.appendChild(link);
  }

  function useBranding() {
    document.querySelectorAll('.brand-logo').forEach(img => img.src = `${ROOT}assets/logo.png`);
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = `${ROOT}assets/logo.png`;
  }

  function testAsset(src) {
    return new Promise(resolve => {
      if (!src) return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async function replaceIcon(target, src, alt = '') {
    const holder = document.querySelector(target);
    if (!holder || !(await testAsset(src))) return;
    holder.outerHTML = `<span class="hv-team-icon"><img src="${src}" alt="${alt}"></span>`;
  }

  async function applyIcons() {
    await Promise.all([
      replaceIcon('.overview-card .mini-emblem', ICONS.overview, 'Panoramica'),
      replaceIcon('.prediction-card .mini-emblem', ICONS.prediction, 'Previsione Serie A'),
      replaceIcon('.auction-grade-card .mini-emblem', ICONS.auction, 'Pagella asta'),
      /* Highlights asta: nessuna icona custom dedicata per ora. */
      replaceIcon('.roster-main-card .mini-emblem', ICONS.roster, 'Rosa'),
      replaceIcon('[data-view="roster"] .roster-stats-grid .team-card:nth-child(1) .mini-emblem', ICONS.origin, 'Origine rosa'),
      replaceIcon('[data-view="roster"] .roster-stats-grid .team-card:nth-child(2) .mini-emblem', ICONS.stats, 'Statistiche rosa'),
      /* Club reali resta con fallback Lucide finché non ricevo il suo asset corretto. */
      replaceIcon('[data-view="roster"] .roster-stats-grid .team-card:nth-child(4) .mini-emblem', ICONS.movements, 'Movimenti rosa')
    ]);
  }

  async function decorateTabs() {
    for (const [btn, src] of [
      [document.querySelector('.team-tab[data-tab="overview"]'), ICONS.overview],
      [document.querySelector('.team-tab[data-tab="roster"]'), ICONS.roster]
    ]) {
      if (!btn || !(await testAsset(src))) continue;
      btn.querySelectorAll('svg, i[data-lucide], .team-tab-custom-icon').forEach(el => el.remove());
      btn.insertAdjacentHTML('afterbegin', `<img class="team-tab-custom-icon" src="${src}" alt="">`);
    }
  }

  function init() {
    loadFinalIconCss();
    useBranding();
    applyIcons();
    decorateTabs();
    setTimeout(() => { useBranding(); applyIcons(); decorateTabs(); }, 350);
    setTimeout(decorateTabs, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();