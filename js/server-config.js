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
    name: 'VidKing',
    base: 'https://player.videasy.net'
  }
};

window.NYEKFLIX_PLAYER = {
  movie(id, progress = null) {
    const base = window.NYEKFLIX_SERVER.player.base;

    let url = `${base}/movie/${id}?color=8B5CF6&overlay=true`;

    if (progress) {
      url += `&progress=${progress}`;
    }

    return url;
  },

  tv(id, season, episode, progress = null) {
    const base = window.NYEKFLIX_SERVER.player.base;

    let url = `${base}/tv/${id}/${season}/${episode}?color=8B5CF6&nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true`;

    if (progress) {
      url += `&progress=${progress}`;
    }

    return url;
  },

  anime(id, episode, progress = null) {
    const base = window.NYEKFLIX_SERVER.player.base;

    let url = `${base}/anime/${id}/${episode}?color=8B5CF6&nextEpisode=true&autoplayNextEpisode=true&overlay=true`;

    if (progress) {
      url += `&progress=${progress}`;
    }

    return url;
  }
};