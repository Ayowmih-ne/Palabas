/* =========================================
   NYEKFLIX — home.js (Optimized v2)
========================================= */
'use strict';

const API_KEY = '838275398c9b97c59f8109b1ee6de82f';
const BASE    = 'https://api.themoviedb.org/3';
const IMG     = 'https://image.tmdb.org/t/p';

// State
let currentItem      = null;
let currentSeasonNum = 1;
let currentEpisodeNum = 1;
let searchDebounce   = null;
let bannerItems      = [];

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
  document.getElementById('banner-play-btn').onclick      = () => showDetails(item);
  document.getElementById('banner-info-btn').onclick      = () => showDetails(item);
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

async function filterCategory(name) {
  const genreId = genreMap[name];
  if (!genreId) return;

  try {
    const data = await api(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`);
    openSearchModal();
    document.getElementById('search-input').value = name;
    renderSearchResults(data.results, `${name} Movies`);
  } catch { showToast('Could not load genre.'); }
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
  loadContinueWatching();

  try {
    // Parallel fetch for speed
    const [trending, topMovies, topTV] = await Promise.all([
      api('/trending/all/day'),
      api('/trending/movie/day'),
      api('/trending/tv/day'),
    ]);

    const bannerPool = trending.results.filter(i => i.backdrop_path);
    if (bannerPool.length > 0) {
      const pick = bannerPool[Math.floor(Math.random() * Math.min(bannerPool.length, 5))];
      displayBanner(pick);
    }

    renderCards(trending.results, 'trending-now-list');
    renderCards(topMovies.results.slice(0, 10), 'top-10-movies-list', true);
    renderCards(topTV.results.slice(0, 10), 'top-10-tv-list', true);

  } catch (err) {
    console.error('Init error:', err);
    document.getElementById('banner-title').textContent = 'NYEKFLIX';
    showToast('Could not load content. Check your connection.');
  }
}

init();
