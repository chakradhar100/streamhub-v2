/* StreamHub Premium — app.js
   - TMDB optional (set TMDB_KEY)
   - Homepage rows: Trending Today, Popular Movies, Action Movies, Popular TV, Sci-Fi TV
   - Search (movies + TV), minimal modal, lazy images, gradient placeholders
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
    // fallback minimal demo
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
    const demoAll = []; // flatten rows already present
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

/* Minimal modal (placed into #modalBody) */
function openModal(item) {
  const body = $('#modalBody');
  body.innerHTML = '';
  const poster = posterFor(item);
  const left = el('div', { style: 'flex:0 0 240px' }, el('img', { src: poster, class: 'poster' }));
  const info = el('div', { class: 'info' },
    el('h2', {}, item.title || item.name || 'Untitled'),
    el('p', { class: 'small', style: 'color:var(--muted)' }, item.overview || 'No description available.')
  );
  const controls = el('div', { style: 'margin-top:12px;display:flex;gap:8px' });
  const playBtn = el('button', { class: 'play-btn' }, item.media_type === 'tv' ? 'Play Episode' : 'Play');
  const trailerBtn = el('button', { class: 'trailer-btn' }, 'Watch Trailer');
  controls.append(playBtn, trailerBtn);
  info.append(controls);

  if (item.media_type === 'tv') {
    const seasonWrap = el('div', { style: 'margin-top:12px;display:flex;gap:8px;align-items:center' }, el('label', {}, 'Season:'), el('select', { id: 'modalSeason' }, el('option', { value: '1' }, '1')));
    info.append(seasonWrap);
    if (USE_TMDB) {
      tmdbFetch(`/tv/${item.id}`).then(s => {
        const sel = $('#modalSeason');
        sel.innerHTML = '';
        (s.seasons || []).forEach(se => { if (se.season_number >= 0) sel.appendChild(el('option', { value: se.season_number }, `Season ${se.season_number}`)); });
      }).catch(()=>{});
    }
  }

  const container = el('div', { class: 'modal-body' }, left, info);
  body.appendChild(container);

  const modal = $('#modal');
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');

  playBtn.onclick = async () => {
    if (!USE_TMDB) { window.open(`${PLAYER_PAGE}?imdb=tt4154796&type=movie`, '_blank'); return; }
    try {
      if (item.media_type === 'movie') {
        const d = await tmdbFetch(`/movie/${item.id}`);
        const imdb = d && d.imdb_id;
        if (!imdb) { alert('IMDB ID not found'); return; }
        window.open(`${PLAYER_PAGE}?imdb=${encodeURIComponent(imdb)}&type=movie`, '_blank');
      } else {
        const season = (document.getElementById('modalSeason') && document.getElementById('modalSeason').value) || 1;
        try {
          const ep = await tmdbFetch(`/tv/${item.id}/season/${season}/episode/1`);
          const imdb = ep && ep.imdb_id;
          if (!imdb) { alert('IMDB ID not found for episode'); return; }
          window.open(`${PLAYER_PAGE}?imdb=${encodeURIComponent(imdb)}&type=tv&s=${season}&e=1`, '_blank');
        } catch { alert('Episode details unavailable'); }
      }
    } catch (err) { alert('Could not open player'); }
  };

  trailerBtn.onclick = async () => {
    if (!USE_TMDB) { window.open('https://www.youtube.com/', '_blank'); return; }
    try {
      const path = item.media_type === 'movie' ? `/movie/${item.id}/videos` : `/tv/${item.id}/videos`;
      const j = await tmdbFetch(path);
      const v = (j && j.results) ? j.results.find(x => x.site === 'YouTube' && x.type === 'Trailer') || j.results.find(x => x.site === 'YouTube') : null;
      if (v) window.open(`https://www.youtube.com/watch?v=${v.key}`, '_blank'); else alert('Trailer not found');
    } catch { alert('Trailer fetch failed'); }
  };
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
  }).catch(()=>{});
}

/* init */
async function init() {
  initHero();
  await loadRows();
  $('#searchResults').innerHTML = '';
  $('#searchInput').placeholder = 'Search movies & TV...';
}

/* safe popup blocker */
window.open = function(){ console.log('popup blocked'); return null; };

/* start */
init();
