/* =========================================
   NYEKFLIX — home.js (Optimized v2)
========================================= */
'use strict';

const API_KEY = '838275398c9b97c59f8109b1ee6de82f';
const BASE    = 'https://api.themoviedb.org/3';
const IMG     = 'https://image.tmdb.org/t/p';
const rowPages = {};
const HOME_ROWS = [

{
title:"Trending Now",
endpoint:"/trending/all/day"
},

{
title:"Popular Movies",
endpoint:"/movie/popular"
},

{
title:"Popular TV Shows",
endpoint:"/tv/popular"
},

{
title:"Top Rated Movies",
endpoint:"/movie/top_rated"
},

{
title:"Top Rated TV Shows",
endpoint:"/tv/top_rated"
},

{
title:"New Releases",
endpoint:"/movie/now_playing"
},

{
title:"English Movies",
endpoint:"/discover/movie?with_original_language=en&sort_by=popularity.desc"
},

{
title:"K-Dramas",
endpoint:"/discover/tv?with_original_language=ko&sort_by=popularity.desc"
},

{
title:"Filipino Movies",
endpoint:"/discover/movie?with_origin_country=PH&sort_by=popularity.desc"
}

];

// State
let currentItem      = null;
let currentSeasonNum = 1;
let currentEpisodeNum = 1;
let searchDebounce   = null;
let bannerItems      = [];
let genres = [];

/* ──────────────────────────────────────────
   LOVE GATE
────────────────────────────────────────── */
function unlockNyekFlix() {
  const modal = document.getElementById('kilig-modal');
  modal.style.animation = 'fadeIn 0.3s ease reverse';
  setTimeout(() => { modal.style.display = 'none'; }, 280);
  showToast('❤️ I love you Myyy!!');
}

function exitNyekFlix() {
  showToast('😢 Balik ka ha... ❤️');
  setTimeout(() => {
    document.body.innerHTML = `
      <div style="
        display:flex; flex-direction:column; align-items:center;
        justify-content:center; height:100vh;
        background:#141414; color:#fff; font-family:sans-serif;
        gap:20px; text-align:center; padding:20px;
      ">
        <div style="font-size:4rem">💔</div>
        <h2 style="font-size:1.5rem">Ayaw mo pala...</h2>
        <p style="color:#aaa">Balik ka kapag handa ka na mag I love you. ❤️</p>
        <button onclick="location.reload()"
          style="
            background:#E50914; color:white; border:none;
            padding:12px 28px; border-radius:50px;
            font-size:1rem; font-weight:700; cursor:pointer;
          ">
          Ayoko na, babalik na ko ❤️
        </button>
      </div>`;
  }, 800);
}

/* ──────────────────────────────────────────
   TOAST
────────────────────────────────────────── */
function showToast(msg, duration = 2500) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ──────────────────────────────────────────
   NAVBAR SCROLL
────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  navbar.classList.toggle('scrolled', y > 40);
  lastScroll = y;
}, { passive: true });

/* ──────────────────────────────────────────
   FETCH HELPERS
────────────────────────────────────────── */
async function api(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}api_key=${API_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

function img(path, size = 'w500') {
  return path ? `${IMG}/${size}${path}` : '';
}

/* ──────────────────────────────────────────
   BANNER
────────────────────────────────────────── */
function displayBanner(item) {
  const banner = document.getElementById('banner');
  const bgUrl  = item.backdrop_path ? `${IMG}/original${item.backdrop_path}` : '';

  // Preload image, then show
  if (bgUrl) {
    const preload = new Image();
    preload.onload = () => { banner.style.backgroundImage = `url(${bgUrl})`; };
    preload.src = bgUrl;
  }

  document.getElementById('banner-title').textContent    = item.title || item.name;
  document.getElementById('banner-overview').textContent = item.overview || '';
document.getElementById('banner-play-btn').onclick = () => showDetails(item);
document.getElementById('banner-info-btn').onclick = () => showDetails(item);


// AUTO PLAY PREVIEW
setTimeout(() => {

  playBannerPreview(item);

}, 1000);
}

/* ──────────────────────────────────────────
   CARD RENDERING
────────────────────────────────────────── */
function renderCards(items, containerId, ranked = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Skeleton placeholders while images load
  container.innerHTML = '';

  items.forEach((item, idx) => {
    if (!item.poster_path) return;

    const card = document.createElement('div');
    card.className = 'content-card';

    const posterUrl = img(item.poster_path, 'w342');

    // Skeleton while loading
    card.classList.add('skeleton');
    card.style.backgroundImage = '';

    const image = new Image();
    image.onload = () => {
      card.classList.remove('skeleton');
      card.style.backgroundImage = `url(${posterUrl})`;
    };
    image.src = posterUrl;

    if (ranked) {
      const rank = document.createElement('div');
      rank.className = 'rank-number';
      rank.textContent = idx + 1;
      card.appendChild(rank);
    }

    // Progress bar for continue-watching
    if (containerId === 'continue-watching-list') {
      const cwList = getSavedList();
      const saved  = cwList.find(i => i.id === item.id);
      if (saved?.savedProgress && saved?.duration) {
        const pct = Math.min((saved.savedProgress / saved.duration) * 100, 100);
        const bar = document.createElement('div');
        bar.className = 'card-progress';
        bar.style.width = `${pct}%`;
        card.appendChild(bar);
      }
    }

    card.addEventListener('click', () => showDetails(item));
    container.appendChild(card);
  });
}

/* ──────────────────────────────────────────
   CONTINUE WATCHING (localStorage)
────────────────────────────────────────── */
const CW_KEY = 'nf_cw_v2';

function getSavedList() {
  try { return JSON.parse(localStorage.getItem(CW_KEY)) || []; }
  catch { return []; }
}

function addToContinueWatching(item) {
  let list = getSavedList().filter(i => i.id !== item.id);
  list.unshift(item);
  if (list.length > 20) list = list.slice(0, 20);
  localStorage.setItem(CW_KEY, JSON.stringify(list));
  loadContinueWatching();
}

function loadContinueWatching() {
  const list    = getSavedList();
  const section = document.getElementById('continue-watching-section');
  if (list.length > 0) {
    section.style.display = 'block';
    renderCards(list, 'continue-watching-list');
  } else {
    section.style.display = 'none';
  }
}

/* ──────────────────────────────────────────
   MODAL — SHOW DETAILS
────────────────────────────────────────── */
async function showDetails(item) {
  item.media_type = item.media_type || (item.name && !item.title ? 'tv' : 'movie');
  currentItem = item;

  addToContinueWatching(item);

  // Populate fields
  document.getElementById('modal-title').textContent       = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';

  const stars = Math.round((item.vote_average || 0) / 2);
  document.getElementById('modal-rating').textContent      = stars > 0 ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : '';

  const typeBadge = document.getElementById('modal-type-badge');
  typeBadge.textContent = item.media_type === 'tv' ? 'TV Series' : 'Movie';

  // Show modal
  document.getElementById('modal').style.display         = 'flex';
  document.getElementById('modal-image').style.display   = 'none';
  document.getElementById('video-wrapper').style.display = 'block';
  document.body.style.overflow                           = 'hidden';

  const tvControls = document.getElementById('tv-controls');

if (item.media_type === 'tv') {
  tvControls.style.display = 'block';
  await loadSeasons(item.id);
} else {
  tvControls.style.display = 'none';
  playMovie(item.id);
}

// AUTO FULLSCREEN AFTER OPEN MOVIE
setTimeout(() => {
  toggleFullscreen();
}, 800);

  // Scroll modal to top
  const box = document.getElementById('modal-content-box');
  if (box) box.scrollTop = 0;
}

/* ──────────────────────────────────────────
   MODAL — CLOSE
────────────────────────────────────────── */
function closeModal() {
  document.getElementById('modal').style.display         = 'none';
  document.getElementById('modal-video').src             = '';
  document.getElementById('video-wrapper').style.display = 'none';
  document.body.style.overflow                           = 'auto';
  currentItem = null;
}

function handleModalBackdropClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

/* ──────────────────────────────────────────
   PLAYER — MOVIE
────────────────────────────────────────── */
function playMovie(id) {
  const saved    = getSavedList().find(i => i.id === id);
  const progress = saved?.savedProgress ? `&progress=${saved.savedProgress}` : '';
  document.getElementById('modal-video').src =
    `https://player.videasy.net/movie/${id}?overlay=true${progress}`;
}

/* ──────────────────────────────────────────
   PLAYER — TV EPISODE
────────────────────────────────────────── */
function playEpisode(season, episode) {
  currentSeasonNum  = parseInt(season);
  currentEpisodeNum = parseInt(episode);

  const saved    = getSavedList().find(i => i.id === currentItem?.id);
  const sameEp   = saved?.savedSeason === currentSeasonNum && saved?.savedEpisode === currentEpisodeNum;
  const progress = sameEp && saved?.savedProgress ? `&progress=${saved.savedProgress}` : '';

  const params = `?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true${progress}`;
  document.getElementById('modal-video').src =
    `https://player.videasy.net/tv/${currentItem.id}/${currentSeasonNum}/${currentEpisodeNum}${params}`;

  // Highlight active episode
  document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`ep-${currentSeasonNum}-${currentEpisodeNum}`);
  if (activeEl) {
    activeEl.classList.add('active');
    // Scroll into view inside episode list
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ──────────────────────────────────────────
   TV — LOAD SEASONS
────────────────────────────────────────── */
async function loadSeasons(tvId) {
  try {
    const data   = await api(`/tv/${tvId}`);
    const select = document.getElementById('season-selector');
    select.innerHTML = '';

    const seasons = (data.seasons || []).filter(s => s.season_number > 0);
    if (seasons.length === 0) {
      document.getElementById('tv-controls').style.display = 'none';
      return;
    }

    seasons.forEach(s => {
      const opt = document.createElement('option');
      opt.value       = s.season_number;
      opt.textContent = s.name || `Season ${s.season_number}`;
      select.appendChild(opt);
    });

    await loadEpisodes();
  } catch (err) {
    console.warn('loadSeasons error:', err);
    document.getElementById('tv-controls').style.display = 'none';
  }
}

/* ──────────────────────────────────────────
   TV — LOAD EPISODES
────────────────────────────────────────── */
async function loadEpisodes() {
  if (!currentItem) return;

  const seasonNumber = document.getElementById('season-selector').value;
  const epList       = document.getElementById('episode-list');

  // Show loading skeleton
  epList.innerHTML = '<div style="padding:20px;color:#555;text-align:center;font-size:.85rem">Loading episodes...</div>';

  try {
    const data = await api(`/tv/${currentItem.id}/season/${seasonNumber}`);
    epList.innerHTML = '';

    const episodes = data.episodes || [];

    episodes.forEach(ep => {
      const div = document.createElement('div');
      div.className = 'episode-item';
      div.id        = `ep-${seasonNumber}-${ep.episode_number}`;

      const thumbSrc = ep.still_path
        ? img(ep.still_path, 'w300')
        : `https://placehold.co/96x54/1f1f1f/555?text=Ep+${ep.episode_number}`;

      const runtime = ep.runtime ? `${ep.runtime}m` : '';

      div.innerHTML = `
        <img class="episode-thumbnail" src="${thumbSrc}" alt="Episode ${ep.episode_number}" loading="lazy" />
        <div class="episode-info">
          <h4>${ep.episode_number}. ${ep.name || 'Untitled'}</h4>
          <p>${ep.overview || 'No description available.'}</p>
        </div>
        ${runtime ? `<span class="episode-duration">${runtime}</span>` : ''}
      `;

      div.addEventListener('click', () => playEpisode(seasonNumber, ep.episode_number));
      epList.appendChild(div);
    });

    if (episodes.length > 0) {
      playEpisode(seasonNumber, episodes[0].episode_number);
    }
  } catch (err) {
    console.warn('loadEpisodes error:', err);
    epList.innerHTML = '<div style="padding:20px;color:#555;text-align:center;font-size:.85rem">Could not load episodes.</div>';
  }
}

/* ──────────────────────────────────────────
   WATCH PROGRESS — SAVE (postMessage)
────────────────────────────────────────── */
window.addEventListener('message', e => {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (data?.time !== undefined) saveProgress(data.time, data.duration);
  } catch { /* ignore */ }
}, { passive: true });

function saveProgress(time, duration) {
  if (!currentItem) return;
  let list  = getSavedList();
  const idx = list.findIndex(i => i.id === currentItem.id);
  if (idx === -1) return;

  list[idx].savedProgress = Math.floor(time);
  if (duration) list[idx].duration = Math.floor(duration);

  if (currentItem.media_type === 'tv') {
    list[idx].savedSeason  = currentSeasonNum;
    list[idx].savedEpisode = currentEpisodeNum;
  }

  localStorage.setItem(CW_KEY, JSON.stringify(list));
}

/* ──────────────────────────────────────────
   SEARCH MODAL
────────────────────────────────────────── */
async function openSearchModal() {
  const modal = document.getElementById('search-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Slight delay so modal is visible before focusing
  setTimeout(() => document.getElementById('search-input').focus(), 80);

  // Pre-fill with trending
  const input = document.getElementById('search-input');
  if (!input.value.trim()) {
    await loadSearchDefaults();
  }
}

async function loadSearchDefaults() {
  try {
    const data = await api('/trending/all/day');
    renderSearchResults(data.results, 'Trending');
  } catch { /* ignore */ }
}

function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML   = '';
  document.getElementById('search-input').value         = '';
  document.body.style.overflow                          = 'auto';
}

async function searchTMDB() {
  clearTimeout(searchDebounce);
  const query = document.getElementById('search-input').value.trim();

  if (!query) {
    await loadSearchDefaults();
    return;
  }

  searchDebounce = setTimeout(async () => {
    try {
      const data = await api(`/search/multi?query=${encodeURIComponent(query)}`);
      if (data.results.length === 0) {
        document.getElementById('search-results').innerHTML =
          '<p class="results-title" style="color:#666;text-align:center;grid-column:1/-1;padding:40px 0">No results found.</p>';
      } else {
        renderSearchResults(data.results, `Results for "${query}"`);
      }
    } catch { /* ignore */ }
  }, 350);
}

function renderSearchResults(items, title) {
  const container = document.getElementById('search-results');
  container.innerHTML = '';

  if (title) {
    const h = document.createElement('h2');
    h.className   = 'results-title';
    h.textContent = title;
    container.appendChild(h);
  }

  items.forEach(item => {
    if (!item.poster_path) return;

    const card = document.createElement('div');
    card.className = 'result-card';

    const image = document.createElement('img');
    image.src     = img(item.poster_path, 'w342');
    image.alt     = item.title || item.name;
    image.loading = 'lazy';

    card.appendChild(image);
    card.addEventListener('click', () => {
      closeSearchModal();
      showDetails(item);
    });

    container.appendChild(card);
  });
}

/* ──────────────────────────────────────────
   GENRE FILTER
────────────────────────────────────────── */
const genreMap = {
  Action: 28, Comedy: 35, Drama: 18, 'Sci-Fi': 878,
  Horror: 27, Romance: 10749, Thriller: 53,
  Animation: 16, Fantasy: 14, Mystery: 9648
};

async function filterCategory(id, name) {
  try {
    const movies = await api(
      `/discover/movie?with_genres=${id}&sort_by=popularity.desc&page=1`
    );

    // Itago ang ibang sections
    document.querySelectorAll('.section').forEach(s => {
      if (s.id !== 'category-page') {
        s.style.display = 'none';
      }
    });

    // Ipakita ang category page
    document.getElementById('category-page').style.display = 'block';
    document.getElementById('category-title').textContent = name;

    // --- SETUP SCROLL BUTTONS PARA SA CATEGORY LIST ---
    const container = document.getElementById('category-list');
    let wrapper = container.parentElement;
    
    // Check natin kung nabalot na ba natin siya ng .row-container dati
    if (!wrapper.classList.contains('row-container')) {
      wrapper = document.createElement('div');
      wrapper.className = 'row-container';
      
      // I-insert ang wrapper sa DOM
      container.parentNode.insertBefore(wrapper, container);
      
      // Left Button
      const leftBtn = document.createElement("button");
      leftBtn.className = "scroll-btn left-btn";
      leftBtn.innerHTML = "&#10094;";
      leftBtn.onclick = () => {
        container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
      };

      // Right Button
      const rightBtn = document.createElement("button");
      rightBtn.className = "scroll-btn right-btn";
      rightBtn.innerHTML = "&#10095;";
      rightBtn.onclick = () => {
        container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
      };

      // Ipasok sa loob ng wrapper
      wrapper.appendChild(leftBtn);
      wrapper.appendChild(container);
      wrapper.appendChild(rightBtn);
    }
    // ------------------------------------------------

    // I-render ang mga cards
    renderCards(movies.results, 'category-list');

    // Scroll pa-taas
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  } catch {
    showToast("Failed loading category");
  }
}
/* ──────────────────────────────────────────
   FULLSCREEN
────────────────────────────────────────── */
function toggleFullscreen() {
  const wrapper = document.getElementById('video-wrapper');
  const icon    = document.getElementById('fullscreen-icon');
  const iframe  = document.getElementById('modal-video');

  const isFs = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );

  if (isFs) {
    // Exit fullscreen
    (document.exitFullscreen || document.webkitExitFullscreen ||
     document.mozCancelFullScreen || document.msExitFullscreen)
     .call(document);
  } else {
    // Try fullscreen on the wrapper first (shows video + controls)
    const el = wrapper;
    const req = el.requestFullscreen || el.webkitRequestFullscreen ||
                el.mozRequestFullScreen || el.msRequestFullscreen;

    if (req) {
      req.call(el).catch(() => {
        // Fallback: try the iframe directly (works on some Android browsers)
        const iframeReq = iframe.requestFullscreen || iframe.webkitRequestFullscreen ||
                          iframe.mozRequestFullScreen || iframe.msRequestFullscreen;
        if (iframeReq) iframeReq.call(iframe).catch(() => {
          showToast('📺 Use the player\'s own fullscreen button inside the video.');
        });
      });
    } else {
      showToast('📺 Tap the fullscreen icon inside the video player.');
    }
  }
}

// Update icon when fullscreen state changes
function onFullscreenChange() {
  const icon = document.getElementById('fullscreen-icon');
  if (!icon) return;
  const isFs = !!(
    document.fullscreenElement || document.webkitFullscreenElement ||
    document.mozFullScreenElement || document.msFullscreenElement
  );
  icon.className = isFs ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
}

document.addEventListener('fullscreenchange',       onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);
document.addEventListener('mozfullscreenchange',    onFullscreenChange);
document.addEventListener('MSFullscreenChange',     onFullscreenChange);

/* ──────────────────────────────────────────
   KEYBOARD SHORTCUTS
────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('modal').style.display === 'flex')      closeModal();
    if (document.getElementById('search-modal').style.display === 'flex') closeSearchModal();
  }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    openSearchModal();
  }
  if (e.key === 'f' || e.key === 'F') {
    if (document.getElementById('modal').style.display === 'flex' &&
        document.activeElement.tagName !== 'INPUT') {
      toggleFullscreen();
    }
  }
});

/* ──────────────────────────────────────────
   PROFILE (Placeholder)
────────────────────────────────────────── */
function toggleProfile() {
  showToast('👤 Profile coming soon!');
}

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
async function init() {
  loadGenres();
  loadContinueWatching();

  try {
    // Parallel fetch for speed
const trending = await api('/trending/all/day');

const bannerPool = trending.results.filter(i=>i.backdrop_path);

displayBanner(
bannerPool[Math.floor(Math.random()*bannerPool.length)]
);

await buildRows();

  } catch (err) {
    console.error('Init error:', err);
    document.getElementById('banner-title').textContent = 'NYEKFLIX';
    showToast('Could not load content. Check your connection.');
  }
}

init();
function backToHome(){

  document.getElementById(
    'category-page'
  ).style.display='none';


  document.querySelectorAll(
    '.section'
  ).forEach(section=>{

    if(
      section.id !== 'category-page'
    ){
      section.style.display='block';
    }

  });


  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}
function playBannerPreview(item){

  const banner = document.getElementById('banner');


  const iframe = document.createElement('iframe');


  iframe.src =
  `https://player.videasy.net/${item.media_type || 'movie'}/${item.id}?autoplay=true&muted=true`;


  iframe.allow =
  "autoplay; fullscreen";


  iframe.style.position="absolute";
  iframe.style.inset="0";
  iframe.style.width="100%";
  iframe.style.height="100%";
  iframe.style.border="0";
  iframe.style.zIndex="0";


  banner.appendChild(iframe);


  document.querySelector(
    '.banner-gradient'
  ).style.zIndex="2";


  document.querySelector(
    '.banner-content'
  ).style.zIndex="3";

}
async function loadGenres(){

try{

const movieGenres =
await api('/genre/movie/list');


const tvGenres =
await api('/genre/tv/list');


// combine movie + tv
const allGenres = [
 ...movieGenres.genres,
 ...tvGenres.genres
];


// remove duplicate
genres =
allGenres.filter(
(g,i,self)=>
i === self.findIndex(
x=>x.id===g.id
)
);


renderGenres();


}catch(err){

console.log("Genre error",err);

}

}
function renderGenres() {
  const container = document.getElementById('genre-list');
  container.innerHTML = "";

  // Balutin ng wrapper ang genre list para sa buttons kung wala pa
  let wrapper = container.parentElement;
  if (!wrapper.classList.contains('row-container')) {
    wrapper = document.createElement('div');
    wrapper.className = 'row-container genre-row-wrapper';
    
    // I-insert ang wrapper bago ang container sa DOM
    container.parentNode.insertBefore(wrapper, container);
    
    // --- LEFT BUTTON ---
    const leftBtn = document.createElement("button");
    leftBtn.className = "scroll-btn left-btn";
    leftBtn.innerHTML = "&#10094;";
    leftBtn.onclick = () => {
      // Half-screen scroll para mas smooth maghanap ng genre
      container.scrollBy({ left: -container.clientWidth / 2, behavior: 'smooth' });
    };

    // --- RIGHT BUTTON ---
    const rightBtn = document.createElement("button");
    rightBtn.className = "scroll-btn right-btn";
    rightBtn.innerHTML = "&#10095;";
    rightBtn.onclick = () => {
      container.scrollBy({ left: container.clientWidth / 2, behavior: 'smooth' });
    };

    // Ipasok ang left button, yung genre list mismo, at right button sa loob ng wrapper
    wrapper.appendChild(leftBtn);
    wrapper.appendChild(container); 
    wrapper.appendChild(rightBtn);
  }

  // I-render ang mga genre buttons gaya ng dati
  genres.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genre-btn';
    btn.textContent = g.name;
    btn.onclick = () => {
      filterCategory(g.id, g.name);
    };
    container.appendChild(btn);
  });
}
async function buildRows() {
  const main = document.querySelector("main");
  document.querySelectorAll(".dynamic-row").forEach(e => e.remove());

  for (const row of HOME_ROWS) {
    const section = document.createElement("section");
    section.className = "section dynamic-row";
    
    const title = document.createElement("h2");
    title.className = "section-title";
    title.textContent = row.title;

    // Container na magho-hold sa carousel at buttons
    const rowContainer = document.createElement("div");
    rowContainer.className = "row-container";
    rowContainer.style.position = "relative";
    rowContainer.style.display = "flex";
    rowContainer.style.alignItems = "center";

    const list = document.createElement("div");
    list.className = "carousel";
    const id = "row-" + Math.random().toString(36).substring(2);
    list.id = id;

    // --- LEFT BUTTON ---
    const leftBtn = document.createElement("button");
    leftBtn.className = "scroll-btn left-btn";
    leftBtn.innerHTML = "&#10094;"; // '<' icon
    leftBtn.onclick = () => {
      // Mag-i-scroll pabalik base sa lapad ng carousel
      list.scrollBy({ left: -list.clientWidth, behavior: 'smooth' });
    };

    // --- RIGHT BUTTON ---
    const rightBtn = document.createElement("button");
    rightBtn.className = "scroll-btn right-btn";
    rightBtn.innerHTML = "&#10095;"; // '>' icon
    rightBtn.onclick = () => {
      // Mag-i-scroll paabante base sa lapad ng carousel
      list.scrollBy({ left: list.clientWidth, behavior: 'smooth' });
    };

    // Pagsama-samahin sa container
    rowContainer.appendChild(leftBtn);
    rowContainer.appendChild(list);
    rowContainer.appendChild(rightBtn);

    section.appendChild(title);
    section.appendChild(rowContainer);
    
    main.appendChild(section);

    loadRow(row, id);
  }
}
async function loadRow(row, id) {

    rowPages[id] = 1;

    const separator = row.endpoint.includes("?") ? "&" : "?";

    const data = await api(
        `${row.endpoint}${separator}page=1`
    );

    renderCards(
        data.results,
        id
    );

    enableInfiniteRow(
        id,
        row
    );
}
function enableInfiniteRow(id, row) {

    const box = document.getElementById(id);

    box.addEventListener("scroll", async () => {

        if (box.scrollLeft + box.clientWidth >= box.scrollWidth - 300) {

            rowPages[id]++;

            let page = rowPages[id];

            if (page > 500) {
                page = 1;
                rowPages[id] = 1;
            }

            const separator = row.endpoint.includes("?") ? "&" : "?";

            const data = await api(
                `${row.endpoint}${separator}page=${page}`
            );

            appendCards(
                data.results,
                id
            );
        }

    });

}
function appendCards(items,id){

const container=document.getElementById(id);

items.forEach(item=>{

if(!item.poster_path)return;

const card=document.createElement("div");

card.className="content-card";

card.style.backgroundImage=
`url(${img(item.poster_path,"w342")})`;

card.onclick=()=>showDetails(item);

container.appendChild(card);

});

}