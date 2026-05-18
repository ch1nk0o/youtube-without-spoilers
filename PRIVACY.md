# Privacy Policy — YouTube No Spoilers

**Last updated:** 2026-05-18

## TL;DR

YouTube No Spoilers does **not** collect, transmit, or store any user data on any server. Everything happens locally in your browser. No analytics, no telemetry, no third-party services.

---

## What the extension stores

The extension saves only the following settings, used to make it work:

- **Whitelist of channels** you've added (channel handle and/or channel ID)
- **Mode** ("only whitelisted channels" or "everywhere on YouTube")
- **Per-element toggles** (which spoiler elements to hide)
- **Enabled / disabled** flag

## Where this is stored

In `chrome.storage.sync`, which is Chrome's built-in extension storage. If you have Chrome Sync enabled (via your Google account), Chrome may sync these settings between your own devices through Google's servers. This is a direct Chrome ↔ Google flow — the developer of this extension has no access to it.

## What the extension does on YouTube pages

- Reads the YouTube page DOM to find video cards, the player, and channel information
- Applies CSS classes to hide specific elements (progress bar, duration text, hover preview, thumbnail duration badge, chapters)
- Detects which channel a video / card belongs to (via channel link or page URL) to apply rules selectively

The extension does **not**:
- Watch what videos you play
- Send any data outside your browser
- Use any tracking pixel, analytics SDK, or remote server
- Modify video content or audio
- Read your browsing history or any tab outside `youtube.com`

## Permissions explained

- `storage` — to save the settings listed above
- `tabs` — to detect when you're on a YouTube tab (for the popup's "current channel" detection)
- `scripting` — used by the popup to read the current channel from the active YouTube tab when you click "+ Add"
- `host_permissions: *://*.youtube.com/*` — to inject CSS and the content script only on YouTube

No other domains are touched.

## Third parties

None. No analytics, no error reporting, no ads.

## Open source

The full source code is available so you can verify the claims above yourself.

## Changes to this policy

If a future version ever introduces any data collection (e.g. opt-in error reporting), this document will be updated and the change will be reflected in the Chrome Web Store description before the new version ships.

## Contact

Questions, bug reports, or feedback: [t.me/CKocherov](https://t.me/CKocherov)
