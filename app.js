console.log("StreamHub TMDB Version Loaded");

const TMDB_KEY = "1c161f19e296f253fed30df0a8bd7d93";
const IMG = "https://image.tmdb.org/t/p/w500";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");

const popularMovies = document.getElementById("popularMovies");
const popularTV = document.getElementById("popularTV");

// Modal elements
const playerModal = document.getElementById("playerModal");
const closePlayer = document.getElementById("closePlayer");
const playerFrame = document.getElementById("playerFrame");
const playerTitle = document.getElementById("playerTitle");
const tvControls = document.getElementById("tvControls");
const seasonInput = document.getElementById("seasonInput");
const episodeInput = document.getElementById("episodeInput");
const loadEpisodeBtn = document.getElementById("loadEpisodeBtn");
const debugLog = document.getElementById("debugLog");

function log(msg) {
    console.log(msg);
    debugLog.textContent += msg + "\n";
}

// ------------------ TMDB SEARCH ---------------------
async function searchTMDB(query) {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`;

    log("[SEARCH] " + url);

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return data.results.filter(r => r.media_type === "movie" || r.media_type === "tv");
}

// ------------------ GET IMDB ID ----------------------
async function getIMDBfromTMDB(type, id) {
    const url =
        type === "movie"
            ? `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}`
            : `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}`;

    log("[IMDB] " + url);

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    return data.imdb_id;
}

// --------------- TMDB POPULAR MOVIES -----------------
async function loadPopularMovies() {
    const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}`;
    const res = await fetch(url);
    const json = await res.json();

    json.results.forEach(m => {
        popularMovies.appendChild(makeCard(m, "movie"));
    });
}

// --------------- TMDB POPULAR TV ---------------------
async function loadPopularTV() {
    const url = `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_KEY}`;
    const res = await fetch(url);
    const json = await res.json();

    json.results.forEach(tv => {
        popularTV.appendChild(makeCard(tv, "tv"));
    });
}

// --------------- MAKE CARD ---------------------------
function makeCard(item, forcedType = null) {
    let type = forcedType || item.media_type;
    let title = item.title || item.name;
    let poster = item.poster_path ? IMG + item.poster_path : "https://via.placeholder.com/300x450?text=No+Image";
    let year = (item.release_date || item.first_air_date || "").split("-")[0];

    let div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
        <img class="poster" src="${poster}">
        <div class="meta">
            <div class="meta-title">${title}</div>
            <div class="meta-year">${year}</div>
        </div>
    `;

    div.onclick = () => openPlayer(type, item.id, title);

    return div;
}

// ---------------- OPEN PLAYER -------------------------
async function openPlayer(type, tmdbID, title) {
    debugLog.textContent = "";
    log("[OPEN] type=" + type + " tmdb=" + tmdbID);

    playerTitle.textContent = title;

    const imdb = await getIMDBfromTMDB(type, tmdbID);
    if (!imdb) {
        alert("Could not fetch IMDb ID");
        return;
    }

    log("[IMDB FOUND] " + imdb);

    if (type === "tv") {
        tvControls.classList.remove("hidden");
    } else {
        tvControls.classList.add("hidden");
    }

    loadVideo(type, imdb);

    playerModal.classList.remove("hidden");
}

function loadVideo(type, imdb) {
    let season = seasonInput.value;
    let episode = episodeInput.value;

    let url =
        type === "tv"
            ? `https://vidsrc-embed.ru/embed/tv?imdb=${imdb}&season=${season}&episode=${episode}`
            : `https://vidsrc-embed.ru/embed/movie?imdb=${imdb}`;

    log("[PLAYER] " + url);

    playerFrame.src = url;
}

loadEpisodeBtn.onclick = () => {
    loadVideo("tv", currentIMDB);
};

closePlayer.onclick = () => {
    playerModal.classList.add("hidden");
    playerFrame.src = "";
};

// SEARCH BUTTON
searchBtn.onclick = async () => {
    let q = searchInput.value.trim();
    if (q.length < 2) return alert("Type at least 2 characters");

    let items = await searchTMDB(q);

    results.innerHTML = "";
    items.forEach(it => results.appendChild(makeCard(it)));
};

// Load popular content
loadPopularMovies();
loadPopularTV();
