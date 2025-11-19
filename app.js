console.log("StreamHub V10 — FIXED VERSION LOADED");

const OMDB_KEY = "https://www.omdbapi.com/?apikey=dd7ffe53&s=";
const OMDB_DETAILS = "https://www.omdbapi.com/?apikey=dd7ffe53&i=";
const TMDB_KEY = "de0c5cddca718ef54bb93e78bce0d674";

// Logging Helper
function log(msg) {
    console.log(msg);
    let box = document.getElementById("debugLog");
    if (box) box.innerText += msg + "\n";
}

// SEARCH MOVIE
async function searchMovie() {
    let query = document.getElementById("searchInput").value.trim();
    if (!query) return;

    // clean query
    query = query.replace(/\(\d{4}\)/, "").trim();
    query = query.replace(/[^\w\s]/g, " ").trim();

    document.getElementById("results").innerHTML = "Loading...";

    let url = OMDB_KEY + encodeURIComponent(query);
    log("SEARCH URL: " + url);

    let res = await fetch(url);
    let data = await res.json();

    log("OMDB RESPONSE: " + JSON.stringify(data));

    if (!data.Search) {
        document.getElementById("results").innerHTML = "No results found.";
        return;
    }

    displayResults(data.Search);
}

// DISPLAY RESULTS
async function displayResults(list) {
    let html = "";

    for (let item of list) {
        let poster = await getTMDBPoster(item.imdbID);

        html += `
            <div class="card" onclick='openPlayer(${JSON.stringify(item)})'>
                <img src="${poster}" alt="poster">
                <h3>${item.Title}</h3>
                <p>${item.Year}</p>
            </div>
        `;
    }

    document.getElementById("results").innerHTML = html;
}

// POSTER FETCH
async function getTMDBPoster(imdbID) {
    try {
        let url = `https://api.themoviedb.org/3/find/${imdbID}?api_key=${TMDB_KEY}&external_source=imdb_id`;
        log("TMDB POSTER URL: " + url);

        let res = await fetch(url);
        let data = await res.json();

        let item = data.movie_results[0] || data.tv_results[0];

        if (item?.poster_path) {
            return "https://image.tmdb.org/t/p/w500" + item.poster_path;
        }

    } catch (e) {
        log("POSTER ERROR: " + e);
    }

    return "https://via.placeholder.com/300x450?text=No+Image";
}

// GLOBAL PLAYER VARIABLES
let currentTitle = "";
let currentIMDB = "";
let currentSeason = 1;
let currentEpisode = 1;
let isSeries = false;

// OPEN PLAYER MODAL
function openPlayer(movie) {
    currentTitle = movie.Title;
    currentIMDB = movie.imdbID;
    isSeries = movie.Type === "series";

    document.getElementById("playerTitle").innerText = currentTitle;
    document.getElementById("playerModal").classList.remove("hidden");

    document.getElementById("episodeControls").classList.toggle("hidden", !isSeries);
    document.getElementById("nextBtn").classList.toggle("hidden", !isSeries);

    loadPlayer();
}

// LOAD PLAYER WITH NEW EMBED FORMAT
function loadPlayer() {
    let url = "";

    if (isSeries) {
        url = `https://vidsrc-embed.ru/embed/tv?imdb=${currentIMDB}&season=${currentSeason}&episode=${currentEpisode}`;
    } else {
        url = `https://vidsrc-embed.ru/embed/movie?imdb=${currentIMDB}`;
    }

    log("EMBED URL: " + url);

    let frame = document.getElementById("playerFrame");
    frame.src = url;

    frame.onerror = () => log("❌ iframe error for: " + url);
    frame.onload = () => log("✅ iframe loaded: " + url);
}

function updateEpisode() {
    currentSeason = parseInt(document.getElementById("seasonInput").value);
    currentEpisode = parseInt(document.getElementById("episodeInput").value);
    loadPlayer();
}

function nextEpisode() {
    currentEpisode++;
    document.getElementById("episodeInput").value = currentEpisode;
    loadPlayer();
}

function closePlayer() {
    document.getElementById("playerModal").classList.add("hidden");
    document.getElementById("playerFrame").src = "";
}
