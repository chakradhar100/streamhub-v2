/* ========= CONFIG ========= */
const USE_TMDB = true;           // Set false to use mock (fallback)
const TMDB_KEY = "1c161f19e296f253fed30df0a8bd7d93";             // Optional: your TMDB key here
const API_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w342";

/* ========= GRADIENT PLACEHOLDER ========= */
const GRADIENT_PLACEHOLDER =
  "data:image/svg+xml;base64," +
  btoa(`
<svg width="200" height="300" xmlns='http://www.w3.org/2000/svg'>
  <defs>
    <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='#5429d6'/>
      <stop offset='100%' stop-color='#2970d6'/>
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)' rx='12' ry='12'/>
</svg>`);

/* ========= ELEMENT HELPERS ========= */
const $ = (x) => document.querySelector(x);
const el = (tag, props = {}, ...children) => {
  const e = document.createElement(tag);
  Object.assign(e, props);
  children.forEach(c => e.append(c));
  return e;
};

/* ========= FETCH HELPERS ========= */
async function T(path) {
  if (!USE_TMDB || !TMDB_KEY) return null;
  const url = `${API_BASE}${path}?api_key=${TMDB_KEY}&language=en-US`;
  return (await fetch(url)).json();
}

async function Tsearch(query) {
  if (!USE_TMDB || !TMDB_KEY) return { results: [] };
  const url = `${API_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`;
  return (await fetch(url)).json();
}

/* ========= RENDER POSTER CARD ========= */
function posterCard(item) {
  const isMovie = item.media_type === "movie";
  const isTV = item.media_type === "tv";

  // skip "person" results → Option B
  if (!isMovie && !isTV) return null;

  const poster = item.poster_path ? IMG + item.poster_path : GRADIENT_PLACEHOLDER;

  const card = el("div", { className: "card", onclick: () => openModal(item) });
  const img = el("img", { src: poster, className: "poster" });

  img.onerror = () => (img.src = GRADIENT_PLACEHOLDER);

  const title = el("div", { className: "card-title", innerText: item.title || item.name });

  card.append(img, title);
  return card;
}

/* ========= LOAD POPULAR ========= */
async function loadSection(path, containerSel) {
  const container = $(containerSel);
  const data = await T(path);
  if (!data || !data.results) return;

  container.innerHTML = "";
  data.results.forEach(item => {
    const card = posterCard(item);
    if (card) container.append(card);
  });
}

loadSection("/movie/popular", "#popular-movies");
loadSection("/tv/popular", "#popular-tv");

/* ========= SEARCH ========= */
$("#search-btn").onclick = async () => {
  const query = $("#search-input").value.trim();
  if (!query) return;

  const out = $("#search-results");
  out.innerHTML = "<div class='search-loading'>Searching…</div>";

  const data = await Tsearch(query);

  out.innerHTML = "";

  if (!data || !data.results || data.results.length === 0) {
    out.innerHTML = "<div class='search-empty'>No results found.</div>";
    return;
  }

  data.results.forEach(item => {
    const card = posterCard(item);
    if (card) out.append(card);
  });
};

/* ========= MODAL ========= */
const modal = $("#modal");
const modalBg = $("#modal-bg");

function openModal(item) {
  $("#modal-title").innerText = item.title || item.name;
  $("#modal-overview").innerText = item.overview || "No description available.";

  const poster = item.poster_path ? IMG + item.poster_path : GRADIENT_PLACEHOLDER;
  $("#modal-poster").src = poster;

  $("#modal-play").onclick = () => goToPlayer(item);
  $("#modal-trailer").onclick = () => loadTrailer(item);

  modal.style.display = "flex";
  modalBg.style.display = "block";

  if (item.media_type === "tv") loadSeasons(item);
  else $("#season-container").style.display = "none";
}

modalBg.onclick = () => {
  modal.style.display = "none";
  modalBg.style.display = "none";
};

/* ========= TRAILER ========= */
async function loadTrailer(item) {
  const isMovie = item.media_type === "movie";
  const data = isMovie ? await T(`/movie/${item.id}/videos`) : await T(`/tv/${item.id}/videos`);

  const Y = data?.results?.find(v => v.site === "YouTube");
  if (!Y) {
    alert("No trailer available.");
    return;
  }

  window.open(`https://www.youtube.com/watch?v=${Y.key}`, "_blank");
}

/* ========= SEASONS FOR TV ========= */
async function loadSeasons(item) {
  const data = await T(`/tv/${item.id}`);
  if (!data) return;

  const s = $("#season-select");
  s.innerHTML = "";

  data.seasons.forEach(season => {
    if (season.season_number === 0) return; // skip specials
    const op = el("option", {
      value: season.season_number,
      innerText: "Season " + season.season_number
    });
    s.append(op);
  });

  $("#season-container").style.display = "block";
}

/* ========= PLAYER REDIRECT ========= */
function goToPlayer(item) {
  const isTV = item.media_type === "tv";

  let imdb = item?.external_ids?.imdb_id || item.imdb_id;

  // If no IMDB is provided, get it
  if (!imdb) {
    fetch(`${API_BASE}/${isTV ? "tv" : "movie"}/${item.id}/external_ids?api_key=${TMDB_KEY}`)
      .then(r => r.json())
      .then(d => {
        imdb = d.imdb_id;
        redirect(isTV, imdb);
      });
  } else {
    redirect(isTV, imdb);
  }
}

function redirect(isTV, imdb) {
  if (!imdb) {
    alert("Missing IMDB ID.");
    return;
  }

  if (!isTV) {
    window.location.href = `player.html?imdb=${imdb}&type=movie`;
  } else {
    const s = $("#season-select").value || 1;
    window.location.href = `player.html?imdb=${imdb}&type=tv&s=${s}&e=1`;
  }
}
