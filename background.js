/* Service worker: the toolbar button and shortcuts, the command bar window,
   favorites by shortcut, and keeping tabs bound to favorites / pinned items. */

import { uid, getFavorites, saveFavorites, bind, unbind, adoptAll, isNewTabUrl } from "./shared/store.js";
import { setBadges, setTabMenu, pruneProviders, announceToBadgeProviders } from "./shared/badges.js";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await adoptAll();
  announceToBadgeProviders();
  if (reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome/welcome.html") });
});
chrome.runtime.onStartup.addListener(async () => {
  await adoptAll();
  announceToBadgeProviders();
});

chrome.tabs.onRemoved.addListener((tabId) => unbind(tabId));

// ---------- Commands ----------

/** The command bar; with `editTab`, it starts on that tab's address and loads what's picked there. */
async function openCommandBar(windowId = null, editTab = null) {
  const win = windowId ? await chrome.windows.get(windowId) : await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
  const width = 640;
  const height = 440;
  const edit = editTab ? `&edit=${editTab.id}&url=${encodeURIComponent(editTab.url)}` : "";
  await chrome.windows.create({
    url: chrome.runtime.getURL(`palette/palette.html?window=${win.id}${edit}`),
    type: "popup",
    width,
    height,
    left: Math.round(win.left + (win.width - width) / 2),
    top: Math.round(win.top + Math.min(120, win.height / 6)),
    focused: true,
  });
}

async function addFavorite(tab) {
  if (!tab?.url || tab.url.startsWith(chrome.runtime.getURL(""))) return;
  const favorites = await getFavorites();
  if (favorites.some((f) => f.url === tab.url)) return;
  const fav = { id: uid(), url: tab.url, title: tab.title || tab.url };
  await saveFavorites([...favorites, fav]);
  await bind(tab.id, fav.id);
}

// The panel's "New Tab" row.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "command-bar") openCommandBar(msg.windowId);
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "command-bar") return openCommandBar();
  // Alt+Shift+L, Arc's Cmd+L (Chrome keeps that one): the current tab's address, to edit.
  if (command === "edit-address") {
    const target = tab || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
    const editable = target?.url && !isNewTabUrl(target.url);
    return openCommandBar(target?.windowId, editable ? target : null);
  }
  if (command === "add-favorite") {
    const target = tab || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
    return addFavorite(target);
  }
});

/* ---------- Tab badges from other extensions ---------- */

// Other extensions can tag tabs in the panel, e.g. mark tabs an AI agent controls:
//   chrome.runtime.sendMessage("<this extension's id>", {
//     type: "bookmarc:set-badges",
//     badges: [{ tabId, label: "AI", title: "Claude is controlling this tab", color: "#7c5cff" }],
//   });
// Optional: icon ("bot" or "sparkles", drawn instead of the label, styled like the sound icon),
// position ("start" puts it before the title, next to the sound icon; default "end", after
// the title), pulse (true blinks the badge; on an icon, a green dot blinks instead).
// Each call replaces that extension's badges; an empty list clears them. Badges last until
// Chrome restarts or this extension updates; then it sends { type: "bookmarc:ready" } to every
// extension that set badges before, so they can send them again.
//
// They can also add items to the panel's tab menu (right-click on a tab):
//   chrome.runtime.sendMessage("<this extension's id>", {
//     type: "bookmarc:set-tab-menu",
//     items: [{ id: "control", title: "Let AI agents control this tab", exceptTabIds: [12] }],
//   });
// tabIds limits an item to those tabs, exceptTabIds hides it on them. A click sends
// { type: "bookmarc:menu-clicked", id, tabId } back to that extension. Same lifetime as badges.
// The message format is the Firefox add-on's, so extensions written for it work
// here too; only the extension id differs. Until the rename to BookmArc the
// messages were named "arcsidebar:…".
chrome.runtime.onMessageExternal.addListener((msg, sender, respond) => {
  if (!sender.id) return;
  const done = () => respond({ ok: true });
  if (msg?.type === "bookmarc:set-badges") setBadges(sender.id, msg.badges).then(done);
  else if (msg?.type === "bookmarc:set-tab-menu") setTabMenu(sender.id, msg.items).then(done);
  else return;
  return true; // responds asynchronously
});

/* ---------- Freeing memory ----------
 * Tabs nobody has looked at for a while are discarded: the row keeps its title
 * and favicon, and the page loads again on click. */

const IDLE_MINUTES = 45; // long enough to come back to
const SWEEP_MINUTES = 5;

async function discardIdleTabs() {
  const now = Date.now();
  const tabs = await chrome.tabs.query({}).catch(() => []);
  const stale = tabs.filter((tab) => {
    if (tab.active || tab.discarded || tab.incognito || tab.audible || tab.status === "loading") return false;
    if ((tab.url || "").startsWith(chrome.runtime.getURL(""))) return false; // this extension's own pages
    return (tab.lastAccessed || now) < now - IDLE_MINUTES * 60_000;
  });
  let done = 0;
  for (const tab of stale) {
    await chrome.tabs
      .discard(tab.id)
      .then(() => done++)
      .catch(() => {});
  }
  if (stale.length) console.log(`BookmArc: unloaded ${done}/${stale.length} idle tabs`);
}

chrome.alarms.create("discard-idle", { periodInMinutes: SWEEP_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "discard-idle") {
    discardIdleTabs();
    pruneProviders();
  }
});
