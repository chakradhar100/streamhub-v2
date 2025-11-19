// StreamHub v4 - client-side only (mock backend via api.json)
// Simple, static, GitHub Pages friendly

let API_DATA = null;
let activeProfile = null;
let profiles = JSON.parse(localStorage.getItem('sh_profiles')||'[]');
const profilesScreen = document.getElementById('profilesScreen');
const profilesList = document.getElementById('profilesList');
const addProfileBtn = document.getElementById('addProfileBtn');
const newProfileName = document.getElementById('newProfileName');

const app = document.getElementById('app');
const profileSwitcher = document.getElementById('profileSwitcher');
const rowsEl = document.getElementById('rows');
const heroTitle = document.getElementById('heroTitle');
const heroDesc = document.getElementById('heroDesc');
const heroPoster = document.getElementById('heroPoster');
const heroPlay = document.getElementById('heroPlay');
const heroAdd = document.getElementById('heroAdd');
const searchInput = document.getElementById('search');

const continueRow = document.getElementById('continueRow');

const playerModal = document.getElementById('playerModal');
const player = document.getElementById('player');
const closePlayer = document.getElementById('closePlayer');
const episodeList = document.getElementById('episodeList');
const toggleWL = document.getElementById('toggleWL');

// Load API (mock)
fetch('api.json').then(r=>r.json()).then(data=>{
  API_DATA = data;
  init();
});

// ---------- Profiles ----------
function renderProfiles(){
  profilesList.innerHTML = '';
  if(profiles.length===0){ profiles = [{name:'You',avatar:'assets/avatar1.png',prefs:{}}]; localStorage.setItem('sh_profiles',JSON.stringify(profiles)); }
  profiles.forEach((p,idx)=>{
    const el = document.createElement('div'); el.className='profile-item';
    el.innerHTML = `<img src="${p.avatar}" alt=""><div>${p.name}</div>`;
    el.onclick = ()=>selectProfile(idx);
    profilesList.appendChild(el);
  });
}
addProfileBtn.onclick = ()=>{
  const name = newProfileName.value.trim(); if(!name) return;
  profiles.push({name,avatar:'assets/avatar1.png',prefs:{}});
  localStorage.setItem('sh_profiles',JSON.stringify(profiles));
  newProfileName.value=''; renderProfiles();
};

// select profile
function selectProfile(idx){
  activeProfile = profiles[idx];
  localStorage.setItem('sh_active', JSON.stringify(activeProfile));
  profilesScreen.style.display='none'; app.classList.remove('hide');
  renderProfileSwitcher();
  renderHero();
  renderRows(API_DATA.rows);
  loadContinue();
}

// profile switcher
function renderProfileSwitcher(){
  profileSwitcher.innerHTML = '';
  profiles.forEach((p,idx)=>{
    const el = document.createElement('div'); el.className='profile-mini';
    el.innerHTML = `<img src="${p.avatar}" alt=""><div>${p.name}</div>`;
    el.onclick = ()=>{ selectProfile(idx); location.reload(); };
    profileSwitcher.appendChild(el);
  });
}

// ---------- Hero ----------
function renderHero(){
  const featured = API_DATA.featured;
  heroTitle.innerText = featured.title;
  heroDesc.innerText = featured.desc;
  heroPoster.src = featured.poster;
  heroPlay.onclick = ()=>openPlayer(featured);
  heroAdd.onclick = ()=>toggleWatchlist(featured.id);
}

// ---------- Rows ----------
function renderRows(rows){
  rowsEl.innerHTML = '';
  rows.forEach(row=>{
    const title = document.createElement('div'); title.className='section-title'; title.innerText = row.title;
    const rowEl = document.createElement('div'); rowEl.className='video-row';
    row.items.forEach(item=>{
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `<img src="${item.poster}" alt=""><div class="meta"><strong>${item.title}</strong><div class="small">${item.season?'Season '+item.season:''}</div></div><div class="progress" style="width:0"></div>`;
      card.onclick = ()=>openPlayer(item);
      // preview on hover (uses preview src if available)
      const preview = document.createElement('video'); preview.className='preview'; preview.muted=true; preview.loop=true; preview.playsInline=true;
      if(item.preview) preview.src = item.preview;
      card.appendChild(preview);
      card.addEventListener('mouseenter', ()=>{ if(preview.src){ preview.style.display='block'; preview.play(); } });
      card.addEventListener('mouseleave', ()=>{ preview.pause(); preview.style.display='none'; });
      // progress if continued
      const prog = getContinue(item.id);
      if(prog){ const pct = Math.min(100, (prog / (item.duration||1))*100); card.querySelector('.progress').style.width = pct+'%'; }
      rowEl.appendChild(card);
    });
    rowsEl.appendChild(title); rowsEl.appendChild(rowEl);
  });
}

// ---------- Continue Watching ----------
function saveContinue(id,time){
  const key = 'sh_cont_'+(activeProfile?activeProfile.name:'guest');
  const data = JSON.parse(localStorage.getItem(key)||'{}');
  data[id]=time;
  localStorage.setItem(key, JSON.stringify(data));
  loadContinue();
}
function getContinue(id){
  const key = 'sh_cont_'+(activeProfile?activeProfile.name:'guest');
  const data = JSON.parse(localStorage.getItem(key)||'{}');
  return data[id]||0;
}
function loadContinue(){
  continueRow.innerHTML='';
  const key = 'sh_cont_'+(activeProfile?activeProfile.name:'guest');
  const data = JSON.parse(localStorage.getItem(key)||'{}');
  Object.keys(data).forEach(id=>{
    // find item by id
    const found = API_DATA.allItems.find(x=>x.id===id);
    if(!found) return;
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<img src="${found.poster}"><div class="meta"><strong>${found.title}</strong></div><div class="progress" style="width:${Math.min(100,(data[id]/(found.duration||1))*100)}%"></div>`;
    card.onclick = ()=>{ openPlayer(found); player.currentTime = data[id]; };
    continueRow.appendChild(card);
  });
}

// ---------- Player & Episodes ----------
function openPlayer(item){
  playerModal.style.display='flex';
  player.src = item.video || item.episodes && item.episodes[0].video || '';
  player.play();
  renderEpisodes(item);
  // toggle watchlist text
  updateWLBtn(item.id);
  // when pause, save time
  player.onpause = ()=>{ saveContinue(item.id, Math.floor(player.currentTime)); };
}

closePlayer.onclick = ()=>{ playerModal.style.display='none'; player.pause(); player.src=''; };

function renderEpisodes(item){
  episodeList.innerHTML='';
  if(item.episodes && item.episodes.length){
    item.episodes.forEach(ep=>{
      const el = document.createElement('div'); el.className='ep';
      el.style.padding='8px'; el.style.borderBottom='1px solid #202020';
      el.innerHTML = `<strong>${ep.title}</strong><div class="small">Ep ${ep.number} • ${ep.duration}s</div>`;
      el.onclick = ()=>{ player.src = ep.video; player.play(); };
      episodeList.appendChild(el);
    });
  } else {
    episodeList.innerHTML = '<div class="small">No episodes</div>';
  }
}

// ---------- Watchlist (local simple) ----------
function toggleWatchlist(id){
  const key = 'sh_wl_'+(activeProfile?activeProfile.name:'guest');
  const data = JSON.parse(localStorage.getItem(key)||'[]');
  const idx = data.indexOf(id);
  if(idx>-1) data.splice(idx,1); else data.push(id);
  localStorage.setItem(key,JSON.stringify(data));
  updateWLBtn(id);
}
function updateWLBtn(id){
  const key = 'sh_wl_'+(activeProfile?activeProfile.name:'guest');
  const data = JSON.parse(localStorage.getItem(key)||'[]');
  toggleWL.innerText = data.includes(id)?'Remove from Watchlist':'+ Watchlist';
}

// ---------- Init ----------
function init(){
  // build allItems flat list for lookups
  API_DATA.allItems = [];
  API_DATA.rows.forEach(r=> r.items.forEach(i=> API_DATA.allItems.push(i) ));
  renderProfiles();
  // auto-select last active profile if exists
  const last = JSON.parse(localStorage.getItem('sh_active')||'null');
  if(last){
    const idx = profiles.findIndex(p=>p.name===last.name);
    if(idx>-1){ selectProfile(idx); return; }
  }
  // else show profile screen
  profilesScreen.style.display='flex';
}
