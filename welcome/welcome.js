/* Welcome page, opened once on install. */

// Shortcuts are written for macOS; show the Windows/Linux keys elsewhere.
if (!navigator.platform.startsWith("Mac")) {
  const keys = { "⌥⇧A": "Alt+Shift+A", "⌥⇧T": "Alt+Shift+T", "⌥⇧L": "Alt+Shift+L", "⇧": "Shift", "⌘": "Ctrl", "⇥": "Tab", "⌘T": "Ctrl+T", "⌘W": "Ctrl+W" };
  for (const kbd of document.querySelectorAll("kbd")) kbd.textContent = keys[kbd.textContent] || kbd.textContent;
}

// chrome:// pages can't be linked to; an extension may open them as a tab.
document.getElementById("shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
