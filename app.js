// ===== StreamHub v2 Full Fix =====

// Global variable
let currentIMDB = null;

// TMDB API
const API_KEY = '1c161f19e296f253fed30df0a8bd7d93';
const BASE_URL = 'https://api.themoviedb.org/3';

// Elements
const popularMoviesDiv = document.getElementById('popular-movies');
const popularTVDiv = document.getElementById('popular-tv');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResultsDiv = document.getElementById('search-results');
const loadEpisodeBtn = document.getElementById('loadEpisodeBtn');
const playerDiv = document.getElementById('player');

// Helper to fetch JSON
async function fetchJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('Fetch error:', err);
        alert('Failed to fetch data. Check console.');
        return null;
    }
}

// ===== Popular Movies =====
async function loadPopularMovies() {
    const data = await fetchJSON(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
    if (!data) return;

    popularMoviesDiv.innerHTML = '';

    data.results.forEach(movie => {
        const imgSrc = movie.poster_path
            ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
            : 'fallback.png';

        const movieEl = document.createElement('div');
        movieEl.classList.add('movie-item');
        movieEl.innerHTML = `
            <img src="${imgSrc}" alt="${movie.title}" onerror="this.src='fallback.png'">
            <h4>${movie.title}</h4>
        `;
        movieEl.onclick = () => openMovie(movie.id);
        popularMoviesDiv.appendChild(movieEl);
    });
}

// ===== Popular TV Shows =====
async function loadPopularTV() {
    const data = await fetchJSON(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=1`);
    if (!data) return;

    popularTVDiv.innerHTML = '';

    data.results.forEach(tv => {
        const imgSrc = tv.poster_path
            ? `https://image.tmdb.org/t/p/w300${tv.poster_path}`
            : 'fallback.png';

        const tvEl = document.createElement('div');
        tvEl.classList.add('tv-item');
        tvEl.innerHTML = `
            <img src="${imgSrc}" alt="${tv.name}" onerror="this.src='fallback.png'">
            <h4>${tv.name}</h4>
        `;
        tvEl.onclick = () => openTV(tv.id);
        popularTVDiv.appendChild(tvEl);
    });
}

// ===== Open Movie =====
async function openMovie(tmdbId) {
    const data = await fetchJSON(`${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}`);
    if (!data) return;

    currentIMDB = data.imdb_id;
    if (!currentIMDB) {
        alert('IMDB ID not found!');
        return;
    }

    loadPlayer(currentIMDB);
}

// ===== Open TV Show =====
async function openTV(tvId) {
    const data = await fetchJSON(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}`);
    if (!data) return;

    // Default to first episode of first season
    const seasonNumber = 1;
    const episodeNumber = 1;

    // Fetch episode info
    const epData = await fetchJSON(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${API_KEY}`);
    if (!epData) return;

    currentIMDB = epData.imdb_id;
    if (!currentIMDB) {
        alert('IMDB ID not found for episode!');
        return;
    }

    loadPlayer(currentIMDB);
}

// ===== Player =====
function loadPlayer(imdbId) {
    playerDiv.innerHTML = `
        <iframe 
            src="https://vidsrc-embed.ru/embed/movie?imdb=${imdbId}" 
            frameborder="0" 
            width="100%" 
            height="500" 
            allowfullscreen>
        </iframe>
    `;
}

// ===== Search =====
async function search(query) {
    if (!query) return;
    const data = await fetchJSON(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    if (!data) return;

    searchResultsDiv.innerHTML = '';

    data.results.forEach(item => {
        const title = item.title || item.name || 'Unknown';
        const imgSrc = item.poster_path
            ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
            : 'fallback.png';

        const el = document.createElement('div');
        el.classList.add('search-item');
        el.innerHTML = `
            <img src="${imgSrc}" alt="${title}" onerror="this.src='fallback.png'">
            <h4>${title}</h4>
        `;

        el.onclick = () => {
            if (item.media_type === 'movie') openMovie(item.id);
            else if (item.media_type === 'tv') openTV(item.id);
        };

        searchResultsDiv.appendChild(el);
    });
}

// ===== Event Listeners =====
searchBtn.onclick = () => search(searchInput.value);
loadEpisodeBtn.onclick = () => {
    if (!currentIMDB) {
        alert('No movie or episode selected!');
        return;
    }
    loadPlayer(currentIMDB);
};

// ===== Initialize =====
loadPopularMovies();
loadPopularTV();
