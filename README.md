# HDCursor

A lightweight Firefox extension that hides your mouse cursor and disables click/hover triggers across all tabs, while letting you use mouse buttons or hotkeys to switch tabs.

Useful when you want to hide your cursor and not trigger hover menus on web pages.

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
| **Mute / Unmute Tab** | `Ctrl + M` | Toggle audio playback for the active tab |
| **Close Tab** | `F17` | Close the currently active tab |
| **Restore Closed Tab** | `F18` | Reopen the most recently closed tab (Shift + T / Ctrl + Shift + T) |

*Note on Mouse 4 & 5 on Windows:* If Firefox intercepts your side buttons for browser Back/Forward:
- Map them in [X-Mouse Button Control (XMBC)](https://www.highrez.co.uk/downloads/xmousebuttoncontrol.htm) for `firefox.exe` to `{F13}`–`{F18}`
- Or open `about:config` in Firefox and set `mousebutton.4th.enabled` and `mousebutton.5th.enabled` to `false`.
- Or just use keyboard shortcuts.
