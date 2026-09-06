(() => {
  const ROOT = "../";
  const API = "https://hertavernello-api-proxy.emmanueletufano.workers.dev";

  const esc = (v = "") => String(v).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase() || "?";
  const slug = (name = "") => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function labelLeagueStrip() {
    const strip = document.querySelector('.league-strip');
    if (!strip) return;
    strip.hidden = false;
    const labels = [
      ['strip-teams','Fantasquadre'],
      ['strip-managers','Fantallenatori'],
      ['strip-season','Stagione'],
      ['strip-history','Stagioni in archivio']
    ];
    labels.forEach(([id,label]) => {
      const value = document.getElementById(id);
      const holder = value?.parentElement;
      if (!value || !holder) return;
      let caption = holder.querySelector('.strip-label');
      if (!caption) {
        caption = document.createElement('small');
        caption.className = 'strip-label';
        holder.appendChild(caption);
      }
      caption.textContent = label;
    });
  }

  function faceMarkup(name) {
    const src = `${ROOT}assets/giocatori/${slug(name)}.png`;
    return `<span class="scorer-avatar"><img src="${src}" alt="" onerror="this.remove();this.parentElement.textContent='${esc(initials(name))}'"></span>`;
  }

  async function renderScorers() {
    const wrap = document.getElementById('top-scorers');
    if (!wrap) return;
    try {
      const res = await fetch(`${API}/competitions/SA/scorers`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const scorers = data.scorers || [];
      if (!scorers.length) return;
      wrap.innerHTML = scorers.slice(0,5).map((s,i) => {
        const name = s.player?.name || '—';
        const club = s.team?.shortName || s.team?.name || '';
        return `<div class="scorer-row">
          <span class="scorer-rank">${i + 1}</span>
          ${faceMarkup(name)}
          <div class="scorer-copy"><strong>${esc(name)}</strong><small>${esc(club)}</small></div>
          <div class="scorer-stats"><span class="scorer-stat">${esc(s.goals ?? 0)} <small>GOL</small></span><span class="scorer-stat assists">${esc(s.assists ?? 0)} <small>ASS</small></span></div>
        </div>`;
      }).join('');
    } catch (err) {
      console.warn('Marcatori non aggiornati', err);
    }
  }

  function renameScorers() {
    const title = document.querySelector('.panel-scorers .panel-title h2');
    if (title) title.textContent = 'Marcatori';
  }

  function init() {
    renameScorers();
    labelLeagueStrip();
    renderScorers();
    setTimeout(labelLeagueStrip, 500);
    setTimeout(renderScorers, 900);
    setTimeout(renderScorers, 2200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();