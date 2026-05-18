const FEEDBACK_URL = 'https://t.me/CKocherov';

const STORAGE_KEY = 'state';
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

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let state = DEFAULT_STATE;
let activeTabChannel = null;

async function loadState() {
  const res = await chrome.storage.sync.get(STORAGE_KEY);
  state = { ...DEFAULT_STATE, ...(res[STORAGE_KEY] || {}) };
  state.hide = { ...DEFAULT_STATE.hide, ...(state.hide || {}) };
}

async function saveState() {
  await chrome.storage.sync.set({ [STORAGE_KEY]: state });
}

// ---------- Active tab channel detection ----------

async function detectActiveTabChannel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !/youtube\.com/.test(tab.url)) return null;

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (location.pathname === '/watch') {
          const meta = document.querySelector('meta[itemprop="channelId"]');
          const link = document.querySelector('#owner #channel-name a, ytd-video-owner-renderer a');
          const nameEl = document.querySelector('#owner #channel-name a, ytd-video-owner-renderer #channel-name a');
          let handle = null, id = null;
          if (link?.href) {
            try {
              const u = new URL(link.href);
              const h = u.pathname.match(/^\/@([^/]+)/);
              const c = u.pathname.match(/^\/channel\/([^/]+)/);
              if (h) handle = '@' + h[1];
              if (c) id = c[1];
            } catch (e) {}
          }
          if (!id && meta?.content) id = meta.content;
          return { id, handle, name: nameEl?.textContent?.trim() || null, source: 'video' };
        }
        const channelHandle = document.querySelector('ytd-channel-handle');
        const channelName = document.querySelector('ytd-channel-name #text, yt-formatted-string.ytd-channel-name');
        if (location.pathname.startsWith('/@') || location.pathname.startsWith('/channel/')) {
          const handleMatch = location.pathname.match(/^\/@([^/]+)/);
          const channelMatch = location.pathname.match(/^\/channel\/([^/]+)/);
          // Канал ID через canonical link или meta — стабильнее handle
          let id = channelMatch ? channelMatch[1] : null;
          if (!id) {
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical?.href) {
              const m = canonical.href.match(/\/channel\/([^/?#]+)/);
              if (m) id = m[1];
            }
          }
          if (!id) {
            const meta = document.querySelector('meta[itemprop="identifier"], meta[itemprop="channelId"]');
            if (meta?.content) id = meta.content;
          }
          return {
            id,
            handle: handleMatch ? '@' + handleMatch[1] : channelHandle?.textContent?.trim() || null,
            name: channelName?.textContent?.trim() || null,
            source: 'channel',
          };
        }
        return null;
      },
    });
    return result?.[0]?.result || null;
  } catch (e) {
    return null;
  }
}

function isInWhitelist(ch) {
  if (!ch) return false;
  return state.channels.some(
    (c) =>
      (ch.id && c.id && c.id === ch.id) ||
      (ch.handle && c.handle && c.handle.toLowerCase() === ch.handle.toLowerCase())
  );
}

// ---------- RENDER ----------

function render() {
  document.body.classList.toggle('disabled', !state.enabled);
  $('#enabled').checked = state.enabled;
  renderStatusHint();
  renderModeTabs();
  renderCurrentChannel();
  renderChannelList();
  renderToggles();
  $('#feedback-link').href = FEEDBACK_URL;
}

function renderStatusHint() {
  const hint = $('#status-hint');
  if (!state.enabled) {
    hint.textContent = 'Выключено. Alt+H — быстрое включение.';
    return;
  }
  if (state.mode === 'global') {
    hint.textContent = 'Скрытие активно везде на YouTube.';
  } else if (state.channels.length === 0) {
    hint.textContent = 'Добавь канал — расширение начнёт работать только на нём.';
  } else {
    hint.textContent = `Активно на ${state.channels.length} канал${plural(state.channels.length, ['е', 'ах', 'ах'])}.`;
  }
}

function plural(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return forms[1];
  return forms[2];
}

function renderModeTabs() {
  $$('.mode-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
  $('#whitelist-section').hidden = state.mode !== 'whitelist';
}

function renderCurrentChannel() {
  const box = $('#current-channel-box');
  if (!activeTabChannel || (!activeTabChannel.id && !activeTabChannel.handle)) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  $('#current-channel-name').textContent =
    activeTabChannel.name || activeTabChannel.handle || activeTabChannel.id || '—';
  $('#current-channel-meta').textContent =
    activeTabChannel.handle ||
    (activeTabChannel.id ? activeTabChannel.id.slice(0, 12) + '…' : '');

  const btn = $('#add-current-channel');
  if (isInWhitelist(activeTabChannel)) {
    btn.textContent = '✓ Добавлен';
    btn.disabled = true;
  } else {
    btn.textContent = '+ Добавить';
    btn.disabled = false;
  }
}

function renderChannelList() {
  const list = $('#channel-list');
  const empty = $('#empty-state');
  $('#channel-count').textContent = state.channels.length;
  list.replaceChildren();

  if (state.channels.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const ch of state.channels) {
    const item = document.createElement('div');
    item.className = 'channel-item';

    const name = document.createElement('div');
    name.className = 'channel-item-name';
    name.textContent = ch.name || ch.handle || ch.id || 'Без названия';
    name.title = ch.handle || ch.id || '';

    const remove = document.createElement('button');
    remove.className = 'channel-item-remove';
    remove.textContent = '×';
    remove.title = 'Удалить';
    remove.addEventListener('click', async () => {
      state.channels = state.channels.filter((c) => c !== ch);
      await saveState();
      render();
    });

    item.appendChild(name);
    item.appendChild(remove);
    list.appendChild(item);
  }
}

function renderToggles() {
  $$('.toggle input[data-hide]').forEach((input) => {
    const key = input.dataset.hide;
    input.checked = !!state.hide[key];
  });
}

// ---------- EVENTS ----------

$('#enabled').addEventListener('change', async (e) => {
  state.enabled = e.target.checked;
  await saveState();
  render();
});

$$('.mode-tab').forEach((btn) => {
  btn.addEventListener('click', async () => {
    state.mode = btn.dataset.mode;
    await saveState();
    render();
  });
});

$('#add-current-channel').addEventListener('click', async () => {
  if (!activeTabChannel) return;
  if (isInWhitelist(activeTabChannel)) return;
  state.channels.push({
    id: activeTabChannel.id || null,
    handle: activeTabChannel.handle || null,
    name: activeTabChannel.name || activeTabChannel.handle || 'Канал',
  });
  await saveState();
  render();
});

$$('.toggle input[data-hide]').forEach((input) => {
  input.addEventListener('change', async () => {
    state.hide[input.dataset.hide] = input.checked;
    await saveState();
  });
});

// ---------- BOOT ----------

(async function init() {
  await loadState();
  activeTabChannel = await detectActiveTabChannel();
  render();
})();
