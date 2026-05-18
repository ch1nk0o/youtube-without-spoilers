# YouTube without Spoilers

**English** · [Русский](README.ru.md)

Chrome extension that hides the YouTube progress bar, video duration, chapters, and thumbnail durations — **per channel**. Watch tournaments and sports VODs with full suspense intact.

> Live in Chrome Web Store: _(link coming after review)_

## Why

You're watching a tournament VOD. You don't know who won. You glance at the progress bar — 5 minutes left, your team is down 2-3. Suspense gone.

This extension is built around a per-channel whitelist: spoilers stay hidden only on the channels you choose, everywhere else YouTube works normally.

## Features

- Hides the player **progress bar** (kept clickable — scrub blindly for extra thrill)
- Hides **current time** and **total duration**
- Hides the **hover preview** thumbnail on the timeline
- Hides **chapters** in the title and chapter markers on the bar
- Hides **duration badges** ("12:34") on thumbnails in the feed, search, channel page
- Hides **hover-autoplay** on thumbnail cards
- **Per-channel whitelist** — only the channels you choose. Or switch to "everywhere" mode.
- Master on/off via popup or `Alt+H`
- Each element individually toggleable

## Install

### From Chrome Web Store
_(pending review)_

### Manual (developer mode)

1. Download or clone this repo
2. Generate the PNG icons:
   - Open `icons/generate.html` in Chrome → click "Скачать все 3 PNG"
   - Move the downloaded `icon16.png`, `icon48.png`, `icon128.png` into `icons/`
3. Open `chrome://extensions/` → enable **Developer mode** (top right)
4. **Load unpacked** → select this folder
5. Pin the extension to the toolbar

## How to use

1. Visit the YouTube channel you want to hide spoilers for
2. Click the extension icon → **+ Add**
3. Done. Every video from that channel will be censored — in the player and in feeds.

To unhide a channel: open the popup → click `×` next to its name.

## Privacy

No analytics, no telemetry, no third-party services. Settings are stored only in `chrome.storage.sync`.

Full privacy policy: [PRIVACY.md](PRIVACY.md)

## Feedback / bugs

- Telegram: [@CKocherov](https://t.me/CKocherov)
- GitHub Issues: open an issue in this repo

## License

[MIT](LICENSE) — © Chingiz Kocherov
