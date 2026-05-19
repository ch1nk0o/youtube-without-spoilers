const FEEDBACK_URL = 'https://t.me/CKocherov';

const STORAGE_KEY = 'state';
const DEFAULT_STATE = {
  enabled: true,
  mode: 'whitelist',
  locale: null, // null = follow browser; 'en' | 'ru' = explicit
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

// ---------- I18N ----------

const I18N = {
  en: {
    modeWhitelist: 'Selected channels only',
    modeGlobal: 'Everywhere on YouTube',
    channelsTitle: 'Channels with spoiler mode',
    addBtn: '+ Add',
    addedBtn: '✓ Added',
    emptyTitle: 'List is empty.',
    emptyHint: 'Visit a tournament/highlights channel and click "+ Add" above — the extension will hide spoilers only there.',
    togglesTitle: 'What to hide',
    togglePlayerTimeline: 'Timeline on video',
    togglePlayerDuration: 'Video duration',
    toggleHoverPreview: 'Hover preview',
    toggleChapters: 'Chapters',
    toggleCardDuration: 'Duration in feed thumbnails',
    toggleCardHoverAutoplay: 'Hover autoplay preview',
    feedbackLink: 'Feedback & bugs →',
    unnamed: 'Unnamed',
    removeTitle: 'Remove',
    statusOff: 'Off. Press Alt+H to turn on.',
    statusGlobal: 'Hiding active everywhere on YouTube.',
    statusEmpty: 'Add a channel — extension will only work there.',
  },
  ru: {
    modeWhitelist: 'Только выбранные каналы',
    modeGlobal: 'Везде на YouTube',
    channelsTitle: 'Каналы со спойлер-режимом',
    addBtn: '+ Добавить',
    addedBtn: '✓ Добавлен',
    emptyTitle: 'Список пуст.',
    emptyHint: 'Зайди на канал турниров/нарезок и нажми «+ Добавить» выше — расширение начнёт прятать спойлеры только там.',
    togglesTitle: 'Что скрывать',
    togglePlayerTimeline: 'Таймлайн на видео',
    togglePlayerDuration: 'Длительность видео',
    toggleHoverPreview: 'Превью при наведении',
    toggleChapters: 'Главы / chapters',
    toggleCardDuration: 'Длительность на превью в фиде',
    toggleCardHoverAutoplay: 'Автоплей превью при наведении',
    feedbackLink: 'Фидбэк и баги →',
    unnamed: 'Без названия',
    removeTitle: 'Удалить',
    statusOff: 'Выключено. Alt+H — быстрое включение.',
    statusGlobal: 'Скрытие активно везде на YouTube.',
    statusEmpty: 'Добавь канал — расширение начнёт работать только на нём.',
  },
};

function detectBrowserLocale() {
  try {
    const lang = (chrome.i18n.getUILanguage() || 'en').toLowerCase();
    return lang.startsWith('ru') ? 'ru' : 'en';
  } catch (e) {
    return 'en';
  }
}

function currentLocale() {
  return state.locale || detectBrowserLocale();
}

function T(key) {
  const loc = currentLocale();
  return (I18N[loc] && I18N[loc][key]) || I18N.en[key] || key;
}

function statusActiveText(n) {
  const loc = currentLocale();
  if (loc === 'ru') {
    const form = pluralRu(n, ['канале', 'каналах', 'каналах']);
    return `Активно на ${n} ${form}.`;
  }
  return n === 1 ? 'Active on 1 channel.' : `Active on ${n} channels.`;
}

function pluralRu(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return forms[1];
  return forms[2];
}

// ---------- DOM ----------

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

function applyI18nToDom() {
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const txt = T(key);
    if (txt) el.textContent = txt;
  });
}

function render() {
  applyI18nToDom();
  document.body.classList.toggle('disabled', !state.enabled);
  $('#enabled').checked = state.enabled;
  renderStatusHint();
  renderModeTabs();
  renderCurrentChannel();
  renderChannelList();
  renderToggles();
  renderLangSwitch();
  $('#feedback-link').href = FEEDBACK_URL;
}

function renderStatusHint() {
  const hint = $('#status-hint');
  if (!state.enabled) {
    hint.textContent = T('statusOff');
    return;
  }
  if (state.mode === 'global') {
    hint.textContent = T('statusGlobal');
  } else if (state.channels.length === 0) {
    hint.textContent = T('statusEmpty');
  } else {
    hint.textContent = statusActiveText(state.channels.length);
  }
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
    btn.textContent = T('addedBtn');
    btn.disabled = true;
  } else {
    btn.textContent = T('addBtn');
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
    name.textContent = ch.name || ch.handle || ch.id || T('unnamed');
    name.title = ch.handle || ch.id || '';

    const remove = document.createElement('button');
    remove.className = 'channel-item-remove';
    remove.textContent = '×';
    remove.title = T('removeTitle');
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

function renderLangSwitch() {
  const active = currentLocale();
  $$('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === active);
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
    name: activeTabChannel.name || activeTabChannel.handle || T('unnamed'),
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

$$('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    state.locale = btn.dataset.lang;
    await saveState();
    render();
  });
});

// ---------- BOOT ----------

(async function init() {
  await loadState();
  activeTabChannel = await detectActiveTabChannel();
  render();
})();
