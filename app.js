// Mock database (you can expand or fetch real API later)
const mockData = [
  { title: "Inception", imdb: "tt1375666", type: "movie" },
  { title: "Interstellar", imdb: "tt0816692", type: "movie" },
  { title: "Breaking Bad S1E1", imdb: "tt0903747", type: "series", season: 1, episode: 1 },
  { title: "Game of Thrones S1E2", imdb: "tt0944947", type: "series", season: 1, episode: 2 }
];

// Search function
function searchMovies() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  const container = document.getElementById("results");
  container.innerHTML = "";

  const results = mockData.filter(m => m.title.toLowerCase().includes(q));

  results.forEach(m => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h3>${m.title}</h3><small>${m.imdb}</small>`;
    div.onclick = () => openPlayer(m);
    container.appendChild(div);
  });
}

// Construct embed URL (placeholder — safe)
function generateEmbedURL({ imdb, season = null, episode = null, type }) {
  const base = "https://your-embed-provider.example/embed";

  if (type === "movie") {
    return `${base}/movie?imdb=${imdb}`;
  }

  return `${base}/tv?imdb=${imdb}&season=${season}&episode=${episode}`;
}

// Open modal player
function openPlayer(data) {
  const modal = document.getElementById("playerModal");
  const iframe = document.getElementById("playerFrame");

  iframe.src = generateEmbedURL(data);
  modal.classList.add("show");
}

// Close player
function closePlayer() {
  const modal = document.getElementById("playerModal");
  const iframe = document.getElementById("playerFrame");

  iframe.src = ""; // stop playback
  modal.classList.remove("show");
}

// Initial search render
document.addEventListener("DOMContentLoaded", () => {
  searchMovies();
});
