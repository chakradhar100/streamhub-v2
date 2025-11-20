/* ===== StreamHub v3 — Final app.js (Custom rows) =====
   - Matches your index.html IDs: searchInput, searchButton, searchResults
   - Minimal modal injected into #modalBody
   - Custom rows (Trending Today, Trending Week, Popular Movies, Top Rated Movies,
     Popular TV, Top Rated TV, Action Movies)
   - Works with or without TMDB key (fallback demo data)
*/

/* CONFIG */
const TMDB_KEY = "1c161f19e296f253fed30df0a8bd7d93"; // <-- paste your TMDB key here to enable live TMDB data
const USE_TMDB = Boolean(TMDB_KEY);
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_SIZE = "w342";
const IMAGE_BASE = `https://image.tmdb.org/t/p/${IMAGE_SIZE}`;
const PLAYER_PAGE = "player.html";

/* Placeholders (inline SVG gradient) */
const PLACEHOLDER_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#7f5dff'/>
      <stop offset='100%' stop-color='#3fd0ff'/>
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)' rx='12' ry='12'/>
</svg>`;
const PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(PLACEHOLDER_SVG);

/* UTIL HELPERS */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'html') node.innerHTML = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  children.forEach(c => { if (c != null) node.append(typeof c === 'string' ? document.createTextNode(c) : c); });
  return node;
};

/* IntersectionObserver for lazy images */
const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const img = en.target;
    const src = img.dataset.src;
    if (src) { img.src = src; img.removeAttribute('data-src'); }
    io.unobserve(img);
  });
}, { rootMargin: '250px' }) : null;

/* TMDB fetch wrapper */
async function tmdbFetch(path, params = {}) {
  if (!USE_TMDB) return null;
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_KEY);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

/* DEMO fallback data used when no TMDB key */
const DEMO_ROWS = [
  { title: 'Trending Today', items: [
      { id:111001, media_type:'movie', title:'Neon Drift', poster:PLACEHOLDER, overview:'Fast cars in neon city.' },
      { id:111002, media_type:'tv', name:'Glow Nights', poster:PLACEHOLDER, overview:'Anthology of night streets.' }
    ]
  },
  { title: 'Trending This Week', items: [
      { id:112001, media_type:'movie', title:'Midnight Pulse', poster:PLACEHOLDER, overview:'A pulsing story.' }
    ]
  },
  { title: 'Popular Movies', items: [
      { id:113001, media_type:'movie', title:'Color Burst', poster:PLACEHOLDER, overview:'A visual journey.' }
    ]
  },
  { title: 'Top Rated Movies', items: [
      { id:114001, media_type:'movie', title:'Quiet Stars', poster:PLACEHOLDER, overview:'A quiet drama.' }
    ]
  },
  { title: 'Popular TV', items: [
      { id:115001, media_type:'tv', name:'Night Watch', poster:PLACEHOLDER, overview:'City watchers.' }
    ]
  },
  { title: 'Top Rated TV', items: [
      { id:116001, media_type:'tv', name:'Old Tales', poster:PLACEHOLDER, overview:'Classic retelling.' }
    ]
  },
  { title: 'Action Movies', items: [
      { id:117001, media_type:'movie', title:'Rogue Path', poster:PLACEHOLDER, overview:'Explosive action.' }
    ]
  }
];

/* Build a poster URL (TMDB or fallback) */
function posterFor(item) {
  if (item.poster) return item.poster; // demo objects
  if (item.poster_path) return `${IMAGE_BASE}${item.poster_path}`;
  return PLACEHOLDER;
}

/* Create a tile consistent with your index visuals */
function tileFor(item) {
  const tile = el('article', { class: 'tile', role: 'button', tabindex: 0 });
  const img = el('img', { class: 'poster', alt: (item.title || item.name || 'Untitled'), src: PLACEHOLDER });
  const posterSrc = posterFor(item);
  img.dataset.src = posterSrc;
  img.loading = 'lazy';
  img.onerror = () => { img.src = PLACEHOLDER; img.removeAttribute('data-src'); };
  if (io) io.observe(img);

  const meta = el('div', { class: 'meta' },
    el('div', { class: 'title' }, item.title || item.name || 'Untitled'),
    el('div', { class: 'extra small' }, (item.release_date || item.first_air_date || '').slice(0,4))
  );

  tile.appendChild(img);
  tile.appendChild(meta);

  tile.addEventListener('click', () => openModal(item));
  tile.addEventListener('keydown', (e) => { if (e.key === 'Enter') openModal(item); });

  return tile;
}

/* Render a whole row into #rows container */
function renderRow(title, items = []) {
  const rows = $('#rows');
  const section = el('section', { class: 'card-section' });
  const header = el('div', { class: 'row-title' }, el('h3', {}, title));
  const row = el('div', { class: 'row' });

  items.forEach(it => row.appendChild(tileFor(it)));

  section.appendChild(header);
  section.appendChild(row);
  rows.appendChild(section);
}

/* Load homepage rows (custom selection) */
async function loadRows() {
  $('#rows').innerHTML = '';
  if (!USE_TMDB) {
    // demo fallback
    DEMO_ROWS.forEach(r => renderRow(r.title, r.items));
    return;
  }

  try {
    // custom set:
    // Trending Today, Trending Week, Popular Movies, Top Rated Movies, Popular TV, Top Rated TV, Action Movies
    const [trendDay, trendWeek, popMovies, topMovies, popTV, topTV, actionMovies] = await Promise.all([
      tmdbFetch('/trending/all/day'),
      tmdbFetch('/trending/all/week'),
      tmdbFetch('/movie/popular'),
      tmdbFetch('/movie/top_rated'),
      tmdbFetch('/tv/popular'),
      tmdbFetch('/tv/top_rated'),
      tmdbFetch('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' })
    ]);

    if (trendDay && trendDay.results) renderRow('Trending Today', trendDay.results.slice(0,12));
    if (trendWeek && trendWeek.results) renderRow('Trending This Week', trendWeek.results.slice(0,12));
    if (popMovies && popMovies.results) renderRow('Popular Movies', popMovies.results.slice(0,12));
    if (topMovies && topMovies.results) renderRow('Top Rated Movies', topMovies.results.slice(0,12));
    if (popTV && popTV.results) renderRow('Popular TV', popTV.results.slice(0,12));
    if (topTV && topTV.results) renderRow('Top Rated TV', topTV.results.slice(0,12));
    if (actionMovies && actionMovies.results) renderRow('Action Movies', actionMovies.results.slice(0,12));
  } catch (err) {
    console.warn('Row load failed, using demo rows.', err);
    DEMO_ROWS.forEach(r => renderRow(r.title, r.items));
  }
}

/* SEARCH (Movies + TV only — Option B) */
async function doSearch(q) {
  const out = $('#searchResults');
  out.innerHTML = '<div style="padding:12px;color:var(--muted)">Searching…</div>';
  if (!q || !q.trim()) { out.innerHTML = ''; return; }

  if (!USE_TMDB) {
    const lq = q.toLowerCase();
    const items = DEMO_ROWS.flatMap(r => r.items).filter(i => ((i.title || i.name) || '').toLowerCase().includes(lq));
    out.innerHTML = '';
    if (items.length === 0) out.innerHTML = '<div style="padding:12px;color:var(--muted)">No results.</div>';
    else items.forEach(it => out.appendChild(tileFor(it)));
    return;
  }

  try {
    // use multi search, but filter to movie/tv
    const data = await tmdbFetch('/search/multi', { query: q, page: 1 });
    const results = (data && data.results) ? data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv') : [];
    out.innerHTML = '';
    if (results.length === 0) out.innerHTML = '<div style="padding:12px;color:var(--muted)">No results.</div>';
    else results.forEach(r => out.appendChild(tileFor(r)));
  } catch (err) {
    out.innerHTML = '<div style="padding:12px;color:var(--muted)">Search failed.</div>';
  }
}

/* Hook up search control IDs per your HTML */
$('#searchButton').addEventListener('click', () => {
  const q = $('#searchInput').value;
  doSearch(q);
});
$('#searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(e.target.value); });

/* MODAL (Minimal style) — inject content into #modalBody */
function openModal(item) {
  const modalBody = $('#modalBody');
  modalBody.innerHTML = ''; // clear

  const poster = posterFor(item);
  const left = el('div', { style: 'flex:0 0 240px;margin-right:16px' },
    el('img', { src: poster, class: 'poster', style: 'width:100%;height:auto;border-radius:8px' })
  );

  const right = el('div', { style: 'flex:1;min-width:200px' },
    el('h2', { style: 'margin:0 0 8px 0' }, item.title || item.name || 'Untitled'),
    el('p', { class: 'small', style: 'color:var(--muted);margin:0 0 12px 0' }, item.overview || 'No description.'),
  );

  const controls = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px' });
  const playBtn = el('button', { class: 'play-btn' }, item.media_type === 'tv' ? 'Play Episode (open player)' : 'Play (open player)');
  const trailerBtn = el('button', { class: 'trailer-btn' }, 'Watch Trailer');
  controls.appendChild(playBtn);
  controls.appendChild(trailerBtn);

  // season/episode selectors for TV
  let seasonWrap = null;
  if (item.media_type === 'tv') {
    seasonWrap = el('div', { style: 'margin-top:12px;display:flex;gap:8px;align-items:center' },
      el('label', {}, 'Season:'),
      el('select', { id: 'modalSeasonSelect' }, el('option', { value: '1' }, '1'))
    );
    right.appendChild(seasonWrap);
    // populate seasons if possible (TMDB)
    if (USE_TMDB) {
      tmdbFetch(`/tv/${item.id}`)
        .then(show => {
          const ssel = $('#modalSeasonSelect');
          ssel.innerHTML = '';
          (show.seasons || []).forEach(s => {
            if (s.season_number >= 0) ssel.appendChild(el('option', { value: s.season_number }, `Season ${s.season_number}`));
          });
        }).catch(()=>{});
    }
  }

  right.appendChild(controls);
  const container = el('div', { style: 'display:flex;gap:18px;align-items:flex-start' }, left, right);
  modalBody.appendChild(container);

  // show modal wrapper (your index.html provided .modal and overlay click handler)
  const modal = $('#modal');
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';

  // play redirect
  playBtn.onclick = async () => {
    try {
      // find imdb id from TMDB if we have key, otherwise fallback to a demo id
      if (!USE_TMDB) {
        const demoImdb = 'tt4154796';
        if (item.media_type === 'tv') window.open(`${PLAYER_PAGE}?imdb=${demoImdb}&type=tv&s=1&e=1`, '_blank');
        else window.open(`${PLAYER_PAGE}?imdb=${demoImdb}&type=movie`, '_blank');
        return;
      }

      if (item.media_type === 'movie') {
        // fetch movie details for imdb_id
        const det = await tmdbFetch(`/movie/${item.id}`);
        const imdb = det && det.imdb_id;
        if (!imdb) { alert('IMDB ID not found for this movie'); return; }
        window.open(`${PLAYER_PAGE}?imdb=${encodeURIComponent(imdb)}&type=movie`, '_blank');
      } else {
        const season = (document.getElementById('modalSeasonSelect') && document.getElementById('modalSeasonSelect').value) || 1;
        // fetch episode to extract imdb id if available (we'll pick episode 1 by default)
        try {
          const ep = await tmdbFetch(`/tv/${item.id}/season/${season}/episode/1`);
          const imdb = ep && ep.imdb_id;
          if (!imdb) { alert('IMDB ID not found for that episode'); return; }
          window.open(`${PLAYER_PAGE}?imdb=${encodeURIComponent(imdb)}&type=tv&s=${season}&e=1`, '_blank');
        } catch (err) {
          alert('Could not load episode details.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Could not open player.');
    }
  };

  // trailer open
  trailerBtn.onclick = async () => {
    if (!USE_TMDB) {
      window.open('https://www.youtube.com/', '_blank');
      return;
    }
    try {
      const path = (item.media_type === 'movie') ? `/movie/${item.id}/videos` : `/tv/${item.id}/videos`;
      const j = await tmdbFetch(path);
      const vids = (j && j.results) ? j.results : [];
      const yt = vids.find(v => v.site === 'YouTube' && v.type === 'Trailer') || vids.find(v => v.site === 'YouTube');
      if (yt) window.open(`https://www.youtube.com/watch?v=${yt.key}`, '_blank');
      else alert('Trailer not found.');
    } catch (err) {
      alert('Trailer fetch failed.');
    }
  };
}

/* Close modal when clicking outside or using modal-close if exists */
(function modalCloseSetup(){
  const modal = $('#modal');
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      $('#modalBody').innerHTML = '';
    }
  });
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    $('#modalBody').innerHTML = '';
  });
})();

/* Initialize hero (simple) */
function initHero() {
  const heroTitle = $('#heroTitle');
  const heroDesc = $('#heroDesc');
  const heroPoster = $('#heroPoster');

  if (!heroTitle || !heroDesc || !heroPoster) return;

  if (!USE_TMDB) {
    heroTitle.textContent = 'Featured — Neon Drift';
    heroDesc.textContent = 'A demo hero — click posters to explore.';
    heroPoster.src = PLACEHOLDER;
    return;
  }

  // Attempt to set a featured item from trending day
  tmdbFetch('/trending/all/day').then(j => {
    const f = j && j.results && j.results[0];
    if (!f) return;
    heroTitle.textContent = (f.title || f.name || 'Featured');
    heroDesc.textContent = (f.overview || '').slice(0,200);
    const p = posterFor(f);
    heroPoster.dataset.src = p;
    if (io && heroPoster) io.observe(heroPoster);
  }).catch(()=>{});
}

/* Initialize the whole app */
async function init() {
  initHero();
  await loadRows();

  // Hook search placeholders / startup state
  $('#searchResults').innerHTML = '';
  $('#searchInput').placeholder = 'Search movies, shows...';
}

/* Start */
init();

/* Prevent popup abuse from embed pages */
window.open = function(){ console.log('popup blocked'); return null; };
