// StreamHub v3 — Material upgrade
// Drop this as app.js in your repo root (index.html loads it).
// Set TMDB key to use live data: const TMDB_API_KEY = '<YOUR_KEY>';
// If left blank, the app uses MOCK_DATA with demo rows.

const TMDB_API_KEY = '1c161f19e296f253fed30df0a8bd7d93'; // <- put your TMDB API key here to enable real data
const MOCK_DATA = !TMDB_API_KEY;
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BASE = 'https://api.themoviedb.org/3';

const rowsContainer = document.getElementById('rows');
const searchResultsSection = document.getElementById('search-results-section');
const searchResults = document.getElementById('search-results');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

const heroTitle = document.getElementById('heroTitle');
const heroDesc = document.getElementById('heroDesc');
const heroPoster = document.getElementById('heroPoster');
const heroPlayBtn = document.getElementById('heroPlayBtn');
const heroMoreBtn = document.getElementById('heroMoreBtn');

const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

// small demo dataset used when MOCK_DATA==true
const DEMO_ROWS = [
  { title: 'Neon Picks', items: [
      { id: 10001, title: 'Glow Streets', poster: 'https://placehold.co/400x600/7f5dff/fff', overview: 'Neon-lit streets, synthwave beats.' },
      { id: 10002, title: 'Cyber Jungle', poster: 'https://placehold.co/400x600/3fd0ff/fff', overview: 'Wild jungle in a neon city.'}
    ]
  },
  { title: 'Fresh Colors', items: [
      { id: 10011, title: 'Pulse Runner', poster:'https://placehold.co/400x600/ff3f7f/fff', overview: 'Runner across pulsing skylines.'},
      { id: 10012, title: 'Aesthetic Sky', poster:'https://placehold.co/400x600/7f5dff/fff', overview: 'A sky painted by neon.'}
    ]
  },
  { title: 'Trending Now', items: [
      { id: 10021, title: 'Documentary: Color Burst', poster:'https://placehold.co/600x340/ff3f7f/fff', overview:'Vibrant journey through neon worlds.'}
    ]
  }
];

// fetch wrapper for TMDB
async function tmdbFetch(path, params = {}) {
  if (MOCK_DATA) return null;
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_API_KEY);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('TMDB error ' + res.status);
  return res.json();
}

// utilities
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'html') node.innerHTML = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  for (const c of children) if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

// build a row
function renderRow(title, items=[]) {
  const section = el('section', {class:'card-section'});
  const header = el('div', {class:'row-title'}, el('h3', {}, title));
  const row = el('div', {class:'row'});
  items.forEach(it => row.appendChild(tileForItem(it)));
  section.appendChild(header);
  section.appendChild(row);
  rowsContainer.appendChild(section);
}

// tile card for movie/show
function tileForItem(it) {
  const poster = it.poster || (it.poster_path ? IMAGE_BASE + it.poster_path : 'fallback.png');
  const tile = el('article', {class:'tile', role:'button', tabindex:0});
  const img = el('img', {class:'poster', src: poster, alt: it.title || it.name});
  img.onerror = () => img.src = 'fallback.png';
  const meta = el('div', {class:'meta'}, el('div',{class:'title'}, it.title || it.name || 'Untitled'), el('div',{class:'extra small'}, (it.release_date||it.first_air_date||'').slice(0,4)));
  tile.appendChild(img); tile.appendChild(meta);

  tile.addEventListener('click', ()=> openDetail(it));
  tile.addEventListener('keydown', (e)=> { if (e.key === 'Enter') openDetail(it); });
  return tile;
}

// open detail modal
async function openDetail(it) {
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
  modalBody.innerHTML = ''; // clear

  const left = el('div', {class:'md-left'}, el('img',{src: it.poster || (it.poster_path ? IMAGE_BASE+it.poster_path : 'fallback.png'), class:'poster', alt:it.title||it.name}));
  const right = el('div', {class:'md-right'});
  right.appendChild(el('h2',{id:'modalTitle'}, it.title || it.name || 'Untitled'));
  right.appendChild(el('p', {class:'small'}, it.overview || it.tagline || 'No description available.'));
  right.appendChild(el('div',{style:'margin:12px 0'}, el('button',{id:'playBtn'}, 'Play trailer')));

  modalBody.appendChild(left); modalBody.appendChild(right);

  // load trailer (TMDB videos) if available
  const playBtn = document.getElementById('playBtn');
  playBtn.onclick = async () => {
    right.querySelector('.player-embed')?.remove();
    const embed = el('div',{class:'player-embed'}, 'Loading trailer...');
    right.appendChild(embed);
    try {
      let videos = null;
      if (!MOCK_DATA) {
        const path = (it.media_type === 'tv' || it.first_air_date) ? `/tv/${it.id}/videos` : `/movie/${it.id}/videos`;
        const json = await tmdbFetch(path);
        videos = json && json.results ? json.results : [];
      }
      const yt = (videos || []).find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || null;
      if (yt) {
        embed.innerHTML = `<iframe src="https://www.youtube.com/embed/${yt.key}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
      } else {
        // fallback to demo clip or show message
        embed.innerHTML = `<div style="padding:18px;color:var(--muted)">Trailer not found. Playing demo clip.</div><video controls playsinline style="width:100%;height:100%"><source src="videos/vid1.mp4" type="video/mp4">Your browser doesn't support video playback.</video>`;
      }
    } catch (err) {
      console.warn('Trailer load failed', err);
      const embedErr = el('div',{class:'player-embed'}, 'Could not load trailer — demo clip shown.');
      right.appendChild(embedErr);
    }
  };
}

// close modal
modalClose.onclick = () => {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  modalBody.innerHTML = '';
};
modal.addEventListener('click', (ev) => {
  if (ev.target === modal) { modalClose.click(); }
});

// hero click actions
heroPlayBtn.onclick = ()=> {
  // open the first available item in demo or first row
  const firstTile = document.querySelector('.tile');
  if (firstTile) firstTile.click();
};
heroMoreBtn.onclick = ()=> {
  // show modal with hero content (no-op if hero not set)
  const t = heroTitle.dataset.item ? JSON.parse(heroTitle.dataset.item) : null;
  if (t) openDetail(t);
};

// search
searchBtn.onclick = () => runSearch(searchInput.value);
searchInput.addEventListener('keydown', (e)=> { if (e.key === 'Enter') runSearch(searchInput.value); });
async function runSearch(q) {
  if (!q || !q.trim()) return;
  searchResults.innerHTML = '';
  searchResultsSection.hidden = false;
  try {
    if (MOCK_DATA) {
      // trivial fuzzy search over DEMO_ROWS
      const ql = q.toLowerCase();
      const items = DEMO_ROWS.flatMap(r => r.items).filter(i => (i.title || '').toLowerCase().includes(ql));
      if (items.length === 0) searchResults.appendChild(el('div',{}, 'No results.'));
      else items.forEach(it => searchResults.appendChild(tileForItem(it)));
      return;
    }
    // use TMDB multi search
    const data = await tmdbFetch('/search/multi', {query:q, language:'en-US', page:1});
    (data.results || []).forEach(it => {
      if (it.media_type === 'person') return;
      searchResults.appendChild(tileForItem(it));
    });
  } catch (err) {
    console.error(err);
    searchResults.appendChild(el('div',{}, 'Search failed.'));
  }
}

// initial render
async function init() {
  rowsContainer.innerHTML = '';

  // set a default hero
  heroTitle.textContent = 'Featured — Color Burst';
  heroDesc.textContent = 'A material-styled demo: click a poster to open details & trailer.';
  heroPoster.src = 'https://placehold.co/600x340/ff3f7f/fff';

  if (MOCK_DATA) {
    DEMO_ROWS.forEach(r => renderRow(r.title, r.items));
    // set first hero item meta
    const first = DEMO_ROWS[0].items[0];
    heroTitle.dataset.item = JSON.stringify(first);
    heroPoster.src = first.poster;
    heroDesc.textContent = first.overview;
    return;
  }

  // live TMDB rows: popular movies, popular TV, trending
  try {
    const [movies, tv, trending] = await Promise.all([
      tmdbFetch('/movie/popular', {language:'en-US', page:1}),
      tmdbFetch('/tv/popular', {language:'en-US', page:1}),
      tmdbFetch('/trending/all/week', {language:'en-US', page:1})
    ]);
    if (movies && movies.results) renderRow('Popular Movies', movies.results.slice(0,12));
    if (tv && tv.results) renderRow('Popular TV', tv.results.slice(0,12));
    if (trending && trending.results) renderRow('Trending This Week', trending.results.slice(0,12));

    // hero set to first trending if available
    const f = (trending.results && trending.results[0]) || (movies.results && movies.results[0]);
    if (f) {
      heroTitle.textContent = f.title || f.name || 'Featured';
      heroDesc.textContent = (f.overview || '').slice(0,200);
      heroPoster.src = f.poster_path ? IMAGE_BASE + f.poster_path : 'fallback.png';
      heroTitle.dataset.item = JSON.stringify(f);
    }
  } catch (err) {
    console.error('Init failed', err);
    // fallback to mock rows if TMDB failed
    DEMO_ROWS.forEach(r => renderRow(r.title, r.items));
  }
}

// kick off
init();
