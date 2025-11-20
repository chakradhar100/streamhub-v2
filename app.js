/* StreamHub Premium — app.js
   Features:
   - TMDB optional (set TMDB_KEY)
   - Floating overlay player (80% size), material buttons
   - Full-page player available via "Open full page"
   - TV season/episode drop-downs (populated from TMDB)
   - IMDB fallback logic: episode IMDB -> series IMDB -> TMDB fallback
   - No global window.open override
*/

const TMDB_KEY = "1c161f19e296f253fed30df0a8bd7d93"; // put your TMDB key here to enable live data
const USE_TMDB = Boolean(TMDB_KEY);
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_SIZE = "w342";
const IMAGE_BASE = `https://image.tmdb.org/t/p/${IMAGE_SIZE}`;
const PLAYER_PAGE = "player.html";

/* Inline SVG gradient placeholder */
const PH_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='900'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#7f5dff'/><stop offset='1' stop-color='#3fd0ff'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)' rx='12' ry='12'/></svg>`;
const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(PH_SVG);

/* Helpers */
const $ = s => document.querySelector(s);
const el = (t, a = {}, ...c) => { const n = document.createElement(t); for (const k in a){ if (k === 'class') n.className = a[k]; else if (k === 'html') n.innerHTML = a[k]; else n.setAttribute(k, a[k]); } c.forEach(x => { if (x != null) n.append(typeof x === 'string' ? document.createTextNode(x) : x); }); return n; };

/* Lazy loader */
const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const img = en.target;
    const src = img.dataset.src;
    if (src) { img.src = src; img.removeAttribute('data-src'); }
    io.unobserve(img);
  });
}, { rootMargin: '250px' }) : null;

/* TMDB fetch helper */
async function tmdbFetch(path, params = {}) {
  if (!USE_TMDB) return null;
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

/* poster URL */
function posterFor(it) {
  if (it.poster) return it.poster;
  if (it.poster_path) return `${IMAGE_BASE}${it.poster_path}`;
  return PLACEHOLDER;
}

/* tile builder */
function tileFor(it) {
  const tile = el('article', { class: 'tile', role: 'button', tabindex: 0 });
  const img = el('img', { class: 'poster', alt: (it.title || it.name || 'Untitled'), src: PLACEHOLDER });
  img.dataset.src = posterFor(it);
  img.loading = 'lazy';
  img.onerror = () => { img.src = PLACEHOLDER; img.removeAttribute('data-src'); };
  if (io) io.observe(img);
  const meta = el('div', { class: 'meta' }, el('div', { class: 'title' }, it.title || it.name || 'Untitled'), el('div', { class: 'extra' }, (it.release_date || it.first_air_date || '').slice(0,4)));
  tile.append(img, meta);
  tile.addEventListener('click', () => openModal(it));
  tile.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(it); });
  return tile;
}

/* render row */
function renderRow(title, items=[]) {
  const rows = $('#rows');
  const section = el('section', { class: 'card-section' });
  const header = el('div', { class: 'row-title' }, el('h3', {}, title));
  const row = el('div', { class: 'row' });
  items.forEach(it => row.appendChild(tileFor(it)));
  section.append(header, row);
  rows.appendChild(section);
}

/* load rows (custom selection) */
async function loadRows() {
  $('#rows').innerHTML = '';
  if (!USE_TMDB) {
    // demo fallback
    const demo = [
      { title: 'Trending Today', items: [{ id:1, media_type:'movie', title:'Neon Drift', poster:PLACEHOLDER, overview:'Fast-paced neon.' }] },
      { title: 'Popular Movies', items: [{ id:2, media_type:'movie', title:'Color Burst', poster:PLACEHOLDER, overview:'Visual journey.' }] },
      { title: 'Action Movies', items: [{ id:3, media_type:'movie', title:'Rogue Path', poster:PLACEHOLDER, overview:'Explosive action.' }] },
      { title: 'Popular TV', items: [{ id:4, media_type:'tv', name:'Night Watch', poster:PLACEHOLDER, overview:'Watch the city.' }] },
      { title: 'Sci-Fi TV', items: [{ id:5, media_type:'tv', name:'Future Zone', poster:PLACEHOLDER, overview:'Sci-fi anthology.' }] }
    ];
    demo.forEach(r => renderRow(r.title, r.items));
    return;
  }

  try {
    const [trD, popM, actionM, popT, scifiT] = await Promise.all([
      tmdbFetch('/trending/all/day'),
      tmdbFetch('/movie/popular'),
      tmdbFetch('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' }), // action = 28
      tmdbFetch('/tv/popular'),
      tmdbFetch('/discover/tv', { with_genres: '10765', sort_by: 'popularity.desc' }) // 10765 sci-fi & fantasy
    ]);
    if (trD && trD.results) renderRow('Trending Today', trD.results.slice(0,12));
    if (popM && popM.results) renderRow('Popular Movies', popM.results.slice(0,12));
    if (actionM && actionM.results) renderRow('Action Movies', actionM.results.slice(0,12));
    if (popT && popT.results) renderRow('Popular TV Shows', popT.results.slice(0,12));
    if (scifiT && scifiT.results) renderRow('Sci-Fi TV', scifiT.results.slice(0,12));
  } catch (err) {
    console.warn('Row load failed', err);
    renderRow('Trending Today', [{ id:999, media_type:'movie', title:'Fallback', poster:PLACEHOLDER }]);
  }
}

/* SEARCH (movies + tv only) */
async function doSearch(q) {
  const resWrap = $('#searchResults');
  const searchArea = $('#searchArea');
  resWrap.innerHTML = '<div style="padding:12px;color:var(--muted)">Searching…</div>';
  searchArea.hidden = false;
  if (!q || !q.trim()) { resWrap.innerHTML = ''; return; }
  if (!USE_TMDB) {
    // demo search
    const d = [ {title:'Neon Drift', media_type:'movie'}, {title:'Night Watch', media_type:'tv'} ];
    const found = d.filter(x => (x.title||'').toLowerCase().includes(q.toLowerCase()));
    resWrap.innerHTML = '';
    if (found.length === 0) resWrap.innerHTML = '<div style="padding:12px;color:var(--muted)">No results</div>';
    else found.forEach(f => resWrap.appendChild(tileFor(f)));
    return;
  }

  try {
    const data = await tmdbFetch('/search/multi', { query: q, page: 1 });
    const results = (data && data.results) ? data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv') : [];
    resWrap.innerHTML = '';
    if (!results.length) resWrap.innerHTML = '<div style="padding:12px;color:var(--muted)">No results</div>';
    else results.forEach(r => resWrap.appendChild(tileFor(r)));
  } catch (err) {
    resWrap.innerHTML = '<div style="padding:12px;color:var(--muted)">Search failed</div>';
  }
}

/* Wire search UI */
$('#searchButton').addEventListener('click', () => doSearch($('#searchInput').value));
$('#searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(e.target.value); });

/* Overlay player helpers */
const overlay = $('#videoOverlay');
const overlayFrameWrap = $('#videoFrameWrap');
const overlayTitle = $('#videoTitle');
const overlayInfo = $('#videoInfo');
const btnCloseOverlay = $('#btnCloseOverlay');
const btnMaximize = $('#btnMaximize');
const btnOpenFull = $('#btnOpenFull');

function showOverlay() {
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function hideOverlay() {
  overlay.setAttribute('aria-hidden', 'true');
  overlayFrameWrap.innerHTML = '';
  overlayInfo.innerHTML = '';
  document.body.style.overflow = '';
}
btnCloseOverlay.addEventListener('click', hideOverlay);
overlay.addEventListener('click', (e)=> { if (e.target === overlay) hideOverlay(); });

/* Build embed url (prefer IMDB; fallback to TMDB marker) */
function embedUrlFromImdbOrTmdb({imdb, tmdbId, type='movie', s, e}) {
  // prefer imdb
  if (imdb) {
    if (type === 'tv') return `https://vidsrc-embed.ru/embed/tv?imdb=${encodeURIComponent(imdb)}&s=${encodeURIComponent(s||1)}&e=${encodeURIComponent(e||1)}`;
    return `https://vidsrc-embed.ru/embed/movie?imdb=${encodeURIComponent(imdb)}`;
  }
  // fallback to tmdb-based embed attempt (some providers accept tmdb param)
  if (tmdbId) {
    if (type === 'tv') return `https://vidsrc-embed.ru/embed/tv?tmdb=${encodeURIComponent(tmdbId)}&s=${encodeURIComponent(s||1)}&e=${encodeURIComponent(e||1)}`;
    return `https://vidsrc-embed.ru/embed/movie?tmdb=${encodeURIComponent(tmdbId)}`;
  }
  return '';
}

/* Try to resolve IMDB id for item (movie or tv episode). Fallbacks:
   - movie: d.imdb_id
   - tv episode: episode.imdb_id -> season/series imdb -> tmdb series id fallback
*/
async function resolveImdb({ item }) {
  // item: original item passed to modal (tmdb item) - may have id and media_type
  if (!USE_TMDB) return { imdb: null, tmdbId: item && (item.id || item.tmdb) || null, note: 'No TMDB key - demo fallback' };

  try {
    if (item.media_type === 'movie') {
      const d = await tmdbFetch(`/movie/${item.id}`);
      if (d && d.imdb_id) return { imdb: d.imdb_id, tmdbId: item.id, note: 'movie imdb' };
      return { imdb: null, tmdbId: item.id, note: 'movie no imdb' };
    } else {
      // have to pick season & episode — default season 1 ep 1 unless selected in modal
      const seasonSel = document.getElementById('modalSeason');
      const episodeSel = document.getElementById('modalEpisode');
      const season = seasonSel ? seasonSel.value : 1;
      const episode = episodeSel ? episodeSel.value : 1;
      try {
        const ep = await tmdbFetch(`/tv/${item.id}/season/${season}/episode/${episode}`);
        if (ep && ep.imdb_id) return { imdb: ep.imdb_id, tmdbId: item.id, s: season, e: episode, note: 'episode imdb' };
      } catch (err) {
        // fallthrough
      }
      // try series-level imdb
      try {
        const series = await tmdbFetch(`/tv/${item.id}`);
        if (series && series.external_ids && series.external_ids.imdb_id) return { imdb: series.external_ids.imdb_id, tmdbId: item.id, s: season, e: episode, note: 'series imdb fallback' };
        // sometimes imdb is directly on series object
        if (series && series.imdb_id) return { imdb: series.imdb_id, tmdbId: item.id, s: season, e: episode, note: 'series imdb fallback2' };
      } catch (err) {}
      // final fallback: tmdb id only
      return { imdb: null, tmdbId: item.id, s: season, e: episode, note: 'tmdb fallback' };
    }
  } catch (err) {
    return { imdb: null, tmdbId: item.id || null, note: 'fetch error' };
  }
}

/* open overlay with embed (no blank tab) */
function openOverlayWithEmbed({ titleText, embedUrl, mirrors = [], note = '' }) {
  overlayTitle.textContent = titleText || 'Player';
  overlayFrameWrap.innerHTML = '';
  if (!embedUrl) {
    overlayFrameWrap.innerHTML = `<div style="padding:20px;color:#f88">No playable embed URL available.</div>`;
    overlayInfo.innerHTML = note ? `<div>${note}</div>` : '';
    showOverlay();
    return;
  }
  // Insert iframe (no sandbox) — allow autoplay/picture-in-picture/fullscreen
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.frameBorder = "0";
  iframe.width = "100%";
  iframe.height = "100%";
  overlayFrameWrap.appendChild(iframe);

  // mirrors & info
  let infoHtml = '';
  if (mirrors && mirrors.length) {
    infoHtml += `<div style="margin-bottom:6px"><strong>Mirrors:</strong> `;
    mirrors.slice(0,3).forEach((m,i)=>{ infoHtml += `<a href="${m}" target="_blank" rel="noopener noreferrer" style="color:#9fb3d9;margin-right:8px">Mirror ${i+1}</a>`; });
    infoHtml += `</div>`;
  }
  if (note) infoHtml += `<div style="color:#9fb3d9">${note}</div>`;
  overlayInfo.innerHTML = infoHtml;
  showOverlay();

  // Open full page: navigate same tab to player page (maximizes)
  btnMaximize.onclick = () => {
    // navigate current tab to player page with same embed params (imdb preferred)
    // to ensure reproducible behavior, we pass embedUrl and also imdb/tmdb params if present
    // We'll open player page with query param 'embed' encoded (player.html will accept it)
    try {
      const u = new URL(PLAYER_PAGE, window.location.href);
      u.searchParams.set('embed', embedUrl);
      window.location.href = u.toString();
    } catch (err) {
      // fallback: open in same tab directly
      window.location.href = PLAYER_PAGE;
    }
  };

  // Open full page button opens player.html in new tab (preserve user preference)
  btnOpenFull.onclick = () => {
    try {
      const u = new URL(PLAYER_PAGE, window.location.href);
      u.searchParams.set('embed', embedUrl);
      window.open(u.toString(), '_blank', 'noopener');
    } catch (err) {
      window.open(PLAYER_PAGE, '_blank', 'noopener');
    }
  };
}

/* Modal with play/trailer controls (and season/episode selectors for TV) */
function openModal(item) {
  const body = $('#modalBody');
  body.innerHTML = '';
  const poster = posterFor(item);
  const left = el('div', { style: 'flex:0 0 240px' }, el('img', { src: poster, class: 'poster' }));
  const info = el('div', { class: 'info' },
    el('h2', {}, item.title || item.name || 'Untitled'),
    el('p', { class: 'small', style: 'color:var(--muted)' }, item.overview || 'No description available.')
  );
  const controls = el('div', { style: 'margin-top:12px;display:flex;gap:8px;align-items:center' });
  const playBtn = el('button', { class: 'material-btn filled' }, item.media_type === 'tv' ? 'Play Episode' : 'Play');
  const trailerBtn = el('button', { class: 'material-btn' }, 'Watch Trailer');
  controls.append(playBtn, trailerBtn);
  info.append(controls);

  if (item.media_type === 'tv') {
    const seasonWrap = el('div', { style: 'margin-top:12px;display:flex;gap:8px;align-items:center' },
      el('label', { style: 'color:var(--muted)' }, 'Season:'),
      el('select', { id: 'modalSeason' }, el('option', { value: '1' }, '1')),
      el('label', { style: 'color:var(--muted)' }, 'Episode:'),
      el('select', { id: 'modalEpisode' }, el('option', { value: '1' }, '1'))
    );
    info.append(seasonWrap);

    // populate seasons & episodes if TMDB available
    if (USE_TMDB) {
      tmdbFetch(`/tv/${item.id}`).then(series => {
        const selS = $('#modalSeason');
        selS.innerHTML = '';
        (series.seasons || []).forEach(se => {
          if (se.season_number >= 0) selS.appendChild(el('option', { value: se.season_number }, `S${se.season_number}`));
        });
        // when season changes, attempt to set episode count
        selS.addEventListener('change', async () => {
          const sNum = selS.value;
          const selE = $('#modalEpisode');
          selE.innerHTML = '<option>Loading…</option>';
          try {
            const seasonData = await tmdbFetch(`/tv/${item.id}/season/${sNum}`);
            selE.innerHTML = '';
            const epCount = (seasonData.episodes || []).length || 1;
            for (let i=1;i<=epCount;i++) selE.appendChild(el('option', { value: i }, `${i}`));
          } catch (err) { selE.innerHTML = '<option>1</option>'; }
        });
        // trigger change to populate episodes for default season
        selS.dispatchEvent(new Event('change'));
      }).catch(()=>{});
    }
  }

  const container = el('div', { class: 'modal-body' }, left, info);
  body.appendChild(container);

  const modal = $('#modal');
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');

  playBtn.onclick = async () => {
    // Resolve imdb/tmdb and build embed
    const resolving = await resolveImdb({ item });
    const embed = embedUrlFromImdbOrTmdb({ imdb: resolving.imdb, tmdbId: resolving.tmdbId, type: item.media_type === 'tv' ? 'tv' : 'movie', s: resolving.s, e: resolving.e });
    const mirrors = [];
    if (resolving.imdb) {
      mirrors.push(embed);
      mirrors.push(embed.replace('vidsrc-embed.ru','vidsrc.me'));
      mirrors.push(embed.replace('vidsrc-embed.ru','vidsrc.to'));
    }
    let note = '';
    if (!resolving.imdb) {
      note = 'IMDB not found for the selected episode/movie. Using TMDB fallback where possible. If embed fails, try "Open full page".';
    }
    openModalAndPlayInline(item, embed, mirrors, note);
  };

  trailerBtn.onclick = async () => {
    if (!USE_TMDB) { openOverlayWithEmbed({ titleText: item.title || item.name, embedUrl: 'https://www.youtube.com/', note:'Demo trailer' }); return; }
    try {
      const path = item.media_type === 'movie' ? `/movie/${item.id}/videos` : `/tv/${item.id}/videos`;
      const j = await tmdbFetch(path);
      const v = (j && j.results) ? j.results.find(x => x.site === 'YouTube' && x.type === 'Trailer') || j.results.find(x => x.site === 'YouTube') : null;
      if (v) {
        openOverlayWithEmbed({ titleText: `Trailer — ${item.title||item.name}`, embedUrl:`https://www.youtube.com/watch?v=${v.key}`, note:'' });
      } else {
        openOverlayWithEmbed({ titleText: `Trailer — ${item.title||item.name}`, embedUrl: '', note: 'Trailer not found' });
      }
    } catch (err) {
      openOverlayWithEmbed({ titleText: item.title||item.name, embedUrl: '', note: 'Trailer fetch failed' });
    }
  };
}

/* helper to open overlay directly (for hero play or other calls) */
async function openModalAndPlayInline(item, embedUrl, mirrors=[], note='') {
  // If embedUrl is empty and we have TMDB id, try embed construction
  if (!embedUrl && item && item.id) {
    const r = await resolveImdb({ item });
    embedUrl = embedUrlFromImdbOrTmdb({ imdb: r.imdb, tmdbId: r.tmdbId, type: item.media_type === 'tv' ? 'tv' : 'movie', s: r.s, e: r.e });
    if (r.imdb) {
      mirrors = [embedUrl, embedUrl.replace('vidsrc-embed.ru','vidsrc.me'), embedUrl.replace('vidsrc-embed.ru','vidsrc.to')];
      note = 'Resolved via TMDB';
    } else {
      note = 'Could not resolve IMDB; using TMDB fallback';
    }
  }
  const titleText = item.title || item.name || 'Player';
  openOverlayWithEmbed({ titleText, embedUrl, mirrors, note });
}

/* Modal close handling */
(function modalSetup(){
  const modal = $('#modal'); if (!modal) return;
  modal.addEventListener('click', e => { if (e.target === modal) { modal.style.display='none'; modal.setAttribute('aria-hidden','true'); $('#modalBody').innerHTML=''; }});
  const close = modal.querySelector('.modal-close'); if (close) close.addEventListener('click', () => { modal.style.display='none'; modal.setAttribute('aria-hidden','true'); $('#modalBody').innerHTML=''; });
})();

/* Hero init */
function initHero() {
  const ht = $('#heroTitle'), hd = $('#heroDesc'), hp = $('#heroPoster');
  if (!ht || !hd || !hp) return;
  if (!USE_TMDB) { ht.textContent='Featured — Neon Drift'; hd.textContent='Premium picks — explore posters below'; hp.src = PLACEHOLDER; return; }
  tmdbFetch('/trending/all/day').then(j => {
    const f = j && j.results && j.results[0]; if (!f) return;
    ht.textContent = f.title || f.name || 'Featured';
    hd.textContent = (f.overview || '').slice(0,220);
    hp.dataset.src = posterFor(f); if (io) io.observe(hp);

    const heroPlay = $('#heroPlayBtn');
    if (heroPlay) {
      heroPlay.onclick = async () => {
        // Play featured directly inline (no blank tab)
        openModalAndPlayInline(f, '', [], 'Loading featured...');
      };
    }
  }).catch(()=>{});
}

/* init */
async function init() {
  initHero();
  await loadRows();
  $('#searchResults').innerHTML = '';
  $('#searchInput').placeholder = 'Search movies & TV...';
}

/* start */
init();
