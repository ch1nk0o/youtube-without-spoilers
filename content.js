/* YouTube No Spoilers — content script */

const STORAGE_KEY = 'state';
const DEBUG = false;
const LOG = (...a) => DEBUG && console.log('[NoSpoilers]', ...a);

const DEFAULT_STATE = {
  enabled: true,
  mode: 'whitelist',
  channels: [],
  hide: {
    player_timeline: true,
    player_duration: true,
    hover_preview: true,
    chapters: true,
    card_duration: true,
    card_hover_autoplay: true,
  },
};

let state = DEFAULT_STATE;

// ---------- STATE ----------

function loadState() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (res) => {
      state = { ...DEFAULT_STATE, ...(res[STORAGE_KEY] || {}) };
      state.hide = { ...DEFAULT_STATE.hide, ...(state.hide || {}) };
      resolve();
    });
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes[STORAGE_KEY]) return;
  const next = changes[STORAGE_KEY].newValue || {};
  state = { ...DEFAULT_STATE, ...next };
  state.hide = { ...DEFAULT_STATE.hide, ...(next.hide || {}) };
  LOG('state updated', state);
  applyAll();
});

// ---------- CHANNEL: PAGE CONTEXT ----------

function getPageChannel() {
  // Канал-владелец текущей страницы (для /watch это канал видео,
  // для /@handle или /channel/id — сам канал, иначе null).
  const path = location.pathname;

  if (path === '/watch') {
    const meta = document.querySelector('meta[itemprop="channelId"]');
    const link = document.querySelector(
      '#owner #channel-name a, ytd-video-owner-renderer a, #upload-info a'
    );
    let id = null, handle = null;
    if (meta?.content) id = meta.content;
    if (link?.href) {
      try {
        const u = new URL(link.href);
        const h = u.pathname.match(/^\/@([^/]+)/);
        const c = u.pathname.match(/^\/channel\/([^/]+)/);
        if (h) handle = '@' + h[1];
        if (c && !id) id = c[1];
      } catch (e) {}
    }
    if (id || handle) return { id, handle };
    return null;
  }

  const handleMatch = path.match(/^\/@([^/]+)/);
  if (handleMatch) return { handle: '@' + handleMatch[1] };

  const channelMatch = path.match(/^\/channel\/([^/]+)/);
  if (channelMatch) return { id: channelMatch[1] };

  return null;
}

function channelMatchesWhitelist(channel) {
  if (!channel) return false;
  return state.channels.some(
    (c) =>
      (channel.id && c.id && c.id === channel.id) ||
      (channel.handle &&
        c.handle &&
        c.handle.toLowerCase() === channel.handle.toLowerCase())
  );
}

function shouldHidePlayer() {
  if (!state.enabled) return false;
  if (location.pathname !== '/watch') return false;
  if (state.mode === 'global') return true;
  return channelMatchesWhitelist(getPageChannel());
}

// ---------- APPLY: PLAYER ----------

function applyPlayer() {
  const root = document.documentElement;
  if (!root) return;
  const on = shouldHidePlayer();
  root.classList.toggle('yt-ns-player-timeline', on && state.hide.player_timeline);
  root.classList.toggle('yt-ns-player-duration', on && state.hide.player_duration);
  root.classList.toggle('yt-ns-chapters', on && state.hide.chapters);
  root.classList.toggle('yt-ns-hover-preview', on && state.hide.hover_preview);
  if (on) LOG('player hide active for', getPageChannel());
}

// ---------- APPLY: CARDS ----------

const CARD_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-rich-grid-media',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-playlist-panel-video-renderer',
  'ytd-reel-item-renderer',
  'yt-lockup-view-model',
].join(',');

function cardChannel(card) {
  const a = card.querySelector('a[href^="/@"], a[href^="/channel/"]');
  if (!a) return null;
  const href = a.getAttribute('href') || '';
  const handleMatch = href.match(/^\/@([^/?#]+)/);
  const channelMatch = href.match(/^\/channel\/([^/?#]+)/);
  if (handleMatch) return { handle: '@' + handleMatch[1] };
  if (channelMatch) return { id: channelMatch[1] };
  return null;
}

function shouldHideCard(card) {
  if (state.mode === 'global') return true;
  // 1) ссылка на канал внутри карточки
  const ch = cardChannel(card);
  if (ch && channelMatchesWhitelist(ch)) return true;
  // 2) fallback — канал-владелец страницы (для /@handle, /channel/, /watch)
  // Если ссылки внутри карточки нет, она почти всегда принадлежит каналу страницы.
  if (!ch) {
    const pageCh = getPageChannel();
    if (pageCh && channelMatchesWhitelist(pageCh)) return true;
  }
  return false;
}

function applyCards(root) {
  if (!state.enabled) return;
  const wantCardHide = state.hide.card_duration || state.hide.card_hover_autoplay;
  if (!wantCardHide) return;

  const scope = root && root.querySelectorAll ? root : document;
  const cards = scope.querySelectorAll(CARD_SELECTORS);
  let hidden = 0;
  const seenInFeed = new Set();
  cards.forEach((card) => {
    const ch = cardChannel(card);
    if (ch) seenInFeed.add(ch.handle || ch.id);
    const hide = shouldHideCard(card);
    card.classList.toggle('yt-ns-hide-card', hide);
    if (hide) hidden++;
  });
  if (cards.length) {
    LOG(
      `cards: ${cards.length} scanned, ${hidden} hidden\n` +
        `  whitelist: ${JSON.stringify(state.channels.map((c) => c.handle || c.id))}\n` +
        `  in feed:   ${JSON.stringify([...seenInFeed])}\n` +
        `  page channel: ${JSON.stringify(getPageChannel())}`
    );
  }
}

function clearAllCardClasses() {
  document.querySelectorAll('.yt-ns-hide-card').forEach((el) => {
    el.classList.remove('yt-ns-hide-card');
  });
}

function applyAll() {
  applyPlayer();
  if (!state.enabled) {
    clearAllCardClasses();
  } else {
    applyCards();
  }
}

// ---------- OBSERVERS / NAVIGATION ----------

document.addEventListener('yt-navigate-finish', () => {
  LOG('navigate-finish', location.pathname);
  setTimeout(applyAll, 100);
  setTimeout(applyAll, 500);
  setTimeout(applyAll, 1500);
});

const cardObserver = new MutationObserver((mutations) => {
  if (!state.enabled) return;
  let needScan = false;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (
        (node.matches && node.matches(CARD_SELECTORS)) ||
        (node.querySelector && node.querySelector(CARD_SELECTORS))
      ) {
        needScan = true;
        break;
      }
    }
    if (needScan) break;
  }
  if (needScan) applyCards();
});

function startObserver() {
  if (document.body) {
    cardObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    setTimeout(startObserver, 50);
  }
}

// ---------- BOOT ----------

(async function init() {
  await loadState();
  LOG('init', state);
  applyAll();
  startObserver();
  setTimeout(applyAll, 800);
  setTimeout(applyAll, 2000);
})();
