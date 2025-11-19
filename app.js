// StreamHub V7 - Neon UI with OMDb lookup and safe embed placeholder
// IMPORTANT: You must obtain an OMDb API key (http://www.omdbapi.com/) and paste it in Settings.
// This code stores your API key & embed base in localStorage (browser only).

/* ---------- Helpers ---------- */
const $ = sel => document.querySelector(sel);
const debounce = (fn, delay=350) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), delay); };
};

/* ---------- Elements ---------- */
const searchInput = $('#searchInput');
const results = $('#results');
const settingsBtn = $('#settingsBtn');
const settingsModal = $('#settingsModal');
const closeSettings = $('#closeSettings');
const saveSettings = $('#saveSettings');
const clearSettings = $('#clearSettings');
const omdbInput = $('#omdbKey');
const embedBaseInput = $('#embedBase');

const picker = $('#pickerBar');
const pickerInfo = $('#pickerInfo');
const seasonEpisode = $('#seasonEpisode');
const seasonInput = $('#seasonInput');
const episodeInput = $('#episodeInput');
const embedBtn = $('#embedBtn');

const playerModal = $('#playerModal');
const playerFrame = $('#playerFrame');
const closePlayer = $('#closePlayer');

/* ---------- State ---------- */
let lastResults = [];
let selectedItem = null;

/* ---------- Settings load/save ---------- */
function loadSettings(){
  const key = localStorage.getItem('sh_omdb_key') || '';
  const embedBase = localStorage.getItem('sh_embed_base') || 'https://your-embed-provider.example/embed';
  omdbInput.value = key;
  embedBaseInput.value = embedBase;
}
function saveSettingsHandler(){
  localStorage.setItem('sh_omdb_key', omdbInput.value.trim());
  localStorage.setItem('sh_embed_base', embedBaseInput.value.trim() || 'https://your-embed-provider.example/embed');
  settingsModal.classList.remove('show');
  alert('Settings saved locally.');
}
function clearSettingsHandler(){
  localStorage.removeItem('sh_omdb_key');
  localStorage.removeItem('sh_embed_base');
  omdbInput.value = '';
  embedBaseInput.value = '';
  alert('Settings cleared.');
}

/* ---------- OMDb Search ---------- */
async function omdbSearch(query){
  const key = localStorage.getItem('sh_omdb_key') || '';
  if(!key) {
    // If no key, show friendly message and don't call API
    results.innerHTML = `
      <div class="grid">
        <div class="card">
          <div class="title">OMDb API key required</div>
          <div class="meta muted">Open Settings (⚙️) and paste your OMDb API key.</div>
        </div>
      </div>
    `;
    return;
  }

  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&s=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if(data.Response === "True"){
      // For each result, fetch full details to get imdbID (sometimes extra fields)
      const items = await Promise.all(data.Search.map(async r => {
        const resp = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(r.imdbID)}&plot=short`);
        return resp.json();
      }));
      lastResults = items;
      renderResults(items);
    } else {
      results.innerHTML = `<div class="grid"><div class="card"><div class="title">No results</div><div class="meta muted">${data.Error || 'Try a different title'}</div></div></div>`;
    }
  } catch(e){
    results.innerHTML = `<div class="grid"><div class="card"><div class="title">Network error</div><div class="meta muted">${e.message}</div></div></div>`;
  }
}

/* ---------- Render ---------- */
function renderResults(items){
  if(!items || items.length === 0){
    results.innerHTML = `<div class="grid"><div class="card"><div class="title">No results</div></div></div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    const poster = (item.Poster && item.Poster !== 'N/A') ? item.Poster : `https://placehold.co/400x600/0b0b12/ffffff?text=${encodeURIComponent(item.Title)}`;
    card.innerHTML = `
      <img class="poster" src="${poster}" alt="${escapeHtml(item.Title)}" />
      <div class="title">${escapeHtml(item.Title)}</div>
      <div class="meta">${escapeHtml(item.Year)} • ${escapeHtml(item.Type)}</div>
      <div class="meta muted">IMDB: ${escapeHtml(item.imdbID)}</div>
    `;
    card.onclick = () => selectItem(item);
    grid.appendChild(card);
  });

  results.innerHTML = '';
  results.appendChild(grid);
  // smooth scroll to results
  window.scrollTo({ top: results.offsetTop - 10, behavior: 'smooth' });
}

/* ---------- Select item (shows bottom picker) ---------- */
function selectItem(item){
  selectedItem = item;
  picker.classList.remove('hidden');
  pickerInfo.innerHTML = `<strong>${escapeHtml(item.Title)}</strong> <span class="muted">• ${escapeHtml(item.Type)} • ${escapeHtml(item.imdbID)}</span>`;

  // show season/episode only when type is "series"
  if(item.Type && item.Type.toLowerCase() === 'series'){
    seasonEpisode.classList.remove('hidden');
  } else {
    seasonEpisode.classList.add('hidden');
  }
}

/* ---------- Embed URL generator (safe placeholder) ---------- */
function generateEmbedURL({ imdb, season=null, episode=null, type }){
  // embed base from settings
  const base = localStorage.getItem('sh_embed_base') || 'https://your-embed-provider.example/embed';
  if(!imdb) return '';
  // movie
  if(type === 'movie') return `${base}/movie?imdb=${encodeURIComponent(imdb)}`;
  // series: require season & episode (if not provided, send season=1&episode=1 as fallback)
  const s = season ? Number(season) : 1;
  const e = episode ? Number(episode) : 1;
  return `${base}/tv?imdb=${encodeURIComponent(imdb)}&season=${encodeURIComponent(s)}&episode=${encodeURIComponent(e)}`;
}

/* ---------- Open embed player ---------- */
function openEmbed(){
  if(!selectedItem) return;
  const type = selectedItem.Type === 'movie' ? 'movie' : 'series';
  const imdb = selectedItem.imdbID;
  const season = seasonInput.value || null;
  const episode = episodeInput.value || null;

  const url = generateEmbedURL({ imdb, season, episode, type });
  if(!url){
    alert('Embed base not configured. Open Settings and set embed base URL.');
    return;
  }

  // open iframe modal
  playerFrame.src = url;
  playerModal.classList.add('show');
}

/* ---------- Utility ---------- */
function escapeHtml(s){
  return (s+'').replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ---------- Event wiring ---------- */
const debouncedSearch = debounce((q)=>{
  if(!q || q.trim().length < 2){
    results.innerHTML = `<div class="grid"><div class="card"><div class="title">Type at least 2 letters to search</div></div></div>`;
    return;
  }
  omdbSearch(q.trim());
}, 420);

searchInput.addEventListener('input', e => debouncedSearch(e.target.value));
settingsBtn.addEventListener('click', ()=>{ settingsModal.classList.add('show'); loadSettings(); });
closeSettings.addEventListener('click', ()=>settingsModal.classList.remove('show'));
saveSettings.addEventListener('click', saveSettingsHandler);
clearSettings.addEventListener('click', clearSettingsHandler);

embedBtn.addEventListener('click', openEmbed);
closePlayer.addEventListener('click', ()=>{
  playerModal.classList.remove('show');
  playerFrame.src = '';
});

// close modals clicking outside
document.addEventListener('click', (ev)=>{
  if(ev.target === settingsModal) settingsModal.classList.remove('show');
  if(ev.target === playerModal) { playerModal.classList.remove('show'); playerFrame.src=''; }
});

/* ---------- Startup ---------- */
function init(){
  loadSettings();
  // initial helpful message
  results.innerHTML = `<div class="grid"><div class="card"><div class="title">Welcome</div><div class="meta muted">Type a title to search IMDb via OMDb. Example: "Inception", "Breaking Bad".</div></div></div>`;
  // attach references for picker inputs (they are in DOM even if hidden)
  // (we accessed them earlier)
}
init();
