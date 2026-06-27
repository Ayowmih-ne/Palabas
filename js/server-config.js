/* =========================================
   NYEKFLIX — server-config.js
   Change server here only
========================================= */
'use strict';

window.NYEKFLIX_SERVER = {
  tmdb: 'https://api.themoviedb.org/3',
  image: 'https://image.tmdb.org/t/p',
  anilist: 'https://graphql.anilist.co',

  player: {
    name: 'Videasy',
    base: 'https://player.videasy.net',

    // Set to false para hindi bumalik sa overlay kapag nag-next episode sa player.
    overlay: false,

    color: '8B5CF6',
    nextEpisode: true,
    autoplayNextEpisode: true,
    episodeSelector: true
  }
};

function nyekPlayerUrl(path, params = {}) {
  const config = window.NYEKFLIX_SERVER.player;
  const query = new URLSearchParams();

  query.set('color', config.color || '8B5CF6');
  query.set('overlay', String(config.overlay === true));

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  return `${config.base}${path}?${query.toString()}`;
}

window.NYEKFLIX_PLAYER = {
  movie(id, progress = null) {
    return nyekPlayerUrl(`/movie/${id}`, {
      progress: progress && progress > 0 ? Math.floor(progress) : null
    });
  },

  tv(id, season, episode, progress = null) {
    const config = window.NYEKFLIX_SERVER.player;

    return nyekPlayerUrl(`/tv/${id}/${season}/${episode}`, {
      nextEpisode: config.nextEpisode,
      autoplayNextEpisode: config.autoplayNextEpisode,
      episodeSelector: config.episodeSelector,
      progress: progress && progress > 0 ? Math.floor(progress) : null
    });
  },

  anime(id, episode, progress = null) {
    const config = window.NYEKFLIX_SERVER.player;

    return nyekPlayerUrl(`/anime/${id}/${episode}`, {
      nextEpisode: config.nextEpisode,
      autoplayNextEpisode: config.autoplayNextEpisode,
      progress: progress && progress > 0 ? Math.floor(progress) : null
    });
  }
};
