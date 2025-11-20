/* StreamHub — stable app.js (final consolidated)
   - keeps all features (search refresh, homepage rows, hero poster)
   - TV dropdowns, IMDB-first, inline overlay player
   - mobile-friendly tweaks
*/

const TMDB_KEY = "1c161f19e296f253fed30df0a8bd7d93";
const USE_TMDB = !!TMDB_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = `https://image.tmdb.org/t/p/w342`;
const PLAYER_PAGE = "player.html";

const PH_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='900'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#7f5dff'/><stop offset='1' stop-color='#3fd0ff'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)' rx='12' ry='12'/></svg>`;
const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(PH_SVG);

const $ = s => document.querySelector(s);
const el = (t, a = {}, ...c) => {
  const n = document.createElement(t);
  for (const k in a) {
    if (k === 'class') n.className = a[k];
    else if (k === 'html') n.innerHTML = a[k];
    else n.setAttribute(k, a[k]);
  }
  c.forEach(x => n.append(typeof x === 'string' ? document.createTextNode(x) : x));
  return n;
};

/* helpers */
function fixMediaType(item) {
  if (!item.media_type) {
    if (item.first_air_date) item.media_type = 'tv';
    else item.media_type = 'movie';
  }
  return item;
}

async function tmdbFetch(path, params = {}) {
  if (!USE_TMDB) throw new Error('TMDB key missing');
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url);
  if (!res.ok) throw new Error('TMDB ' + res.status);
  return res.json();
}

function posterFor(it) {
  if (!it) return PLACEHOLDER;
  if (it.poster) return it.poster;
  if (it.poster_path) return IMAGE_BASE + it.poster_path;
  return PLACEHOLDER;
}

/* tiles + rows */
function tileFor(item) {
  item = fixMediaType(item);
  const tile = el('article', { class: 'tile', tabindex: 0, role: 'button' });
  const img = el('img', { class: 'poster', alt: item.title || item.name || 'Untitled', loading: 'lazy' });
  img.src = posterFor(item);
  img.onerror = () => { img.src = PLACEHOLDER; };
  const meta = el('div', { class: 'meta' },
    el('div', { class: 'title' }, item.title || item.name || 'Untitled'),
    el('div', { class: 'extra' }, (item.release_date || item.first_air_date || '').slice(0, 4))
  );
  tile.append(img, meta);
  tile.addEventListener('click', () => openModal(item));
  tile.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(item); });
  return tile;
}

function renderRow(title, items = []) {
  const rows = $('#rows');
  const section = el('section', { class: 'card-section' });
  const header = el('div', { class: 'row-title' }, el('h3', {}, title));
  const row = el('div', { class: 'row' });
  items.forEach(it => row.appendChild(tileFor(it)));
  section.append(header, row);
  rows.appendChild(section);
}

/* load rows (all five) */
async function loadRows() {
  $('#rows').innerHTML = '';
  if (!USE_TMDB) {
    const demo = [
      { title: 'Trending Today', items: [{ id: 1, media_type: 'movie', title: 'Neon Drift', poster: PLACEHOLDER }] },
      { title: 'Popular Movies', items: [{ id: 2, media_type: 'movie', title: 'Color Burst', poster: PLACEHOLDER }] },
      { title: 'Action Movies', items: [{ id: 3, media_type: 'movie', title: 'Rogue Path', poster: PLACEHOLDER }] },
      { title: 'Popular TV Shows', items: [{ id: 4, media_type: 'tv', name: 'Night Watch', poster: PLACEHOLDER }] },
      { title: 'Sci-Fi TV', items: [{ id: 5, media_type: 'tv', name: 'Future Zone', poster: PLACEHOLDER }] }
    ];
    demo.forEach(r => renderRow(r.title, r.items));
    return;
  }

  try {
    const [tr, popM, actM, popT, sciT] = await Promise.all([
      tmdbFetch('/trending/all/day'),
      tmdbFetch('/movie/popular'),
      tmdbFetch('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' }),
      tmdbFetch('/tv/popular'),
      tmdbFetch('/discover/tv', { with_genres: '10765', sort_by: 'popularity.desc' })
    ]);
    if (tr && tr.results) renderRow('Trending Today', tr.results.slice(0, 12));
    if (popM && popM.results) renderRow('Popular Movies', popM.results.slice(0, 12));
    if (actM && actM.results) renderRow('Action Movies', actM.results.slice(0, 12));
    if (popT && popT.results) renderRow('Popular TV Shows', popT.results.slice(0, 12));
    if (sciT && sciT.results) renderRow('Sci-Fi TV', sciT.results.slice(0, 12));
  } catch (err) {
    console.warn('loadRows error', err);
    renderRow('Trending Today (fallback)', [{ id: 999, media_type: 'movie', title: 'Fallback', poster: PLACEHOLDER }]);
  }
}

/* search (hides homepage + shows results) */
function showHome() {
  $('#searchArea').hidden = true;
  const heroCard = $('#heroTitle')?.closest('.hero-card');
  if (heroCard) heroCard.style.display = 'flex';
  $('#rows').innerHTML = '';
  // small delay to avoid flicker if called immediately after search clear
  setTimeout(() => loadRows(), 20);
}

async function doSearch(q) {
  const area = $('#searchArea');
  const out = $('#searchResults');

  if (!q || !q.trim()) { showHome(); return; }

  const heroCard = $('#heroTitle')?.closest('.hero-card');
  if (heroCard) heroCard.style.display = 'none';
  $('#rows').innerHTML = '';
  area.hidden = false;

  out.innerHTML = '<div style="padding:12px;color:var(--muted)">Searching…</div>';

  try {
    const j = await tmdbFetch('/search/multi', { query: q, page: 1 });
    let results = (j && j.results) ? j.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv') : [];
    results = results.map(fixMediaType);

    // preload external ids for top N so Play works instantly
    await Promise.all(results.slice(0, 8).map(async item => {
      try {
        const ext = await tmdbFetch(`/${item.media_type}/${item.id}/external_ids`);
        if (ext && ext.imdb_id) { item.imdb_id = ext.imdb_id; item.external_ids = ext; }
      } catch (e) { /* ignore */ }
    }));

    out.innerHTML = '';
    if (!results.length) out.innerHTML = '<div style="padding:12px;color:var(--muted)">No results</div>';
    else results.forEach(r => out.appendChild(tileFor(r)));
  } catch (err) {
    console.warn('search error', err);
    out.innerHTML = '<div style="padding:12px;color:var(--muted)">Search failed</div>';
  }
}

/* embed builder */
function embedURL({ imdb, tmdbId, type, s, e }) {
  if (!type) type = (s || e) ? 'tv' : 'movie';
  if (type === 'tv') {
    s = Number(s) || 1;
    e = Number(e) || 1;
    if (imdb) return `https://vidsrc-embed.ru/embed/tv?imdb=${encodeURIComponent(imdb)}&s=${s}&e=${e}`;
    return `https://vidsrc-embed.ru/embed/tv?tmdb=${encodeURIComponent(tmdbId)}&s=${s}&e=${e}`;
  } else {
    if (imdb) return `https://vidsrc-embed.ru/embed/movie?imdb=${encodeURIComponent(imdb)}`;
    return `https://vidsrc-embed.ru/embed/movie?tmdb=${encodeURIComponent(tmdbId)}`;
  }
}

/* resolve imdb (prefer item.imdb_id) */
async function resolveIMDB(item) {
  if (!item) return { imdb: null, tmdbId: null };
  if (item.imdb_id) return { imdb: item.imdb_id, tmdbId: item.id };

  if (!USE_TMDB) return { imdb: null, tmdbId: item.id };

  try {
    if (item.media_type === 'movie') {
      const d = await tmdbFetch(`/movie/${item.id}`);
      return { imdb: d && d.imdb_id ? d.imdb_id : null, tmdbId: item.id };
    } else {
      const season = document.getElementById('modalSeason')?.value || 1;
      const episode = document.getElementById('modalEpisode')?.value || 1;
      try {
        const ep = await tmdbFetch(`/tv/${item.id}/season/${season}/episode/${episode}`);
        if (ep && ep.imdb_id) return { imdb: ep.imdb_id, tmdbId: item.id, s: season, e: episode };
      } catch (e) { /* ignore */ }

      try {
        const ext = await tmdbFetch(`/tv/${item.id}/external_ids`);
        if (ext && ext.imdb_id) return { imdb: ext.imdb_id, tmdbId: item.id, s: season, e: episode };
      } catch (e) { /* ignore */ }

      return { imdb: null, tmdbId: item.id, s: season, e: episode };
    }
  } catch (err) {
    console.warn('resolveIMDB error', err);
    return { imdb: null, tmdbId: item.id };
  }
}

/* overlay player */
const overlay = $('#videoOverlay');
const overlayFrameWrap = $('#videoFrameWrap');
const overlayTitle = $('#videoTitle');
const overlayInfo = $('#videoInfo');

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
$('#btnCloseOverlay').onclick = hideOverlay;
overlay.addEventListener('click', e => { if (e.target === overlay) hideOverlay(); });

function openOverlayWith(embedUrl, title = 'Player', note = '') {
  overlayTitle.textContent = title;
  overlayFrameWrap.innerHTML = '';
  if (!embedUrl) {
    overlayFrameWrap.innerHTML = `<div style="padding:20px;color:#f88">No playable URL available.</div>`;
    overlayInfo.innerHTML = note ? `<div>${note}</div>` : '';
    showOverlay();
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.frameBorder = "0";
  iframe.width = "100%";
  iframe.height = "100%";
  overlayFrameWrap.appendChild(iframe);

  overlayInfo.innerHTML = note ? `<div style="color:#9fb3d9">${note}</div>` : '';
  showOverlay();

  $('#btnMaximize').onclick = () => {
    try {
      const u = new URL(PLAYER_PAGE, window.location.href);
      u.searchParams.set('embed', embedUrl);
      location.href = u.toString();
    } catch {
      location.href = PLAYER_PAGE;
    }
  };
  $('#btnOpenFull').onclick = () => {
    try {
      const u = new URL(PLAYER_PAGE, window.location.href);
      u.searchParams.set('embed', embedUrl);
      window.open(u.toString(), '_blank', 'noopener');
    } catch {
      window.open(PLAYER_PAGE, '_blank', 'noopener');
    }
  };
}

/* modal */
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
  const playBtn = el('button', { class: 'material-btn filled' }, 'Play');
  const trailerBtn = el('button', { class: 'material-btn' }, 'Watch Trailer');
  controls.append(playBtn, trailerBtn);
  info.append(controls);

  if (item.media_type === 'tv') {
    const seasonWrap = el('div', { style: 'margin-top:12px;display:flex;gap:12px;align-items:center' },
      el('label', { style: 'color:var(--muted)' }, 'Season'),
      el('select', { id: 'modalSeason', class: 'material-btn small', style: 'width:90px' }),
      el('label', { style: 'color:var(--muted)' }, 'Episode'),
      el('select', { id: 'modalEpisode', class: 'material-btn small', style: 'width:90px' })
    );
    info.append(seasonWrap);

    tmdbFetch(`/tv/${item.id}`).then(series => {
      const selS = $('#modalSeason');
      const selE = $('#modalEpisode');
      selS.innerHTML = '';
      (series.seasons || []).forEach(se => {
        if (se.season_number >= 0) selS.appendChild(el('option', { value: se.season_number }, se.season_number));
      });
      selS.addEventListener('change', async () => {
        selE.innerHTML = '<option>Loading…</option>';
        try {
          const sd = await tmdbFetch(`/tv/${item.id}/season/${selS.value}`);
          selE.innerHTML = '';
          (sd.episodes || []).forEach(ep => selE.appendChild(el('option', { value: ep.episode_number }, ep.episode_number)));
        } catch {
          selE.innerHTML = '<option>1</option>';
        }
      });
      if (selS.options.length) { selS.selectedIndex = 0; selS.dispatchEvent(new Event('change')); }
    }).catch(() => { /* ignore */ });
  }

  body.append(left, info);
  const modal = $('#modal');
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); };

  playBtn.onclick = async () => {
    const resolved = await resolveIMDB(item);
    const embed = embedURL({ imdb: resolved.imdb, tmdbId: resolved.tmdbId, type: item.media_type, s: resolved.s, e: resolved.e });
    const note = resolved.imdb ? '' : 'IMDb not found — using TMDB fallback if available';
    openOverlayWith(embed, item.title || item.name || 'Player', note);
  };

  trailerBtn.onclick = async () => {
    try {
      const path = item.media_type === 'movie' ? `/movie/${item.id}/videos` : `/tv/${item.id}/videos`;
      const j = await tmdbFetch(path);
      const v = (j && j.results) ? j.results.find(x => x.site === 'YouTube' && x.type === 'Trailer') || j.results.find(x => x.site === 'YouTube') : null;
      if (v) openOverlayWith(`https://www.youtube.com/embed/${v.key}`, `Trailer — ${item.title||item.name}`, '');
      else openOverlayWith('', 'Trailer', 'Trailer not found');
    } catch {
      openOverlayWith('', 'Trailer', 'Trailer fetch failed');
    }
  };
}

/* hero */
async function initHero() {
  if (!USE_TMDB) {
    $('#heroTitle').textContent = 'Featured — Demo';
    $('#heroDesc').textContent = 'Demo featured';
    $('#heroPoster').src = PLACEHOLDER;
    return;
  }
  try {
    const j = await tmdbFetch('/trending/all/day');
    const f = j && j.results && j.results[0];
    if (!f) return;
    $('#heroTitle').textContent = f.title || f.name || 'Featured';
    $('#heroDesc').textContent = (f.overview || '').slice(0, 200);
    // Direct set (no dataset) — fixes broken hero img
    $('#heroPoster').src = posterFor(f);
    $('#heroPoster').onerror = () => { $('#heroPoster').src = PLACEHOLDER; };
    $('#heroPlayBtn').onclick = () => openModal(f);
  } catch (err) {
    console.warn('initHero error', err);
    $('#heroPoster').src = PLACEHOLDER;
  }
}

/* init */
async function init() {
  // search listeners
  $('#searchButton').addEventListener('click', () => doSearch($('#searchInput').value));
  $('#searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(e.target.value); });
  $('#searchInput').addEventListener('input', e => { if (!e.target.value.trim()) showHome(); });

  // logo/title -> home
  const logo = document.querySelector('.logo');
  if (logo) logo.addEventListener('click', () => { $('#searchInput').value = ''; showHome(); });
  const title = document.querySelector('h1');
  if (title) title.addEventListener('click', () => { $('#searchInput').value = ''; showHome(); });

  // overlay close outside
  overlay.addEventListener('click', e => { if (e.target === overlay) hideOverlay(); });

  await initHero();
  await loadRows();
}

init();
