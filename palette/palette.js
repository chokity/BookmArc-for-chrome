/* The command bar, in a small popup window (Alt+Shift+T). Picking something
   opens it in a new tab of the window it was called from, or switches to an
   open tab. Esc or clicking elsewhere closes the bar.
   With Alt+Shift+L it edits a tab's address instead (?edit=<tabId>&url=…):
   it starts on that address, and what's picked loads in that tab. */
import { h, setIcon } from "../shared/dom.js";
import { getTheme } from "../shared/store.js";
import { paintTheme } from "../shared/theme.js";
import { resolve, openIn, switchToTab, suggestFor, topSiteItems } from "../shared/suggest.js";

const params = new URLSearchParams(location.search);
const windowId = Number(params.get("window"));
const editTabId = Number(params.get("edit")) || null; // the tab whose address this bar edits

const input = document.getElementById("q");
const scopeEl = document.getElementById("scope");
const list = document.getElementById("list");
const hint = document.getElementById("hint");

// Re-rendering moves rows under a resting cursor, which fires mouseenter;
// hover only counts once the mouse has actually moved again.
let pointerActive = true;
document.addEventListener("mousemove", () => {
  pointerActive = true;
});

let items = [];
let itemsFor = "";
let selected = 0;
let token = 0;
let scope = null; // { host } — search inside one site
let running = false;

const close = () => window.close();

/* ---------- Searching inside a site ----------
 * Tab on something that looks like a site turns it into a chip: the next
 * thing typed is searched there with the default engine ("site:" query). */

function scopeFor(text) {
  const r = resolve(text);
  if (!r?.url) return null;
  try {
    const host = new URL(r.url).hostname.replace(/^www\./, "");
    return host.includes(".") ? { host } : null;
  } catch {
    return null;
  }
}

function setScope(next) {
  scope = next;
  scopeEl.hidden = !next;
  scopeEl.textContent = next ? next.host : "";
  input.placeholder = next ? `Search ${next.host}…` : "Search or Enter URL…";
  input.value = "";
  update();
}

async function run(item) {
  if (running || !item) return;
  running = true;
  try {
    if (item.tab) {
      await switchToTab(item.tab, windowId);
    } else {
      const target = scope ? { search: `site:${scope.host} ${item.target.search}` } : item.target;
      const tab = editTabId ? { id: editTabId } : await chrome.tabs.create({ windowId, active: true });
      await openIn(tab.id, target);
      if (editTabId) await chrome.tabs.update(editTabId, { active: true });
      await chrome.windows.update(windowId, { focused: true });
    }
    close();
  } catch (err) {
    console.error("BookmArc: command bar action failed", err);
    running = false;
  }
}

const SUBS = { go: "Open", search: "Search", tab: "Switch to Tab" };

function render() {
  list.replaceChildren(
    ...items.map((item, i) => {
      const icon = h("span", { className: "icon" });
      if (item.kind === "tab" || item.kind === "history") setIcon(icon, item.icon, item.url);
      else icon.textContent = item.kind === "search" ? "⌕" : "↗";
      const side =
        item.kind === "tab"
          ? h("span", { className: "side" }, "Switch to Tab", h("span", { className: "key" }, "→"))
          : item.kind === "history" && item.sub
            ? null
            : h("span", { className: "side" }, SUBS[item.kind] || "");
      return h(
        "li",
        {
          className: i === selected ? "selected" : "",
          onmouseenter: () => {
            if (!pointerActive) return;
            selected = i;
            for (const [j, row] of [...list.children].entries()) row.classList.toggle("selected", j === i);
          },
          onmousedown: (e) => {
            e.preventDefault();
            run(item);
          },
        },
        h("span", { className: "chip" }, icon),
        h(
          "span",
          { className: "label" },
          item.label,
          item.kind === "history" && item.sub ? h("span", { className: "domain" }, ` — ${item.sub}`) : null
        ),
        side
      );
    })
  );
}

async function update() {
  const text = input.value.trim();
  const mine = ++token;
  if (scope) {
    items = text ? [{ kind: "search", label: text, sub: `Search ${scope.host}`, target: { search: text } }] : [];
    itemsFor = text;
    selected = 0;
    render();
    return;
  }
  const next = text ? await suggestFor(text, { max: 8, excludeTabId: editTabId }) : await topSiteItems({ max: 6 });
  if (mine !== token) return;
  items = next;
  itemsFor = text;
  selected = 0;
  hint.textContent = text ? "↵ to open" : "";
  render();
}

let debounce = 0;
input.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(update, 50);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    close();
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!items.length) return;
    e.preventDefault();
    pointerActive = false;
    selected = (selected + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    render();
    list.children[selected]?.scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    const text = input.value.trim();
    // Suggestions may lag behind fast typing; fall back to the raw text.
    if (items[selected] && itemsFor === text) run(items[selected]);
    else if (text) run(scope ? { target: { search: text } } : { target: resolve(text) });
  } else if (e.key === "Tab" && input.value.trim()) {
    e.preventDefault();
    const next = scopeFor(input.value.trim());
    if (next) setScope(next);
    else run({ target: { search: input.value.trim() } });
  } else if (e.key === "Backspace" && scope && !input.value) {
    e.preventDefault();
    setScope(null);
  }
});

// Clicking anywhere else dismisses it.
window.addEventListener("blur", () => {
  if (!running) close();
});

if (editTabId) {
  // The tab's address, selected: typing replaces it, the arrows edit it.
  input.value = params.get("url") || "";
  input.select();
}
input.focus();
update();

// Tint with the theme color.
paintTheme(await getTheme());
