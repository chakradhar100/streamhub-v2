const OMDB_KEY = "https://www.omdbapi.com/?apikey=dd7ffe53&s=";
const OMDB_DETAILS = "https://www.omdbapi.com/?apikey=dd7ffe53&i=";
const TMDB_KEY = "de0c5cddca718ef54bb93e78bce0d674";

async function searchMovie() {
    let query = document.getElementById("searchInput").value.trim();
    if (!query) return;

    // FIX: Remove years, parentheses, and symbols that break OMDb search
    query = query.replace(/\(\d{4}\)/, "").trim();   // remove (2014)
    query = query.replace(/[^\w\s]/g, " ").trim();   // remove special characters
    
    document.getElementById("results").innerHTML = "Loading...";

    let res = await fetch(OMDB_KEY + encodeURIComponent(query));
    let data = await res.json();

    if (!data.Search) {
        document.getElementById("results").innerHTML = "No results found.";
        return;
    }

    displayResults(data.Search);
}


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

async function getTMDBPoster(imdbID) {
    try {
        let res = await fetch(
            `https://api.themoviedb.org/3/find/${imdbID}?api_key=${TMDB_KEY}&external_source=imdb_id`
        );

        let data = await res.json();
        let item = data.movie_results[0] || data.tv_results[0];

        if (item && item.poster_path) {
            return "https://image.tmdb.org/t/p/w500" + item.poster_path;
        }
    } catch (e) {}

    return "https://via.placeholder.com/300x450?text=No+Image";
}

let currentTitle = "";
let currentIMDB = "";
let currentSeason = 1;
let currentEpisode = 1;
let isSeries = false;

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

function loadPlayer() {
    let url = "";

    if (isSeries) {
        url = `https://vidsrc-embed.ru/tv/${currentIMDB}/${currentSeason}/${currentEpisode}`;
    } else {
        url = `https://vidsrc-embed.ru/movie/${currentIMDB}`;
    }

    document.getElementById("playerFrame").src = url;
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
