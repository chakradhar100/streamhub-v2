// StreamHub v3 — Material upgrade + dedicated player page (Option C)
// Place this as app.js in repo root. Set TMDB_API_KEY to use live data.

const TMDB_API_KEY = '1c161f19e296f253fed30df0a8bd7d93'; // <-- set your TMDB API key here to enable live TMDB data
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

const PLAYER_PAGE = 'player.html';

// Demo dataset used when MOCK_DATA==true
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

async function tmdbFetch(path, params = {}) {
  if (MOCK_DATA) return null;
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_API_KEY);
  for (const k in params) url.searchParams.set(k, params[k]);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('TMDB error ' + res.status);
  return res.json();
}

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

function renderRow(title, items=[]) {
  const section = el('section', {class:'card-section'});
  const header = el('div', {class:'row-title'}, el('h3', {}, title));
  const row = el('div', {class:'row'});
  items.forEach(it => row.appendChild(tileForItem(it)));
  section.appendChild(header);
  section.appendChild(row);
  rowsContainer.appendChild(section);
}

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

/* ---- OPEN DETAIL (modal) ----
   This modal contains:
   - Title/overview/poster
   - Trailer button (YouTube via TMDB videos)
   - Season & Episode pickers (for TV)
   - Play button — which opens dedicated player page (player.html) with query params
*/
async function openDetail(it) {
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
  modalBody.innerHTML = '';

  const isTV = it.media_type === 'tv' || it.first_air_date;
  const left = el('div', { class:'md-left' },
    el('img',{
      src: it.poster || (it.poster_path ? IMAGE_BASE+it.poster_path : 'fallback.png'),
      class:'poster', alt: it.title || it.name
    })
  );

  const right = el('div', { class:'md-right' });
  right.appendChild(el('h2', { id:'modalTitle' }, it.title || it.name));
  right.appendChild(el('p', { class:'small' }, it.overview || 'No description available.'));

  // trailer button
  const trailerBtn = el('button', { id: "trailerBtn", class: "trailer-btn" }, "Watch Trailer");

  // player controls area (but dedicated player page will be used)
  const controlsWrap = el('div', { style: 'margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;' });

  // TV: season + episode selects
  let seasonSelect = null, episodeSelect = null;
  if (isTV) {
    seasonSelect = el('select', { id: "seasonSelect" });
    episodeSelect = el('select', { id: "episodeSelect" });
    controlsWrap.appendChild(el('label', {}, 'Season:'));
    controlsWrap.appendChild(seasonSelect);
    controlsWrap.appendChild(el('label', {}, 'Episode:'));
    controlsWrap.appendChild(episodeSelect);
  }

  // Play button: opens dedicated player page
  const playBtn = el('button', { id: "playBtn", class:'play-btn' }, isTV ? 'Play Episode (open player page)' : 'Play Movie (open player page)');

  controlsWrap.appendChild(playBtn);
  controlsWrap.appendChild(trailerBtn);
  right.appendChild(controlsWrap);

  modalBody.appendChild(left);
  modalBody.appendChild(right);

  // load seasons & episodes if TV
  if (isTV) {
    await loadSeasons(it.id, seasonSelect, episodeSelect);
  }

  // trailer button logic (loads trailer inline in modal below controls)
  trailerBtn.onclick = async () => {
    // create area for trailer if not exists
    let trailerArea = right.querySelector('.player-embed.trailer-area');
    if (!trailerArea) {
      trailerArea = el('div',{class:'player-embed trailer-area', style:'margin-top:12px;min-height:200px;'});
      right.appendChild(trailerArea);
    }
    trailerArea.innerHTML = 'Loading trailer...';

    try {
      if (MOCK_DATA) {
        trailerArea.innerHTML = `<video controls style="width:100%;height:100%"><source src="videos/vid1.mp4" type="video/mp4"></video>`;
        return;
      }
      const path = isTV ? `/tv/${it.id}/videos` : `/movie/${it.id}/videos`;
      const json = await tmdbFetch(path);
      const vids = (json && json.results) ? json.results : [];
      const yt = vids.find(v => v.site === 'YouTube' && v.type === 'Trailer') || vids.find(v=>v.site==='YouTube');
      if (yt) {
        trailerArea.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${yt.key}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        trailerArea.innerHTML = `<div style="padding:18px;color:var(--muted)">Trailer not found.</div>`;
      }
    } catch (err) {
      console.warn('Trailer load failed', err);
      trailerArea.innerHTML = `<div style="padding:18px;color:var(--muted)">Trailer unavailable.</div>`;
    }
  };

  // Play button — open the dedicated player page (Option C)
  playBtn.onclick = async () => {
    try {
      let imdb = null;
      if (MOCK_DATA) {
        imdb = 'tt4154796'; // demo
      } else {
        if (isTV) {
          // resolve episode imdb (using selected season & episode)
          const s = seasonSelect.value || 1;
          const e = episodeSelect.value || 1;
          const episodeData = await tmdbFetch(`/tv/${it.id}/season/${s}/episode/${e}`);
          imdb = episodeData && episodeData.imdb_id;
          if (!imdb) {
            alert('IMDB ID not found for that episode.');
            return;
          }
          // open player page with s & e
          const url = `${PLAYER_PAGE}?imdb=${encodeURIComponent(imdb)}&type=tv&s=${encodeURIComponent(s)}&e=${encodeURIComponent(e)}`;
          window.location.href = url;
        } else {
          const movieData = await tmdbFetch(`/movie/${it.id}`);
          imdb = movieData && movieData.imdb_id;
          if (!imdb) { alert('IMDB ID not found for movie.'); return; }
          const url = `${PLAYER_PAGE}?imdb=${encodeURIComponent(imdb)}&type=movie`;
          window.location.href = url;
        }
      }

      // if mock mode - open player page with demo imdb
      if (MOCK_DATA) {
        if (isTV) {
          window.open(`${PLAYER_PAGE}?imdb=${imdb}&type=tv&s=1&e=1`, '_blank');
        } else {
          window.open(`${PLAYER_PAGE}?imdb=${imdb}&type=movie`, '_blank');
        }
      }
    } catch (err) {
      console.error('Play open failed', err);
      alert('Could not open player page.');
    }
  };
}

async function loadSeasons(tvId, seasonSelect, episodeSelect) {
  if (MOCK_DATA) {
    seasonSelect.innerHTML = `<option value="1">Season 1</option>`;
    episodeSelect.innerHTML = `<option value="1">Episode 1</option>`;
    return;
  }
  try {
    const show = await tmdbFetch(`/tv/${tvId}`);
    seasonSelect.innerHTML = '';
    (show.seasons || []).forEach(s => {
      if (s.season_number > 0) seasonSelect.innerHTML += `<option value="${s.season_number}">Season ${s.season_number}</option>`;
    });
    // load episodes for first season
    loadEpisodes(tvId, seasonSelect.value, episodeSelect);
    seasonSelect.onchange = () => loadEpisodes(tvId, seasonSelect.value, episodeSelect);
  } catch (err) {
    console.warn('loadSeasons failed', err);
    seasonSelect.innerHTML = `<option value="1">Season 1</option>`;
    episodeSelect.innerHTML = `<option value="1">Episode 1</option>`;
  }
}

async function loadEpisodes(tvId, seasonNumber, episodeSelect) {
  if (MOCK_DATA) {
    episodeSelect.innerHTML = `<option value="1">Episode 1</option>`;
    return;
  }
  try {
    const season = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
    episodeSelect.innerHTML = '';
    (season.episodes || []).forEach(ep => {
      episodeSelect.innerHTML += `<option value="${ep.episode_number}">Episode ${ep.episode_number}: ${ep.name}</option>`;
    });
  } catch (err) {
    console.warn('loadEpisodes failed', err);
    episodeSelect.innerHTML = `<option value="1">Episode 1</option>`;
  }
}

// modal close behavior
const modalCloseBtn = document.getElementById('modalClose');
modalCloseBtn.onclick = () => { modal.style.display='none'; modal.setAttribute('aria-hidden','true'); modalBody.innerHTML=''; };
modal.addEventListener('click', (ev)=> { if (ev.target === modal) modalCloseBtn.click(); });

// hero actions
document.getElementById('heroPlayBtn').onclick = () => {
  const firstTile = document.querySelector('.tile');
  if (firstTile) firstTile.click();
};

// search
document.getElementById('search-btn').onclick = () => runSearch(searchInput.value);
searchInput.addEventListener('keydown', (e)=> { if (e.key === 'Enter') runSearch(searchInput.value); });

async function runSearch(q) {
  if (!q || !q.trim()) return;
  searchResults.innerHTML = '';
  searchResultsSection.hidden = false;
  try {
    if (MOCK_DATA) {
      const ql = q.toLowerCase();
      const items = DEMO_ROWS.flatMap(r => r.items).filter(i => (i.title || '').toLowerCase().includes(ql));
      if (items.length === 0) searchResults.appendChild(el('div',{}, 'No results.'));
      else items.forEach(it => searchResults.appendChild(tileForItem(it)));
      return;
    }
    const data = await tmdbFetch('/search/multi', {query:q, language:'en-US', page:1});
    (data.results || []).forEach(it => { if (it.media_type === 'person') return; searchResults.appendChild(tileForItem(it)); });
  } catch (err) {
    console.error(err);
    searchResults.appendChild(el('div',{}, 'Search failed.'));
  }
}

// init
async function init() {
  rowsContainer.innerHTML = '';

  // default hero text & poster
  heroTitle.textContent = 'Featured — Color Burst';
  heroDesc.textContent = 'A material-styled demo: click a poster to open details & trailer or open the player page.';
  heroPoster.src = 'https://placehold.co/600x340/ff3f7f/fff';

  if (MOCK_DATA) {
    DEMO_ROWS.forEach(r => renderRow(r.title, r.items));
    const first = DEMO_ROWS[0].items[0];
    heroTitle.dataset.item = JSON.stringify(first);
    heroPoster.src = first.poster;
    heroDesc.textContent = first.overview;
    return;
  }

  try {
    const [movies, tv, trending] = await Promise.all([
      tmdbFetch('/movie/popular', {language:'en-US', page:1}),
      tmdbFetch('/tv/popular', {language:'en-US', page:1}),
      tmdbFetch('/trending/all/week', {language:'en-US', page:1})
    ]);
    if (movies && movies.results) renderRow('Popular Movies', movies.results.slice(0,12));
    if (tv && tv.results) renderRow('Popular TV', tv.results.slice(0,12));
    if (trending && trending.results) renderRow('Trending This Week', trending.results.slice(0,12));

    const f = (trending && trending.results && trending.results[0]) || (movies && movies.results && movies.results[0]);
    if (f) {
      heroTitle.textContent = f.title || f.name || 'Featured';
      heroDesc.textContent = (f.overview || '').slice(0,200);
      heroPoster.src = f.poster_path ? IMAGE_BASE + f.poster_path : 'fallback.png';
      heroTitle.dataset.item = JSON.stringify(f);
    }
  } catch (err) {
    console.error('Init failed', err);
    DEMO_ROWS.forEach(r => renderRow(r.title, r.items));
  }
}

init();
