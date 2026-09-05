(() => {
  const ROOT = "../";
  const ICONS = {
    overview: `${ROOT}assets/icone/hv-squadra-panoramica.png`,
    roster: `${ROOT}assets/icone/hv-squadra-rosa.png`,
    auction: `${ROOT}assets/icone/hv-squadra-asta.png`,
    stats: `${ROOT}assets/icone/hv-squadra-statistiche.png`,
    prediction: `${ROOT}assets/icone/hv-squadra-previsione-serie-a.png`,
    movements: `${ROOT}assets/icone/hv-squadra-movimenti-rosa.png`,
    origin: `${ROOT}assets/icone/hv-squadra-origine-rosa.png`,
    clubs: `${ROOT}assets/icone/hv-squadra-club-piu-rappresentati.png`
  };

  function useBranding() {
    document.querySelectorAll('.brand-logo').forEach(img => img.src = `${ROOT}assets/logo.png`);
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = `${ROOT}assets/logo.png`;
  }

  function testAsset(src) {
    return new Promise(resolve => {
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
      replaceIcon('.auction-video-card .mini-emblem', ICONS.auction, 'Highlights asta'),
      replaceIcon('.roster-main-card .mini-emblem', ICONS.roster, 'Rosa'),
      replaceIcon('[data-view="roster"] .roster-stats-grid .team-card:nth-child(1) .mini-emblem', ICONS.origin, 'Origine rosa'),
      replaceIcon('[data-view="roster"] .roster-stats-grid .team-card:nth-child(2) .mini-emblem', ICONS.stats, 'Statistiche rosa'),
      replaceIcon('[data-view="roster"] .roster-stats-grid .team-card:nth-child(3) .mini-emblem', ICONS.clubs, 'Club più rappresentati'),
      replaceIcon('[data-view="roster"] .roster-stats-grid .team-card:nth-child(4) .mini-emblem', ICONS.movements, 'Movimenti rosa')
    ]);
  }

  function decorateTabs() {
    const overview = document.querySelector('.team-tab[data-tab="overview"]');
    const roster = document.querySelector('.team-tab[data-tab="roster"]');
    [[overview, ICONS.overview], [roster, ICONS.roster]].forEach(async ([btn, src]) => {
      if (!btn || !(await testAsset(src))) return;
      const old = btn.querySelector('svg');
      if (old) old.outerHTML = `<img class="team-tab-custom-icon" src="${src}" alt="">`;
    });
  }

  function init() {
    useBranding();
    applyIcons();
    decorateTabs();
    setTimeout(() => { useBranding(); applyIcons(); decorateTabs(); }, 350);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
