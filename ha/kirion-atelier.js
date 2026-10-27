// KIRION Atelier — stable entry point for Home Assistant (frontend.extra_module_url).
// This file never changes, so its URL can stay in configuration.yaml forever.
// It reads VERSION (written by tools/ha-update.sh) without cache and imports the
// real modules with that version in the URL: after an update a normal page
// refresh is enough, and between updates the browser cache still works.
(async () => {
  const base = new URL(".", import.meta.url);
  let version = "";
  try {
    const res = await fetch(new URL("VERSION", base), { cache: "no-store" });
    if (res.ok) version = (await res.text()).trim();
  } catch (e) {
    // Offline or file missing — fall through to a one-off stamp.
  }
  version ||= String(Date.now());

  for (const file of ["kirion-atelier-glass.js", "kirion-atelier-cards.js"]) {
    try {
      await import(new URL(`${file}?v=${encodeURIComponent(version)}`, base).href);
    } catch (e) {
      console.error(`KIRION Atelier: failed to load ${file}`, e);
    }
  }
})();
