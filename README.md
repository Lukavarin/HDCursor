# HDCursor

A lightweight Firefox extension that hides your mouse cursor and disables click/hover triggers across all tabs, while letting you use mouse buttons or hotkeys to switch tabs.

Useful when you want to use mouse buttons without accidentally clicking, highlighting text, or triggering hover menus on web pages.

---

## What it does

- **Cursor Hide & Click Block**: Injects an invisible overlay that hides the pointer and swallows accidental clicks, drags, and hover effects across all tabs.
- **Normal Scrolling Works**: Mouse wheel scrolling still works smoothly, including nested containers like YouTube comment sections or code blocks.
- **Typing Is Unaffected**: You can still type in search bars, inputs, and text areas normally.
- **Custom Keybinds & Presets**: Bind actions to mouse buttons (Mouse 4 & 5), keyboard keys, or function keys (F13–F15). Comes with quick presets for Alt Nav and XMBC.
- **Live Sandbox & Recorder**: Test your keys and mouse buttons directly on the settings page with zero interference.

---

## Default Binds

| Action | Default | Description |
| :--- | :--- | :--- |
| **Toggle HD** | `Shift + Mouse 4` | Turn cursor hide and click blocking on/off |
| **Previous Tab** | `Mouse 4` | Switch to the previous tab |
| **Next Tab** | `Mouse 5` | Switch to the next tab |

*Note on Mouse 4 & 5 on Windows:* If Firefox intercepts your side buttons for browser Back/Forward:
- Map them in [X-Mouse Button Control (XMBC)](https://www.highrez.co.uk/downloads/xmousebuttoncontrol.htm) for `firefox.exe` to `{F13}` / `{F14}` / `{F15}` (keeps Razer Synapse / in-game binds completely untouched).
- Or open `about:config` in Firefox and set `mousebutton.4th.enabled` and `mousebutton.5th.enabled` to `false`.
- Or just use keyboard shortcuts (like `Alt Nav` preset in settings).

---

## Installation

### Temporary (Testing)
1. In Firefox, go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select `manifest.json` in this folder.

### Permanent (Free & Private via Mozilla)
Standard Firefox unloads temporary extensions on restart. To make it permanent:
1. Go to [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) and log in.
2. Click **Submit a New Add-on** -> select **"On your own"** (unlisted/private).
3. Upload `hdcursor-v1.0.0.zip` (generate anytime via `python scripts/package.py`).
4. Wait 2–3 minutes for automated review, then download your signed `.xpi` file and open it in Firefox.

---

## License

MIT
