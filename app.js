// StreamHub — No-API-key version using vidsrc public endpoints
// Search:  https://vidsrc.to/search/?q=QUERY
// Meta:    https://vidsrc.to/meta/movie/ttXXXX  or /meta/tv/ttXXXX
// Embed:   https://vidsrc-embed.ru/embed/movie?imdb=ttXXXX
//          https://vidsrc-embed.ru/embed/tv?imdb=ttXXXX&season=1&episode=1

console.log("StreamHub (no API key) loaded");

// DOM
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const samplesBox = document.getElementById('samples');
const resultsBox = document.getElementById('results');

const playerModal = document.getElementById('playerModal');
const playerFrame = document.getElementById('playerFrame');
const playerTitle = document.getElementById('playerTitle');
const debugLog = document.getElementById('debugLog');
const tvControls = document.getElementById('tvControls');
const seasonInput = document.getElementById('seasonInput');
const episodeInput = document.getElementById('episodeInput');
const loadEpisodeBtn = document.getElementById('loadEpisodeBtn');
const nextEpBtn = document.getElementById('nextEpBtn');
const copyUrlBtn = document.getElementById('copyUrl');
const closePlayerBtn = document.getElementById('closePlayer');

// small helper
function log(msg){
  console.log(msg);
  if(debugLog) debugLog.innerText += msg + "\n";
}
function clearLog(){ if(debugLog) debugLog.innerText = ""; }
function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }

// sample IMDB ids to show on home page (popular)
const SAMPLE_IMDB = ["tt0816692","tt1375666","tt0111161","tt0944947"]; // Interstellar, Inception, Shawshank, GoT

// ---------- SEARCH (vidsrc public) ----------
async function vidsrcSearch(query){
  const clean = (query||'').trim();
  if(!clean) return [];
  const url = `https://vidsrc.to/search/?q=${encodeURIComponent(clean)}`;
  log("[SEARCH] " + url);
  try{
    const res = await fetch(url);
    if(!res.ok){ log(`[SEARCH] HTTP ${res.status}`); return []; }
    const data = await res.json();
    // expected data: array of results with fields {id: "ttxxxxx", title, year, poster, type}
    log("[SEARCH] results count: " + (data?.length||0));
    return data || [];
  }catch(e){
    log("[SEARCH] exception: " + e);
    return [];
  }
}

// ---------- META (get detail including poster/imdb) ----------
async function vidsrcMetaByImdb(imdb){
  const urlMovie = `https://vidsrc.to/meta/movie/${imdb}`;
  const urlTV    = `https://vidsrc.to/meta/tv/${imdb}`;
  // try movie first
  try{
    log("[META] trying movie meta: " + urlMovie);
    let r = await fetch(urlMovie);
    if(r.ok){
      const j = await r.json(); log("[META] movie meta ok"); return j;
    }
  }catch(e){ log("[META] movie meta err: "+e); }
  // fallback tv
  try{
    log("[META] trying tv meta: " + urlTV);
    let r2 = await fetch(urlTV);
    if(r2.ok){
      const j2 = await r2.json(); log("[META] tv meta ok"); return j2;
    }
  }catch(e){ log("[META] tv meta err: "+e); }
  return null;
}

// ---------- Render a result card from vidsrc search item ----------
function makeCardFromSearch(item){
  // item expected: {id:"tt...", title, year, poster, type:"movie"|"tv"}
  const poster = item.poster || item.image || ("https://via.placeholder.com/400x225?text=No+Image");
  const title = item.title || item.name || item.id;
  const html = `
    <div class="card" data-imdb="${item.id}" data-type="${item.type || item.mediaType || 'movie'}">
      <img class="poster" src="${poster}" alt="${escapeHtml(title)}" onerror="this.src='https://via.placeholder.com/400x225?text=No+Image'"/>
      <div class="meta"><div style="font-weight:700">${escapeHtml(title)}</div><div class="muted">${item.year||''}</div></div>
    </div>
  `;
  return el(html);
}

// ---------- Utility escape ----------
function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- Click handler for cards ----------
async function onCardClick(e){
  const card = e.currentTarget;
  const imdb = card.getAttribute('data-imdb');
  const type = card.getAttribute('data-type') || 'movie';
  if(!imdb){ log("[CARD] no imdb id"); return; }

  clearLog();
  log(`[CARD] clicked imdb=${imdb} type=${type}`);

  // open meta (optional) to display better poster/title — also ensures imdb exists
  const meta = await vidsrcMetaByImdb(imdb);
  if(meta){
    log("[CARD] meta title: " + (meta.title || meta.name || ''));
    playerTitle.innerText = (meta.title || meta.name || imdb);
  } else {
    playerTitle.innerText = imdb;
  }

  // set current values
  currentImdb = imdb;
  currentType = (type==='tv' || (meta && meta.type==='tv')) ? 'tv' : 'movie';
  currentSeason = 1; currentEpisode = 1;
  if(currentType === 'tv'){ tvControls.classList.remove('hidden'); nextEpBtn.classList.remove('hidden'); }
  else { tvControls.classList.add('hidden'); nextEpBtn.classList.add('hidden'); }

  openPlayer(imdb, currentType, currentSeason, currentEpisode);
}

// ---------- Build embed url and open player ----------
let currentImdb = null, currentType = 'movie', currentSeason = 1, currentEpisode = 1;

function buildEmbedUrl(imdb, type, season=1, episode=1){
  if(!imdb) return "";
  if(type === 'tv'){
    return `https://vidsrc-embed.ru/embed/tv?imdb=${encodeURIComponent(imdb)}&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;
  } else {
    return `https://vidsrc-embed.ru/embed/movie?imdb=${encodeURIComponent(imdb)}`;
  }
}

function openPlayer(imdb, type, season=1, episode=1){
  const url = buildEmbedUrl(imdb, type, season, episode);
  log("[PLAYER] opening embed URL: " + url);
  playerFrame.src = url;
  playerModal.classList.remove('hidden');

  playerFrame.onload = ()=> log("[PLAYER] iframe loaded");
  playerFrame.onerror = ()=> log("[PLAYER] iframe error loading url");
}

// ---------- Close player ----------
function closePlayer(){
  playerFrame.src = "";
  playerModal.classList.add('hidden');
  clearLog();
}

// ---------- Season/Episode handlers ----------
function loadEpisode(){
  currentSeason = parseInt(seasonInput.value) || 1;
  currentEpisode = parseInt(episodeInput.value) || 1;
  openPlayer(currentImdb, currentType, currentSeason, currentEpisode);
}
function nextEpisode(){
  currentEpisode = (parseInt(episodeInput.value)||currentEpisode) + 1;
  episodeInput.value = currentEpisode;
  loadEpisode();
}
function copyEmbed(){
  const url = buildEmbedUrl(currentImdb, currentType, currentSeason, currentEpisode);
  navigator.clipboard?.writeText(url).then(()=>alert("Embed URL copied")).catch(()=>alert(url));
}

// ---------- Populate sample cards at startup ----------
async function loadSamples(){
  samplesBox.innerHTML = "";
  for(const id of SAMPLE_IMDB){
    // try metadata to obtain poster & title
    const meta = await vidsrcMetaByImdb(id);
    let item = null;
    if(meta){
      item = { id: id, title: meta.title || meta.name, year: meta.year || meta.first_air_date || '', poster: meta.poster || meta.image, type: (meta.type==='tv'?'tv':'movie') };
    } else {
      item = { id: id, title: id, poster: "https://via.placeholder.com/400x225?text=No+Image", type: 'movie' };
    }
    const card = makeCardFromSearch(item);
    card.addEventListener('click', onCardClick);
    samplesBox.appendChild(card);
  }
}

// ---------- Run a search and render results ----------
async function runSearch(){
  const q = (searchInput.value||'').trim();
  if(q.length < 2) { alert("Type at least 2 characters"); return; }
  resultsBox.innerHTML = "";
  clearLog();
  const items = await vidsrcSearch(q);
  if(!items || items.length === 0){ resultsBox.innerHTML = "<div style='padding:10px;color:var(--muted)'>No results</div>"; return; }

  for(const it of items){
    // ensure consistent fields: id, title, year, poster, type
    const obj = { id: it.id, title: it.title||it.name, year: it.year||it.year, poster: it.poster||it.image, type: it.type||it.type || 'movie' };
    const card = makeCardFromSearch(obj);
    card.addEventListener('click', onCardClick);
    resultsBox.appendChild(card);
  }
}

// ---------- event wiring ----------
searchBtn?.addEventListener('click', runSearch);
searchInput?.addEventListener('keyup', (e)=>{ if(e.key === 'Enter') runSearch(); });

closePlayerBtn?.addEventListener('click', closePlayer);
loadEpisodeBtn?.addEventListener('click', loadEpisode);
nextEpBtn?.addEventListener('click', nextEpisode);
copyUrlBtn?.addEventListener('click', copyEmbed);

// ---------- start ----------
loadSamples();
log("Ready — samples loaded. Use the search box or click a sample to play.");
