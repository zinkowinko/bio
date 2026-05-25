const DISCORD_USER_ID = '1490438955353637035';

const splash = document.getElementById('splash');

splash.addEventListener('click', () => {
  splash.classList.add('hidden');
  tracks[trackIndex].audioEl.play().catch(() => {});
  playing = true;
  document.getElementById('play-icon').className = 'fa-solid fa-pause';
});

const STATUS_LABELS = {
  online: 'online now',
  idle: 'idle',
  dnd: 'do not disturb',
  offline: 'offline',
};

async function fetchDiscordPresence() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
    const json = await res.json();

    if (!json.success) return;

    const data = json.data;
    const user = data.discord_user;
    const status = data.discord_status;

    if (user.avatar) {
      document.getElementById('discord-avatar').src =
        `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    }

    document.getElementById('discord-username').textContent =
      user.global_name || user.username;

    const handle = document.getElementById('discord-handle');
    handle.textContent = user.global_name ? `@${user.username}` : '';

    document.getElementById('status-dot').className = `status-dot ${status}`;

    const guildBadge = document.getElementById('guild-badge');
    if (user.clan?.tag) {
      guildBadge.textContent = user.clan.tag;
      guildBadge.style.display = '';
    } else {
      guildBadge.style.display = 'none';
    }

    const activityLine   = document.getElementById('activity-line');
    const activityDetail = document.getElementById('activity-detail');
    const activityImg    = document.getElementById('activity-img');
    const statusEl       = document.getElementById('discord-status');

    const activity = data.activities?.find(a => a.type === 0);
    const spotify  = data.listening_to_spotify && data.spotify;

    if (activity) {
      activityLine.innerHTML = `<strong>Playing</strong> ${activity.name}`;
      activityDetail.textContent = activity.details || activity.state || '';
      statusEl.textContent = '';

      const largeImage = activity.assets?.large_image;
      if (largeImage) {
        const imgUrl = largeImage.startsWith('mp:')
          ? `https://media.discordapp.net/${largeImage.slice(3)}`
          : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${largeImage}.png`;
        activityImg.src = imgUrl;
        activityImg.style.display = 'block';
      } else {
        activityImg.style.display = 'none';
      }
    } else if (spotify) {
      activityLine.innerHTML = `<strong>Listening to</strong> ${spotify.song}`;
      activityDetail.textContent = spotify.artist;
      statusEl.textContent = '';
      activityImg.style.display = 'none';
      syncSpotify(spotify);
    } else {
      activityLine.textContent = '';
      activityDetail.textContent = '';
      activityImg.style.display = 'none';
      statusEl.textContent = STATUS_LABELS[status] || status;

      if (status === 'offline') {
        const customStatus = data.activities?.find(a => a.type === 4);
        if (customStatus?.state) statusEl.textContent = customStatus.state;
      }
    }
  } catch (e) {}
}

function syncSpotify(spotify) {
  document.getElementById('track-name').textContent = spotify.song;
  document.getElementById('track-artist').textContent = spotify.artist;

  if (spotify.album_art_url) {
    document.getElementById('album-art').src = spotify.album_art_url;
  }

  const totalSec   = Math.floor((spotify.timestamps.end - spotify.timestamps.start) / 1000);
  const elapsedSec = Math.max(0, Math.floor((Date.now() - spotify.timestamps.start) / 1000));

  currentSec = elapsedSec;
  tracks[trackIndex].duration = totalSec;
  document.getElementById('duration').textContent = fmt(totalSec);
  updateBar();
}

fetchDiscordPresence();
setInterval(fetchDiscordPresence, 30000);

const tracks = [
  { name: 'Fake ID',   artist: 'yukan',   src: 'stuff/fakeid.mp3',        art: 'stuff/fakeid.jpg', duration: 0 }
];

tracks.forEach(t => {
  const el = new Audio();
  el.preload = 'auto';
  if (t.src) el.src = t.src;

  el.addEventListener('loadedmetadata', () => {
    t.duration = Math.floor(el.duration);
    if (tracks[trackIndex] === t) {
      document.getElementById('duration').textContent = fmt(t.duration);
    }
  });

  el.addEventListener('timeupdate', () => {
    if (!playing || tracks[trackIndex] !== t) return;
    currentSec = Math.floor(el.currentTime);
    updateBar();
  });

  el.addEventListener('ended', () => {
    if (tracks[trackIndex] !== t) return;
    loadTrack((trackIndex + 1) % tracks.length);
  });

  t.audioEl = el;
});

let trackIndex = 0;
let currentSec = 0;
let playing = false;

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function updateBar() {
  const t = tracks[trackIndex];
  const pct = t.duration ? Math.min((currentSec / t.duration) * 100, 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('current-time').textContent = fmt(currentSec);
}

function updatePlaylist() {
  document.querySelectorAll('.playlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === trackIndex);
  });
}

function buildPlaylist() {
  const el = document.getElementById('playlist');
  el.innerHTML = '<div class="playlist-label">next tracks</div>';
  tracks.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'playlist-item' + (i === trackIndex ? ' active' : '');
    item.innerHTML = `
      <img class="playlist-item-art" src="${t.art}" alt="">
      <div class="playlist-item-info">
        <span class="playlist-item-name">${t.name}</span>
        <span class="playlist-item-artist">${t.artist}</span>
      </div>`;
    item.addEventListener('click', () => loadTrack(i));
    el.appendChild(item);
  });
}

function loadTrack(index) {
  tracks[trackIndex].audioEl.pause();
  tracks[trackIndex].audioEl.currentTime = 0;

  trackIndex = index;
  const t = tracks[index];

  document.getElementById('track-name').textContent = t.name;
  document.getElementById('track-artist').textContent = t.artist;
  document.getElementById('album-art').src = t.art;
  currentSec = 0;
  updateBar();
  document.getElementById('duration').textContent = t.duration ? fmt(t.duration) : '0:00';
  updatePlaylist();

  if (playing) t.audioEl.play().catch(() => {});
}

document.getElementById('play-btn').addEventListener('click', () => {
  playing = !playing;
  document.getElementById('play-icon').className =
    playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  const el = tracks[trackIndex].audioEl;
  playing ? el.play().catch(() => {}) : el.pause();
});

document.getElementById('next-btn').addEventListener('click', () => {
  loadTrack((trackIndex + 1) % tracks.length);
});

document.getElementById('prev-btn').addEventListener('click', () => {
  loadTrack((trackIndex - 1 + tracks.length) % tracks.length);
});


document.querySelector('.progress-bar').addEventListener('click', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const newTime = ratio * tracks[trackIndex].duration;
  tracks[trackIndex].audioEl.currentTime = newTime;
  currentSec = Math.floor(newTime);
  updateBar();
});

buildPlaylist();
loadTrack(0);
