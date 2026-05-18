const KEY = 'state';

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

async function getState() {
  const res = await chrome.storage.sync.get(KEY);
  return { ...DEFAULT_STATE, ...(res[KEY] || {}) };
}

async function setState(patch) {
  const current = await getState();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ [KEY]: next });
  await updateBadge(next);
  return next;
}

async function updateBadge(state) {
  try {
    const text = state.enabled ? (state.mode === 'global' ? 'ALL' : 'ON') : 'OFF';
    const color = state.enabled ? '#cc0000' : '#888888';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
  } catch (e) {}
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-no-spoilers') {
    const current = await getState();
    await setState({ enabled: !current.enabled });
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const res = await chrome.storage.sync.get(KEY);
  if (res[KEY] === undefined) {
    await chrome.storage.sync.set({ [KEY]: DEFAULT_STATE });
  }
  await updateBadge(await getState());
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge(await getState());
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes[KEY]) {
    await updateBadge(changes[KEY].newValue || DEFAULT_STATE);
  }
});
