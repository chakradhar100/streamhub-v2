// SAMPLE MOVIES TO DISPLAY ON HOME PAGE
const sampleMovies = [
    {
        title: "Breaking Bad",
        imdb: "tt0903747",
        poster: "https://m.media-amazon.com/images/M/MV5BZmFiODFlZmQt.jpg"
    },
    {
        title: "Inception",
        imdb: "tt1375666",
        poster: "https://m.media-amazon.com/images/I/51zUbui+gbL._AC_.jpg"
    },
    {
        title: "Interstellar",
        imdb: "tt0816692",
        poster: "https://m.media-amazon.com/images/I/91kFYg4fX3L._AC_SL1500_.jpg"
    },
    {
        title: "Game of Thrones",
        imdb: "tt0944947",
        poster: "https://m.media-amazon.com/images/I/81aLojU9AML._AC_SL1500_.jpg"
    }
];

const content = document.getElementById("content");
const searchInput = document.getElementById("searchInput");

function loadHome() {
    content.innerHTML = "";
    sampleMovies.forEach(movie => renderCard(movie));
}

function renderCard(movie) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
        <img src="${movie.poster}" />
        <div class="card-title">${movie.title}</div>
    `;

    div.onclick = () => openPlayer(movie.imdb);

    content.appendChild(div);
}

// OPEN PLAYER MODAL
function openPlayer(imdb) {

    // USE YOUR PLAYER SOURCE
    const embed = `https://vidsrc.to/embed/movie/${imdb}`;

    document.getElementById("playerFrame").src = embed;
    document.getElementById("playerModal").classList.remove("hidden");
}

// CLOSE MODAL
document.getElementById("closePlayer").onclick = () => {
    document.getElementById("playerModal").classList.add("hidden");
    document.getElementById("playerFrame").src = "";
};

// SEARCH FUNCTION
searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();

    if (q.length < 2) {
        loadHome();
        return;
    }

    const results = sampleMovies.filter(m =>
        m.title.toLowerCase().includes(q)
    );

    content.innerHTML = "";
    results.forEach(renderCard);

    if (results.length === 0) {
        content.innerHTML = `<p>No results found.</p>`;
    }
});

// INIT
loadHome();
