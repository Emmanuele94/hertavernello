/* Navigazione a schede dell'Admin: evita la pagina infinita e apre direttamente la sezione richiesta. */
(() => {
  let initialized = false;
  const STORAGE_KEY = 'hv_admin_tab';
  const tabs = [
    { id: 'generale', label: '🏠 Generale' },
    { id: 'rose', label: '👥 Rose & Giocatori' },
    { id: 'mercato', label: '🔄 Mercato & Scambi' },
    { id: 'calendario', label: '📅 Calendario & Risultati' },
    { id: 'contenuti', label: '📊 Contenuti' },
    { id: 'feedback', label: '💡 Bug & Consigli' },
  ];

  function tabPerTitolo(titolo) {
    const t = (titolo || '').toLowerCase();
    if (t.includes('impostazioni lega') || t.includes('disconnetti tutti') || t.includes('regolamento')) return 'generale';
    if (t.includes('importa rose') || t.includes('gestione giocatori')) return 'rose';
    if (t.includes('mercato') || t.includes('scambi')) return 'mercato';
    if (t.includes('calendario di lega') || t.includes('aggiorna risultati') || t.includes('archivio eventi serie a')) return 'calendario';
    if (t.includes('pagelle') || t.includes('previsioni') || t.includes('archivia la stagione') || t.includes('icone della home')) return 'contenuti';
    if (t.includes('bug') && t.includes('consigli')) return 'feedback';
    return null;
  }

  function assegnaPannelli() {
    const wrap = document.querySelector('.admin-wrap');
    if (!wrap) return;
    Array.from(wrap.children).forEach((el) => {
      if (!el.classList?.contains('admin-box') || el.classList.contains('warn-box')) return;
      const h2 = el.querySelector(':scope > h2, :scope > .feedback-admin-title-row h2');
      const tab = tabPerTitolo(h2?.textContent || '');
      if (tab) el.dataset.adminTab = tab;
    });
  }

  function tabDaHash() {
    const hash = location.hash || '';
    if (hash === '#bug-consigli') return 'feedback';
    if (hash === '#admin-mercato-panel' || hash === '#mercato') return 'mercato';
    if (hash === '#admin-giocatori-panel' || hash === '#giocatori') return 'rose';
    if (hash === '#pv-admin-icons') return 'contenuti';
    return null;
  }

  function mostraTab(id, salva = true) {
    assegnaPannelli();
    const valido = tabs.some((t) => t.id === id) ? id : 'generale';
    document.querySelectorAll('.admin-wrap > .admin-box[data-admin-tab]').forEach((panel) => {
      panel.classList.toggle('admin-tab-hidden', panel.dataset.adminTab !== valido);
    });
    document.querySelectorAll('#admin-tabs-nav [data-tab]').forEach((btn) => {
      const attivo = btn.dataset.tab === valido;
      btn.classList.toggle('active', attivo);
      btn.setAttribute('aria-selected', attivo ? 'true' : 'false');
    });
    if (salva) localStorage.setItem(STORAGE_KEY, valido);
    document.querySelector('.admin-wrap')?.scrollIntoView({ block: 'start' });
    window.dispatchEvent(new CustomEvent('hv:admin-tab', { detail: { tab: valido } }));
  }

  function init() {
    if (initialized || window.hv_role !== 'admin') return;
    const nav = document.getElementById('admin-tabs-nav');
    if (!nav) return;
    initialized = true;
    nav.innerHTML = '';
    tabs.forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-tab-btn';
      btn.dataset.tab = tab.id;
      btn.setAttribute('role', 'tab');
      btn.textContent = tab.label;
      btn.addEventListener('click', () => mostraTab(tab.id));
      nav.appendChild(btn);
    });
    assegnaPannelli();
    const iniziale = tabDaHash() || localStorage.getItem(STORAGE_KEY) || 'generale';
    mostraTab(iniziale, !tabDaHash());

    const observer = new MutationObserver(() => {
      assegnaPannelli();
      const attiva = document.querySelector('#admin-tabs-nav .admin-tab-btn.active')?.dataset.tab || iniziale;
      mostraTab(attiva, false);
    });
    observer.observe(document.querySelector('.admin-wrap'), { childList: true });

    window.addEventListener('hashchange', () => {
      const tab = tabDaHash();
      if (tab) mostraTab(tab, false);
    });
  }

  window.hv_initAdminTabs = init;
  window.hv_mostraAdminTab = mostraTab;
})();
