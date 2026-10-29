<p align="center">
  <img src="icons/icon.svg" alt="" width="128" height="128">
</p>

<h1 align="center">BookmArc for Chrome</h1>

<p align="center">Your Chrome bookmarks as an Arc-style side panel.</p>

BookmArc is one side panel, nothing more: your bookmarks bar as Arc's pinned tabs, with folders, favorites and the open tabs below. A bookmark opens in its own tab, and clicking it again goes back to that same tab instead of opening another one. There are no spaces: one list, the bookmarks you already have.

This is the Chrome version of [BookmArc for Firefox](https://github.com/chokity/BookmArc), which started as a fork of [trajche/arc](https://github.com/trajche/arc).

> Not affiliated with or endorsed by The Browser Company. “Arc” is their browser; this is an independent extension that brings its sidebar ideas to Chrome.

## Install

Needs **Chrome 121 or newer**.

1. Get the code: *Code → Download ZIP* on this page (then unzip it), or clone the repository.
2. `chrome://extensions` → turn on **Developer mode**.
3. **Load unpacked** → pick the folder.
4. Click the toolbar icon (or `Alt+Shift+A`) to open the side panel. To have it on the left: Chrome's *Settings → Appearance → Side panel position*.

After code changes: click the reload icon on the extension in `chrome://extensions`, then reopen the panel. Restarting Chrome is not enough: it keeps the old service worker.

## Features

- **Pinned tabs = the bookmarks bar**, both ways: pinning, renaming, moving and unpinning in the panel change the bookmarks (unpinning deletes one), and changes made in Chrome show up in the panel. Folders included, nested as deep as you like. With Chrome Sync they reach your other devices. A closed pinned tab keeps its place; once its tab has left the pinned page the row reads "icon / name", and the icon goes back.
- **Open or not**: a bookmark or favorite with its tab open has a small dot in the theme color, next to its icon in the list and under it on a tile.
- **Folders**: "…" on a folder's row (or right-click) for Rename, Change Icon (emoji with search), **Set Color…** (a colored area behind the folder and what's shown below it), Open / Close its tabs, nested folders, Ungroup, Delete. A closed folder keeps its open tabs in view; folding "Bookmarks" away leaves only the open ones.
- **Search** at the top: shows only the bookmarks (and tabs) whose title or address has every word typed, with their folders opened just for the search. `Enter` opens the first hit, `Esc` clears; typing anywhere in the panel or `Cmd/Ctrl+F` starts a search.
- **Favorites**: drag a tab or a pinned item to the top; drag tiles to reorder.
- **Open tabs** of the window below the divider. Its pin docks them (the pinned list scrolls on its own) or lets them follow; drag it to resize the pinned list, double-click to reset.
- **Status bar** at the bottom: how many tabs are open, and **Close All** to close every tab in the window (a second click confirms).
- **Multi-select** with `Shift`-click and `Cmd`-click (`Ctrl` elsewhere), then right-click: copy links, new folder with the items, close tabs, remove pins.
- **Menus** on tabs, pinned items, folders and favorites: open in new tab, back to saved URL / save current URL, close tabs above/below, mute, …
- **Theme** (any color, intensity, light/dark text) and **Sizing** (font, row height, spacing, folder indent and icon): right-click "Bookmarks".
- **Command bar**: `Alt+Shift+T`, the "+" above the open tabs, or a double-click below them. Suggestions from tabs and history; `Tab` on a site searches inside it. **`Alt+Shift+L`** opens it with the current tab's address selected, like Arc's `Cmd+L`: what you pick loads in that tab.
- **Memory**: tabs idle for 45 minutes are unloaded.
- `Alt+Shift+D` adds the current tab to the favorites. All shortcuts can be changed at `chrome://extensions/shortcuts`.

## Limits

Chrome doesn't allow extensions to:

- Hide its tab strip or the side panel's header: there is no `userChrome.css`.
- Take over `Cmd/Ctrl+T`, `Cmd/Ctrl+W` or `Cmd/Ctrl+L`: the command bar has its own shortcuts.
- Show split views or extension buttons in the panel: those stay in Chrome's toolbar.

Which tab belongs to which pinned item is kept per browser session; after a restart tabs are matched by URL. Pinned tabs are your bookmarks; favorites, theme, sizing and the folders' emoji, colors and open state are stored locally.

## Tab badges for other extensions

Other extensions can put small badges on tabs in the panel and add items to its tab menu, by messaging this extension; see the comment above `onMessageExternal` in `background.js`. The messages are the same as in the Firefox version (`bookmarc:…`, formerly `arcsidebar:…`), so extensions written for it work here too; only the extension ID differs.

## Development

`sidepanel/sidepanel.html?window=<windowId>` opens the panel as a normal page for that window, handy for DevTools.

| Path | What |
|---|---|
| `background.js` | Service worker: toolbar button, shortcuts, the command bar window, favorites by shortcut, badges, unloading idle tabs |
| `shared/store.js` | Data: favorites, the bookmarks bar as pinned items, theme, tab bindings |
| `shared/` | Also theme colors, badges, suggestions, DOM helpers and the emoji data |
| `sidepanel/` | The panel: search, favorites, pinned tabs and folders, tab list, status bar, menus and dialogs |
| `palette/` | The command bar |
| `welcome/` | The page shown once after installing |

## License

[MIT](LICENSE), like the original. Icons from [Lucide](https://lucide.dev) (ISC); the extension's icons in `icons/` are drawn from `icons/icon.svg`. Emoji data from [unicode-emoji-json](https://github.com/muan/unicode-emoji-json) and [emojilib](https://github.com/muan/emojilib) (MIT, see [`shared/emoji.LICENSE.txt`](shared/emoji.LICENSE.txt)).
