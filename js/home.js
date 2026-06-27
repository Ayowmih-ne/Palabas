/* =========================================
   NYEKFLIX — home.js
========================================= */
'use strict';

const API_KEY = '838275398c9b97c59f8109b1ee6de82f';

const BASE = window.NYEKFLIX_SERVER.tmdb;
const IMG  = window.NYEKFLIX_SERVER.image;

const rowPages = {};

// State
let currentItem       = null;
let currentSeasonNum  = 1;
let currentEpisodeNum = 1;
let searchDebounce    = null;
let genres            = [];

const IS_MOBILE_VIEW = window.matchMedia?.('(max-width: 640px), (hover: none), (pointer: coarse)')?.matches || false;
const SAVE_DATA_MODE = navigator.connection?.saveData || false;

/* ──────────────────────────────────────────
   LOVE GATE & TOAST
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
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#141414;color:#fff;font-family:sans-serif;gap:20px;text-align:center;padding:20px;">
        <div style="font-size:4rem">💔</div>
        <h2 style="font-size:1.5rem">Ayaw mo pala...</h2>
        <p style="color:#aaa">Balik ka kapag handa ka na mag I love you. ❤️</p>
        <button onclick="location.reload()" style="background:#E50914;color:white;border:none;padding:12px 28px;border-radius:50px;font-size:1rem;font-weight:700;cursor:pointer;">Ayoko na, babalik na ko ❤️</button>
      </div>`;
  }, 800);
}

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

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ──────────────────────────────────────────
   MEDIA LABEL HELPER
────────────────────────────────────────── */
function getMediaLabel(item) {
  if (item.is_anilist) return 'Anime';

  if (item.media_type === 'tv') return 'TV Series';
  if (item.media_type === 'movie') return 'Movie';

  if (item.first_air_date && !item.release_date) return 'TV Series';
  if (item.release_date) return 'Movie';

  return 'Movie';
}

function getCardTitle(item) {
  return item.title || item.name || 'Unknown';
}

/* ──────────────────────────────────────────
   API FETCH HELPERS
────────────────────────────────────────── */
async function api(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}api_key=${API_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

async function apiAnilist(sort, page = 1) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (type: ANIME, sort: [$sort]) {
          id
          title { romaji english }
          coverImage { large }
          bannerImage
          description
          averageScore
          episodes
          nextAiringEpisode { episode }
        }
      }
    }
  `;

  const variables = { page: page, perPage: 20, sort: sort };

  const res = await fetch(window.NYEKFLIX_SERVER.anilist, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json();

  return json.data.Page.media.map(media => ({
    id: media.id,
    title: media.title.english || media.title.romaji,
    name: media.title.english || media.title.romaji,
    overview: media.description ? media.description.replace(/<[^>]*>?/gm, '') : 'No description available.',
    poster_path: media.coverImage.large,
    backdrop_path: media.bannerImage,
    vote_average: media.averageScore ? (media.averageScore / 10) : 0,
    media_type: 'anime',
    is_anilist: true,
    total_episodes: media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : 12)
  }));
}

function img(path, size = 'w500') {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${IMG}/${size}${path}`;
}

/* ──────────────────────────────────────────
   SCROLL WRAPPER
────────────────────────────────────────── */
function createScrollWrapper(list, opts = {}) {
  if (list.parentElement?.classList.contains('row-container')) return;

  const { halfScroll = false, extraClass = '' } = opts;
  const wrapper = document.createElement('div');
  wrapper.className = `row-container${extraClass ? ' ' + extraClass : ''}`;

  const makeBtn = (dir) => {
    const btn = document.createElement('button');
    btn.className = `scroll-btn ${dir}-btn`;
    btn.innerHTML = dir === 'left'
      ? '<i class="fa-solid fa-chevron-left"></i>'
      : '<i class="fa-solid fa-chevron-right"></i>';

    btn.setAttribute('aria-label', dir === 'left' ? 'Scroll left' : 'Scroll right');

    btn.onclick = () => {
      const delta = halfScroll ? list.clientWidth / 2 : list.clientWidth;
      list.scrollBy({
        left: dir === 'left' ? -delta : delta,
        behavior: 'smooth'
      });
    };

    return btn;
  };

  list.parentNode.insertBefore(wrapper, list);
  wrapper.appendChild(makeBtn('left'));
  wrapper.appendChild(list);
  wrapper.appendChild(makeBtn('right'));
}

/* ──────────────────────────────────────────
   BANNER & CARDS
────────────────────────────────────────── */
function displayBanner(item) {
  const banner = document.getElementById('banner');
  const bgUrl  = item.backdrop_path ? img(item.backdrop_path, 'original') : '';

  if (bgUrl) {
    const preload = new Image();
    preload.onload = () => {
      banner.style.backgroundImage = `url(${bgUrl})`;
    };
    preload.src = bgUrl;
  }

  document.getElementById('banner-title').textContent    = getCardTitle(item);
  document.getElementById('banner-overview').textContent = item.overview || '';
  document.getElementById('banner-play-btn').onclick     = () => showDetails(item);
  document.getElementById('banner-info-btn').onclick     = () => showDetails(item);

  if (!IS_MOBILE_VIEW && !SAVE_DATA_MODE) {
    setTimeout(() => playBannerPreview(item), 1000);
  }
}

function playBannerPreview(item) {
  const banner = document.getElementById('banner');
  if (!banner) return;

  // One hidden preview iframe is enough. Removing the old one avoids mobile lag / doubled audio.
  banner.querySelectorAll('.banner-preview-frame').forEach(frame => frame.remove());

  const iframe = document.createElement('iframe');
  iframe.className = 'banner-preview-frame';

  if (item.is_anilist) {
    iframe.src = window.NYEKFLIX_PLAYER.anime(item.id, 1);
  } else if (item.media_type === 'tv' || (item.name && !item.title)) {
    iframe.src = window.NYEKFLIX_PLAYER.tv(item.id, 1, 1);
  } else {
    iframe.src = window.NYEKFLIX_PLAYER.movie(item.id);
  }

  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  iframe.loading = 'lazy';

  Object.assign(iframe.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    border: '0',
    zIndex: '0',
    pointerEvents: 'none'
  });

  banner.appendChild(iframe);

  document.querySelector('.banner-gradient').style.zIndex = '2';
  document.querySelector('.banner-content').style.zIndex  = '3';
}

/* STEP 2: Homepage / Continue Watching cards */
function renderCards(items, containerId, ranked = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  items.forEach((item, idx) => {
    if (!item.poster_path) return;

    const card = document.createElement('div');
    card.className = 'content-card skeleton';

    const image = new Image();
    image.onload = () => {
      card.classList.remove('skeleton');
      card.style.backgroundImage = `url(${img(item.poster_path, 'w342')})`;
    };
    image.src = img(item.poster_path, 'w342');

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `
      <div class="card-title">${getCardTitle(item)}</div>
      <div class="card-type">${getMediaLabel(item)}</div>
    `;
    card.appendChild(info);

    if (ranked) {
      const rank = document.createElement('div');
      rank.className   = 'rank-number';
      rank.textContent = idx + 1;
      card.appendChild(rank);
    }

    if (containerId === 'continue-watching-list') {
      const saved = getSavedItem(item);
      if (saved?.savedProgress && saved?.duration) {
        const pct = Math.min((saved.savedProgress / saved.duration) * 100, 100);
        const bar = document.createElement('div');
        bar.className   = 'card-progress';
        bar.style.width = `${pct}%`;
        card.appendChild(bar);
      }
    }

    card.addEventListener('click', () => showDetails(item));
    container.appendChild(card);
  });
}

/* STEP 3: Infinite horizontal row cards */
function appendCards(items, id) {
  const container = document.getElementById(id);
  if (!container) return;

  items.forEach(item => {
    if (!item.poster_path) return;

    const card = document.createElement('div');
    card.className = 'content-card';
    card.style.backgroundImage = `url(${img(item.poster_path, 'w342')})`;

    card.innerHTML = `
      <div class="card-info">
        <div class="card-title">${getCardTitle(item)}</div>
        <div class="card-type">${getMediaLabel(item)}</div>
      </div>
    `;

    card.onclick = () => showDetails(item);
    container.appendChild(card);
  });
}

/* ──────────────────────────────────────────
   CONTINUE WATCHING
────────────────────────────────────────── */
const CW_KEY = 'nf_cw_v2';

function getStoredMediaType(item = {}) {
  if (item.is_anilist || item.media_type === 'anime' || item.mediaType === 'anime') return 'anime';
  if (item.media_type === 'tv' || item.mediaType === 'tv' || (item.first_air_date && !item.release_date) || (item.name && !item.title)) return 'tv';
  return 'movie';
}

function getContinueKey(item = {}) {
  return item.cwKey || `${getStoredMediaType(item)}:${item.id}`;
}

function normalizeSavedItem(item = {}) {
  const mediaType = getStoredMediaType(item);
  return {
    ...item,
    media_type: item.media_type || mediaType,
    mediaType,
    cwKey: item.cwKey || `${mediaType}:${item.id}`
  };
}

function getSavedList() {
  try {
    const raw = JSON.parse(localStorage.getItem(CW_KEY)) || [];
    const seen = new Set();

    return raw
      .filter(item => item && item.id)
      .map(normalizeSavedItem)
      .filter(item => {
        if (seen.has(item.cwKey)) return false;
        seen.add(item.cwKey);
        return true;
      });
  } catch {
    return [];
  }
}

function getSavedItem(item) {
  if (!item?.id) return null;
  const key = getContinueKey(item);

  // Prefer the new movie/tv/anime key. Fallback keeps old saved data working.
  return getSavedList().find(i => i.cwKey === key) ||
    getSavedList().find(i => i.id === item.id);
}

function addToContinueWatching(item, overrides = {}, options = {}) {
  if (!item?.id) return item;

  const incoming = normalizeSavedItem({ ...item, ...overrides });
  const key = incoming.cwKey;
  let list = getSavedList();
  const existing = list.find(i => i.cwKey === key) || null;

  const merged = normalizeSavedItem({
    ...existing,
    ...incoming,

    // Keep resume data when opening from homepage/search.
    savedProgress: incoming.savedProgress ?? existing?.savedProgress,
    duration: incoming.duration ?? existing?.duration,
    savedSeason: incoming.savedSeason ?? existing?.savedSeason,
    savedEpisode: incoming.savedEpisode ?? existing?.savedEpisode,
    lastWatchedAt: Date.now()
  });

  list = list.filter(i => i.cwKey !== key);
  list.unshift(merged);

  if (list.length > 20) list = list.slice(0, 20);

  localStorage.setItem(CW_KEY, JSON.stringify(list));

  if (options.refresh !== false) {
    loadContinueWatching();
  }

  return merged;
}

function loadContinueWatching() {
  const list    = getSavedList();
  const section = document.getElementById('continue-watching-section');

  if (!section) return;

  section.style.display = list.length > 0 ? 'block' : 'none';

  if (list.length > 0) {
    renderCards(list, 'continue-watching-list');
  }
}

/* ──────────────────────────────────────────
   MODAL
────────────────────────────────────────── */
async function showDetails(item) {
  item.media_type = item.media_type || getStoredMediaType(item);

  // This returns the item merged with the old saved season/episode/progress.
  currentItem = addToContinueWatching(item);

  document.getElementById('modal-title').textContent       = getCardTitle(currentItem);
  document.getElementById('modal-description').textContent = currentItem.overview || 'No description available.';

  const stars = Math.round((currentItem.vote_average || 0) / 2);

  document.getElementById('modal-rating').textContent =
    stars > 0 ? '★'.repeat(stars) + '☆'.repeat(5 - stars) : '';

  document.getElementById('modal-type-badge').textContent = getMediaLabel(currentItem);

  document.getElementById('modal').style.display         = 'flex';
  document.getElementById('modal-image').style.display   = 'none';
  document.getElementById('video-wrapper').style.display = 'block';
  document.body.style.overflow                           = 'hidden';

  const tvControls   = document.getElementById('tv-controls');
  const seasonSelect = document.getElementById('season-selector');

  if (currentItem.is_anilist || currentItem.media_type === 'anime') {
    tvControls.style.display   = 'block';
    seasonSelect.style.display = 'none';
    loadAnilistEpisodes();
  } else if (currentItem.media_type === 'tv') {
    tvControls.style.display   = 'block';
    seasonSelect.style.display = 'inline-block';
    await loadSeasons(currentItem.id);
  } else {
    tvControls.style.display = 'none';
    playMovie(currentItem.id);
  }

  const box = document.getElementById('modal-content-box');
  if (box) box.scrollTop = 0;
}

function closeModal() {
  if (pendingProgress) {
    saveProgress(pendingProgress.time, pendingProgress.duration);
    pendingProgress = null;
    clearTimeout(progressSaveTimer);
    progressSaveTimer = null;
  }

  document.getElementById('modal').style.display         = 'none';
  document.getElementById('modal-video').src             = '';
  document.getElementById('video-wrapper').style.display = 'none';
  document.body.style.overflow                           = 'auto';
  currentItem = null;
  loadContinueWatching();
}

function handleModalBackdropClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

/* ──────────────────────────────────────────
   PLAYER
────────────────────────────────────────── */

function triggerSubtitleToast() {
  setTimeout(() => {
    showToast("🍿 Hanapin ang 'CC' icon sa video para sa Subtitles/Dub!", 4000);
  }, 2000);
}

function setPlayerSrc(url) {
  const iframe = document.getElementById('modal-video');
  if (!iframe) return;

  // Setting src in one place helps avoid duplicate loads on mobile browsers.
  if (iframe.src !== url) iframe.src = url;
}

function playMovie(id) {
  const saved = getSavedItem({ id, media_type: 'movie' });

  const progress = saved?.savedProgress
    ? saved.savedProgress
    : null;

  setPlayerSrc(window.NYEKFLIX_PLAYER.movie(id, progress));
  triggerSubtitleToast();
}

function playEpisode(season, episode) {
  currentSeasonNum  = parseInt(season, 10) || 1;
  currentEpisodeNum = parseInt(episode, 10) || 1;

  const saved = getSavedItem(currentItem);

  const sameEp =
    Number(saved?.savedSeason) === currentSeasonNum &&
    Number(saved?.savedEpisode) === currentEpisodeNum;

  const progress = sameEp && saved?.savedProgress
    ? saved.savedProgress
    : null;

  currentItem = addToContinueWatching(currentItem, {
    savedSeason: currentSeasonNum,
    savedEpisode: currentEpisodeNum,
    savedProgress: sameEp ? (saved?.savedProgress || 0) : 0,
    duration: sameEp ? (saved?.duration || 0) : 0
  });

  setPlayerSrc(window.NYEKFLIX_PLAYER.tv(
    currentItem.id,
    currentSeasonNum,
    currentEpisodeNum,
    progress
  ));

  document.querySelectorAll('.episode-item').forEach(el => {
    el.classList.remove('active');
  });

  const active = document.getElementById(`ep-${currentSeasonNum}-${currentEpisodeNum}`);

  if (active) {
    active.classList.add('active');
    active.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  triggerSubtitleToast();
}

function playAnilistEpisode(episode) {
  currentEpisodeNum = parseInt(episode, 10) || 1;

  const saved = getSavedItem(currentItem);

  const sameEp = Number(saved?.savedEpisode) === currentEpisodeNum;

  const progress = sameEp && saved?.savedProgress
    ? saved.savedProgress
    : null;

  currentItem = addToContinueWatching(currentItem, {
    savedEpisode: currentEpisodeNum,
    savedProgress: sameEp ? (saved?.savedProgress || 0) : 0,
    duration: sameEp ? (saved?.duration || 0) : 0
  });

  setPlayerSrc(window.NYEKFLIX_PLAYER.anime(
    currentItem.id,
    currentEpisodeNum,
    progress
  ));

  document.querySelectorAll('.episode-item').forEach(el => {
    el.classList.remove('active');
  });

  const active = document.getElementById(`ep-ani-${currentEpisodeNum}`);

  if (active) {
    active.classList.add('active');
    active.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  triggerSubtitleToast();
}

/* ──────────────────────────────────────────
   ANILIST EPISODES
────────────────────────────────────────── */
function loadAnilistEpisodes() {
  const epList = document.getElementById('episode-list');
  epList.innerHTML = '';

  const total = currentItem.total_episodes || 12;

  for (let i = 1; i <= total; i++) {
    const div = document.createElement('div');
    div.className = 'episode-item';
    div.id = `ep-ani-${i}`;

    div.innerHTML = `
      <div style="width:96px;height:54px;background:#1a1a1a;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#E50914;flex-shrink:0;">
        <i class="fa-solid fa-play"></i>
      </div>
      <div class="episode-info">
        <h4>Episode ${i}</h4>
        <p style="color:#aaa">Anime Episode</p>
      </div>
    `;

    div.addEventListener('click', () => playAnilistEpisode(i));
    epList.appendChild(div);
  }

  if (total > 0) {
    const saved   = getSavedItem(currentItem);
    const startEp = Math.min(Math.max(Number(saved?.savedEpisode || currentItem.savedEpisode || 1), 1), total);
    playAnilistEpisode(startEp);
  }
}

/* ──────────────────────────────────────────
   TMDB TV SEASONS
────────────────────────────────────────── */
async function loadSeasons(tvId) {
  try {
    const data   = await api(`/tv/${tvId}`);
    const select = document.getElementById('season-selector');

    select.innerHTML = '';

    const seasons = (data.seasons || []).filter(s => s.season_number > 0);

    if (!seasons.length) {
      document.getElementById('tv-controls').style.display = 'none';
      return;
    }

    seasons.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.season_number;
      opt.textContent = s.name || `Season ${s.season_number}`;
      select.appendChild(opt);
    });

    const saved = getSavedItem(currentItem);
    const savedSeason = Number(saved?.savedSeason || currentItem.savedSeason);
    const hasSavedSeason = seasons.some(s => Number(s.season_number) === savedSeason);

    select.value = hasSavedSeason
      ? String(savedSeason)
      : String(seasons[0].season_number);

    await loadEpisodes({ resumeSaved: true });
  } catch (err) {
    document.getElementById('tv-controls').style.display = 'none';
  }
}

async function loadEpisodes(options = {}) {
  if (!currentItem) return;

  const select = document.getElementById('season-selector');
  const seasonNumber = Number(select.value) || 1;
  const epList       = document.getElementById('episode-list');

  epList.innerHTML =
    '<div style="padding:20px;color:#555;text-align:center;font-size:.85rem">Loading episodes...</div>';

  try {
    const data     = await api(`/tv/${currentItem.id}/season/${seasonNumber}`);
    const episodes = data.episodes || [];

    epList.innerHTML = '';

    episodes.forEach(ep => {
      const div = document.createElement('div');
      div.className = 'episode-item';
      div.id = `ep-${seasonNumber}-${ep.episode_number}`;

      const thumbSrc = ep.still_path
        ? img(ep.still_path, 'w300')
        : `https://placehold.co/96x54/1f1f1f/555?text=Ep+${ep.episode_number}`;

      div.innerHTML = `
        <img class="episode-thumbnail" src="${thumbSrc}" alt="Episode ${ep.episode_number}" loading="lazy" />
        <div class="episode-info">
          <h4>${ep.episode_number}. ${ep.name || 'Untitled'}</h4>
          <p>${ep.overview || 'No description available.'}</p>
        </div>
        ${ep.runtime ? `<span class="episode-duration">${ep.runtime}m</span>` : ''}
      `;

      div.addEventListener('click', () => playEpisode(seasonNumber, ep.episode_number));
      epList.appendChild(div);
    });

    if (episodes.length > 0) {
      const saved = getSavedItem(currentItem);
      const savedEpisode = Number(saved?.savedEpisode || currentItem.savedEpisode);
      const canResumeSaved =
        options.resumeSaved !== false &&
        Number(saved?.savedSeason || currentItem.savedSeason) === seasonNumber &&
        episodes.some(ep => Number(ep.episode_number) === savedEpisode);

      const startEpisode = canResumeSaved
        ? savedEpisode
        : episodes[0].episode_number;

      playEpisode(seasonNumber, startEpisode);
    }
  } catch (err) {
    epList.innerHTML =
      '<div style="padding:20px;color:#555;text-align:center;font-size:.85rem">Could not load episodes.</div>';
  }
}

/* ──────────────────────────────────────────
   WATCH PROGRESS
────────────────────────────────────────── */
let progressSaveTimer = null;
let pendingProgress = null;

window.addEventListener('message', e => {
  try {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

    // Some players send episode info on autoplay-next. If available, keep our state in sync.
    if (data?.season) currentSeasonNum = Number(data.season) || currentSeasonNum;
    if (data?.episode) currentEpisodeNum = Number(data.episode) || currentEpisodeNum;

    if (data?.time !== undefined) scheduleProgressSave(data.time, data.duration);
  } catch {
    // ignore non-player messages
  }
}, { passive: true });

function scheduleProgressSave(time, duration) {
  pendingProgress = { time, duration };

  if (progressSaveTimer) return;

  progressSaveTimer = setTimeout(() => {
    progressSaveTimer = null;
    if (!pendingProgress) return;

    const { time, duration } = pendingProgress;
    pendingProgress = null;
    saveProgress(time, duration);
  }, 1200);
}

function saveProgress(time, duration) {
  if (!currentItem) return;

  const safeTime = Math.max(0, Math.floor(Number(time) || 0));
  const safeDuration = Math.floor(Number(duration) || 0);

  const updates = {
    savedProgress: safeTime,
    duration: safeDuration || undefined
  };

  if (currentItem.media_type === 'tv' || currentItem.is_anilist || currentItem.media_type === 'anime') {
    if (!currentItem.is_anilist && currentItem.media_type !== 'anime') {
      updates.savedSeason = currentSeasonNum;
    }

    updates.savedEpisode = currentEpisodeNum;
  }

  currentItem = addToContinueWatching(currentItem, updates, { refresh: false });
}

/* ──────────────────────────────────────────
   SEARCH MODAL
────────────────────────────────────────── */
async function openSearchModal() {
  document.getElementById('search-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    document.getElementById('search-input').focus();
  }, 80);

  if (!document.getElementById('search-input').value.trim()) {
    await loadSearchDefaults();
  }
}

async function loadSearchDefaults() {
  try {
    const data = await api('/trending/all/day');
    renderSearchResults(data.results, 'Trending');
  } catch {
    // ignore
  }
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

      if (!data.results.length) {
        document.getElementById('search-results').innerHTML =
          '<p class="results-title" style="color:#666;text-align:center;grid-column:1/-1;padding:40px 0">No results found.</p>';
      } else {
        renderSearchResults(data.results, `Results for "${query}"`);
      }
    } catch {
      // ignore
    }
  }, 350);
}

/* STEP 4: Search result cards */
function renderSearchResults(items, title) {
  const container = document.getElementById('search-results');
  container.innerHTML = '';

  if (title) {
    const h = document.createElement('h2');
    h.className = 'results-title';
    h.textContent = title;
    container.appendChild(h);
  }

  items.forEach(item => {
    if (!item.poster_path) return;

    const card = document.createElement('div');
    card.className = 'result-card';

    const titleText = getCardTitle(item);

    card.innerHTML = `
      <img
        src="${img(item.poster_path, 'w342')}"
        alt="${titleText}"
        loading="lazy"
      />
      <div class="card-info">
        <div class="card-title">${titleText}</div>
        <div class="card-type">${getMediaLabel(item)}</div>
      </div>
    `;

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
let categoryPage = 1;
let categoryGenreId = null;
let categoryLoading = false;
let categoryObserver = null;

async function filterCategory(id, name) {
  categoryPage = 1;
  categoryGenreId = id;
  categoryLoading = false;

  if (categoryObserver) {
    categoryObserver.disconnect();
    categoryObserver = null;
  }

  document.querySelectorAll('.section').forEach(s => {
    s.style.display = s.id === 'category-page' ? 'block' : 'none';
  });

  document.getElementById('category-title').textContent = name;

  const grid = document.getElementById('category-grid');
  const sentinel = document.getElementById('category-sentinel');

  grid.innerHTML = '';
  sentinel.textContent = '⏳ Loading...';

  try {
    const data = await api(`/discover/movie?with_genres=${id}&sort_by=popularity.desc&page=1`);
    appendCategoryCards(data.results);
  } catch {
    showToast('Failed loading category');
    return;
  }

  categoryObserver = new IntersectionObserver(async entries => {
    if (!entries[0].isIntersecting || categoryLoading) return;

    categoryLoading = true;
    sentinel.textContent = '⏳ Loading more...';
    categoryPage++;

    try {
      const data = await api(`/discover/movie?with_genres=${categoryGenreId}&sort_by=popularity.desc&page=${categoryPage}`);
      appendCategoryCards(data.results);
    } catch {
      // ignore
    }

    categoryLoading = false;
    sentinel.textContent = '';
  }, { rootMargin: '300px' });

  categoryObserver.observe(sentinel);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* STEP 5: Category page cards */
function appendCategoryCards(items) {
  const grid = document.getElementById('category-grid');

  items.forEach(item => {
    if (!item.poster_path) return;

    const card = document.createElement('div');
    card.className = 'category-card skeleton';

    const image = new Image();
    image.onload = () => {
      card.classList.remove('skeleton');
      card.style.backgroundImage = `url(${img(item.poster_path, 'w342')})`;
    };
    image.src = img(item.poster_path, 'w342');

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `
      <div class="card-title">${getCardTitle(item)}</div>
      <div class="card-type">${getMediaLabel(item)}</div>
    `;

    card.appendChild(info);

    card.addEventListener('click', () => showDetails(item));
    grid.appendChild(card);
  });
}

function backToHome() {
  document.getElementById('category-page').style.display = 'none';

  document.querySelectorAll('.section').forEach(s => {
    if (s.id !== 'category-page') s.style.display = 'block';
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ──────────────────────────────────────────
   UTILS
────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  const modalOpen  = document.getElementById('modal').style.display === 'flex';
  const searchOpen = document.getElementById('search-modal').style.display === 'flex';
  const inInput    = document.activeElement.tagName === 'INPUT';

  if (e.key === 'Escape') {
    if (modalOpen) closeModal();
    if (searchOpen) closeSearchModal();
  }

  if (e.key === '/' && !inInput) {
    e.preventDefault();
    openSearchModal();
  }
});

function toggleProfile() {
  showToast('👤 Profile coming soon!');
}

/* ──────────────────────────────────────────
   GENRES
────────────────────────────────────────── */
async function loadGenres() {
  try {
    const [movieRes, tvRes] = await Promise.all([
      api('/genre/movie/list'),
      api('/genre/tv/list')
    ]);

    const all = [...movieRes.genres, ...tvRes.genres];

    genres = all.filter((g, i, self) =>
      i === self.findIndex(x => x.id === g.id)
    );

    renderGenres();
  } catch (err) {
    console.warn('Genre error', err);
  }
}

function renderGenres() {
  const container = document.getElementById('genre-list');
  container.innerHTML = '';

  createScrollWrapper(container, {
    halfScroll: true,
    extraClass: 'genre-row-wrapper'
  });

  genres.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genre-btn';
    btn.textContent = g.name;
    btn.onclick = () => filterCategory(g.id, g.name);
    container.appendChild(btn);
  });
}

/* ──────────────────────────────────────────
   HOME PAGE — DYNAMIC ROWS
────────────────────────────────────────── */
let homeScrollLoading = false;
let homeRowIndex      = 0;
let homeRowPool       = [];

const CORE_ENDPOINTS = [
  { title: '🔥 Trending Anime (AniList)', isAnilist: true, query: 'TRENDING_DESC' },
  { title: '⭐ Top Rated Anime (AniList)', isAnilist: true, query: 'SCORE_DESC' },
  { title: 'Trending Now',      endpoint: '/trending/all/day' },
  { title: 'Popular Movies',    endpoint: '/movie/popular' },
  { title: 'Popular TV Shows',  endpoint: '/tv/popular' },
  { title: 'New Releases',      endpoint: '/movie/now_playing' },
  { title: 'English Movies',    endpoint: '/discover/movie?with_original_language=en&sort_by=popularity.desc' },
  { title: 'K-Dramas',          endpoint: '/discover/tv?with_original_language=ko&sort_by=popularity.desc' },
  { title: 'Filipino Movies',   endpoint: '/discover/movie?with_origin_country=PH&sort_by=popularity.desc' },
];

const EXTRA_ENDPOINTS = [
  { title: 'Anime Classics',  isAnilist: true, query: 'POPULARITY_DESC' },
  { title: 'Spanish Movies',  endpoint: '/discover/movie?with_original_language=es&sort_by=popularity.desc' },
  { title: 'Hindi Movies',    endpoint: '/discover/movie?with_original_language=hi&sort_by=popularity.desc' },
  { title: 'Thai Series',     endpoint: '/discover/tv?with_original_language=th&sort_by=popularity.desc' },
  { title: 'Documentary',     endpoint: '/discover/movie?with_genres=99&sort_by=popularity.desc' },
  { title: 'Crime TV',        endpoint: '/discover/tv?with_genres=80&sort_by=popularity.desc' },
  { title: 'Chinese Drama',   endpoint: '/discover/tv?with_original_language=zh&sort_by=popularity.desc' },
  { title: 'French Cinema',   endpoint: '/discover/movie?with_original_language=fr&sort_by=popularity.desc' },
];

function buildHomeRowPool() {
  homeRowPool = [...CORE_ENDPOINTS];

  genres.forEach(g => {
    if (g.id === 16 || g.name.toLowerCase() === 'animation') return;

    homeRowPool.push({
      title: `${g.name} Movies`,
      endpoint: `/discover/movie?with_genres=${g.id}&sort_by=popularity.desc`
    });

    homeRowPool.push({
      title: `${g.name} Series`,
      endpoint: `/discover/tv?with_genres=${g.id}&sort_by=popularity.desc`
    });
  });

  homeRowPool.push(...EXTRA_ENDPOINTS);

  for (let i = homeRowPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [homeRowPool[i], homeRowPool[j]] = [homeRowPool[j], homeRowPool[i]];
  }
}

async function loadMoreRows() {
  if (homeScrollLoading) return;

  homeScrollLoading = true;

  if (homeRowPool.length === 0) buildHomeRowPool();
  if (homeRowIndex >= homeRowPool.length) homeRowIndex = 0;

  const batch = homeRowPool.slice(homeRowIndex, homeRowIndex + 4);
  homeRowIndex += 4;

  try {
    const main     = document.querySelector('main');
    const sentinel = document.getElementById('home-sentinel');

    const rowResults = await Promise.all(batch.map(async row => {
      try {
        const id = 'row-' + Math.random().toString(36).substring(2);
        let data = [];

        if (row.isAnilist) {
          data = await apiAnilist(row.query, 1);
        } else {
          const sep = row.endpoint.includes('?') ? '&' : '?';
          const res = await api(`${row.endpoint}${sep}page=1`);
          data = res.results || [];
        }

        return { row, id, data };
      } catch {
        return { row, id: null, data: [] };
      }
    }));

    rowResults.forEach(({ row, id, data }) => {
      if (data.length > 0) {
        const section = document.createElement('section');
        section.className = 'section dynamic-row';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = `${row.title} <i class="fa-solid fa-chevron-right" style="font-size: 0.85rem; color: var(--text-muted);"></i>`;

        const list = document.createElement('div');
        list.className = 'carousel';
        list.id = id;

        section.appendChild(title);
        section.appendChild(list);
        main.insertBefore(section, sentinel);

        createScrollWrapper(list);

        rowPages[id] = 1;

        renderCards(data, id);
        enableInfiniteRow(id, row);
      }
    });
  } finally {
    homeScrollLoading = false;
  }
}

function enableInfiniteRow(id, row) {
  const box = document.getElementById(id);
  if (!box) return;

  box.addEventListener('scroll', async () => {
    if (box.scrollLeft + box.clientWidth >= box.scrollWidth - 300) {
      if (box.isLoading) return;

      box.isLoading = true;
      rowPages[id] = rowPages[id] >= 50 ? 1 : rowPages[id] + 1;

      try {
        let data;

        if (row.isAnilist) {
          data = await apiAnilist(row.query, rowPages[id]);
          appendCards(data, id);
        } else {
          const sep = row.endpoint.includes('?') ? '&' : '?';
          const res = await api(`${row.endpoint}${sep}page=${rowPages[id]}`);
          appendCards(res.results, id);
        }
      } catch {
        // ignore
      }

      box.isLoading = false;
    }
  });
}

function setupHomeInfiniteScroll() {
  const sentinel = document.getElementById('home-sentinel');
  if (!sentinel) return;

  const observer = new IntersectionObserver(async entries => {
    if (entries[0].isIntersecting) {
      await loadMoreRows();
    }
  }, { rootMargin: '500px' });

  observer.observe(sentinel);
}

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
async function init() {
  await loadGenres();
  buildHomeRowPool();
  loadContinueWatching();

  try {
    const trending = await api('/trending/all/day');
    const bannerPool = trending.results.filter(i => i.backdrop_path);

    displayBanner(bannerPool[Math.floor(Math.random() * bannerPool.length)]);

    await loadMoreRows();
    setupHomeInfiniteScroll();
  } catch (err) {
    document.getElementById('banner-title').textContent = 'NYEKFLIX';
    showToast('Could not load content. Check your connection.');
  }
}

init();