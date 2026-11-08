/*! KIRION Atelier Panel v0.5.0
 * Atelier Panel: the sidebar panel where admins set the colours of the whole home: accent from a
 * colour wheel or presets, background harmony, glass strength. Colours are
 * derived server-side (kirion_atelier/preview) so the preview is exactly what
 * every device gets after saving.
 */

const I18N = {
  pl: {
    title: "Atelier Panel",
    subtitle: "Kolorystyka domu",
    accent: "Kolor akcentu",
    custom: "Własny",
    tones: "Odcienie",
    toneDark: "ciemny",
    toneLight: "jasny",
    background: "Tło",
    harmony: { analogous: "Analogiczne", complementary: "Dopełniające", mono: "Jednolite" },
    ambient: "Poświata",
    glass: "Szkło",
    blur: "Rozmycie",
    opacity: "Krycie kart",
    defaultTheme: "Motyw domyślny dla wszystkich",
    defaultHint: "Urządzenia bez własnego wyboru w profilu użyją KIRION Atelier.",
    save: "Zastosuj w całym domu",
    saving: "Zapisywanie…",
    reset: "Przywróć",
    dirty: "Niezapisane zmiany",
    saved: "Zapisano. Wszystkie urządzenia mają nowe kolory.",
    error: "Nie udało się zapisać",
    preview: "Podgląd",
    dark: "Ciemny",
    light: "Jasny",
    themeMissing: "Motyw nie jest wczytany. Sprawdź Ustawienia → Naprawy.",
    wheel: "Koło kolorów: strzałki zmieniają odcień i nasycenie",
    sample: {
      weather: "Pogoda",
      temperature: "Temperatura",
      light: "Lampa w salonie",
      climate: "Klimatyzacja",
      media: "Głośnik w salonie",
      mediaTitle: "Poranna playlista",
      cover: "Rolety",
    },
  },
  en: {
    title: "Atelier Panel",
    subtitle: "Colours of your home",
    accent: "Accent colour",
    custom: "Custom",
    tones: "Tones",
    toneDark: "dark",
    toneLight: "light",
    background: "Background",
    harmony: { analogous: "Analogous", complementary: "Complementary", mono: "Monochrome" },
    ambient: "Glow",
    glass: "Glass",
    blur: "Blur",
    opacity: "Card opacity",
    defaultTheme: "Default theme for everyone",
    defaultHint: "Devices without their own choice in the profile use KIRION Atelier.",
    save: "Apply to the whole home",
    saving: "Saving…",
    reset: "Revert",
    dirty: "Unsaved changes",
    saved: "Saved. Every device now has the new colours.",
    error: "Could not save",
    preview: "Preview",
    dark: "Dark",
    light: "Light",
    themeMissing: "The theme is not loaded. Check Settings → Repairs.",
    wheel: "Colour wheel: arrow keys change hue and saturation",
    sample: {
      weather: "Weather",
      temperature: "Temperature",
      light: "Living room lamp",
      climate: "Air conditioning",
      media: "Living room speaker",
      mediaTitle: "Morning playlist",
      cover: "Blinds",
    },
  },
};

// Preview-only entities; never registered in Home Assistant.
const SAMPLE = {
  weather: "weather.atelier_preview",
  temperature: "sensor.atelier_preview_temperature",
  light: "light.atelier_preview",
  climate: "climate.atelier_preview",
  media: "media_player.atelier_preview",
  cover: "cover.atelier_preview",
};

/* ------------------------------------------------------------- colour -- */

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function hexToHsv(hex) {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/* --------------------------------------------------------------- view -- */

const STYLES = `
  :host {
    display: block;
    min-height: 100vh;
    --pick: var(--primary-color);
    --on-pick: var(--text-primary-color, #fff);
    --fill: var(--atelier-fill, rgba(127, 127, 127, 0.1));
    --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    color: var(--primary-text-color);
    font-family: var(--ha-font-family-body, var(--primary-font-family, inherit));
    -webkit-font-smoothing: antialiased;
  }
  .page { min-height: 100vh; background: var(--lovelace-background, var(--primary-background-color)); }
  .toolbar {
    position: sticky; top: 0; z-index: 2; height: 56px; display: flex; align-items: center; gap: 4px;
    padding: 0 12px; box-sizing: border-box;
    background: var(--app-header-background-color); color: var(--app-header-text-color, var(--primary-text-color));
    border-bottom: var(--app-header-border-bottom, none);
    backdrop-filter: var(--atelier-backdrop, none); -webkit-backdrop-filter: var(--atelier-backdrop, none);
  }
  .toolbar h1 { margin: 0 0 0 4px; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
  .toolbar .sub { margin-left: 10px; font-size: 14px; color: var(--secondary-text-color); }
  .layout {
    max-width: 1180px; margin: 0 auto; padding: 24px 16px 48px; box-sizing: border-box;
    display: grid; gap: 24px; grid-template-columns: minmax(300px, 380px) minmax(0, 1fr); align-items: start;
  }
  .glass {
    background: var(--ha-card-background, var(--card-background-color));
    border-radius: var(--ha-card-border-radius, 22px);
    box-shadow: var(--atelier-edge, inset 0 0 0 transparent), var(--ha-card-box-shadow, 0 0 0 transparent);
    backdrop-filter: var(--atelier-backdrop, none); -webkit-backdrop-filter: var(--atelier-backdrop, none);
  }
  .controls { padding: 8px 20px 20px; }
  .group { padding: 18px 0; border-bottom: 1px solid var(--divider-color); }
  .group:last-of-type { border-bottom: none; }
  .label {
    font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--secondary-text-color); margin-bottom: 14px;
  }
  .banner {
    margin: 12px 0 0; padding: 10px 14px; border-radius: 14px; font-size: 13px;
    background: rgba(var(--rgb-warning-color, 255, 166, 0), 0.14); color: var(--primary-text-color);
  }

  /* Wheel */
  .wheel {
    position: relative; width: min(100%, 248px); aspect-ratio: 1; margin: 2px auto 18px;
    border-radius: 50%; cursor: crosshair; touch-action: none; outline: none;
    box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  .disc {
    position: absolute; inset: 0; border-radius: 50%;
    background:
      radial-gradient(closest-side, #fff, rgba(255, 255, 255, 0)),
      conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  }
  .disc::after {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    box-shadow: inset 0 0 0 6px rgba(255, 255, 255, 0.10), inset 0 2px 10px rgba(0, 0, 0, 0.18);
  }
  .wheel:focus-visible { box-shadow: 0 0 0 3px var(--pick), 0 18px 40px -22px rgba(0, 0, 0, 0.55); }
  .handle {
    position: absolute; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%;
    border: 3px solid #fff; box-sizing: border-box; pointer-events: none;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s var(--ease);
  }
  .wheel.dragging .handle { transform: scale(1.18); }

  .hexrow { display: flex; align-items: center; gap: 10px; }
  .hexfield {
    flex: 1; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px;
    border-radius: 14px; background: var(--fill);
  }
  .hexfield .dot { width: 20px; height: 20px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12); }
  .hexfield input {
    flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: inherit;
    font: inherit; font-size: 15px; font-variant-numeric: tabular-nums; letter-spacing: 0.04em; text-transform: uppercase;
  }
  .hexfield:focus-within { box-shadow: 0 0 0 2px var(--pick); }
  .preset-name { font-size: 13px; color: var(--secondary-text-color); min-width: 64px; text-align: right; }

  .presets { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-top: 16px; }
  .preset {
    aspect-ratio: 1; width: 100%; max-width: 34px; justify-self: center; padding: 0; border: 0; border-radius: 50%;
    cursor: pointer; background: var(--c); position: relative;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1); transition: transform 0.2s var(--ease);
  }
  .preset:hover { transform: scale(1.08); }
  .preset:focus-visible { outline: 2px solid var(--pick); outline-offset: 2px; }
  .preset[aria-pressed="true"]::after {
    content: ""; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid var(--primary-text-color);
  }

  .tones { display: flex; gap: 8px; margin-top: 16px; font-size: 12.5px; color: var(--secondary-text-color); align-items: center; }
  .tone { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 5px; border-radius: 999px; background: var(--fill); }
  .tone i { width: 16px; height: 16px; border-radius: 50%; }

  /* Segmented control */
  .seg { display: flex; padding: 3px; border-radius: 999px; background: var(--fill); }
  .seg button {
    flex: 1; font: inherit; font-size: 13px; border: 0; background: none; color: var(--secondary-text-color);
    padding: 7px 10px; border-radius: 999px; cursor: pointer; transition: background 0.25s var(--ease), color 0.25s;
  }
  .seg button[aria-pressed="true"] { background: var(--pick); color: var(--on-pick); }
  .seg button:focus-visible { outline: 2px solid var(--pick); outline-offset: 1px; }

  /* Sliders */
  .slider { display: block; margin-top: 18px; }
  .slider .row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; }
  .slider output { color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  input[type="range"] {
    -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 6px; margin: 0;
    background: linear-gradient(90deg, var(--pick) var(--p), var(--fill) var(--p)); outline: none; cursor: pointer;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); border: 0;
  }
  input[type="range"]::-moz-range-thumb {
    width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); border: 0;
  }
  input[type="range"]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--pick); }

  /* Switch */
  .switchrow { display: flex; align-items: center; gap: 16px; }
  .switchrow .text { flex: 1; }
  .switchrow .title { font-size: 14px; }
  .switchrow .hint { font-size: 12.5px; color: var(--secondary-text-color); margin-top: 3px; }
  .switch { position: relative; width: 46px; height: 28px; flex: none; }
  .switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
  .switch span {
    position: absolute; inset: 0; border-radius: 999px; background: var(--fill); pointer-events: none;
    transition: background 0.25s var(--ease);
  }
  .switch span::after {
    content: ""; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); transition: transform 0.25s var(--ease);
  }
  .switch input:checked + span { background: var(--pick); }
  .switch input:checked + span::after { transform: translateX(18px); }
  .switch input:focus-visible + span { box-shadow: 0 0 0 2px var(--pick); }

  /* Actions */
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding-top: 18px; }
  .status { flex: 1 1 100%; font-size: 13px; color: var(--secondary-text-color); min-height: 18px; }
  .status.err { color: var(--error-color, #db4437); }
  .actions button {
    font: inherit; font-size: 14px; font-weight: 600; border: 0; border-radius: 999px; height: 44px; padding: 0 20px;
    cursor: pointer; transition: transform 0.2s var(--ease), opacity 0.2s;
  }
  .actions button:active { transform: scale(0.97); }
  .actions button:disabled { opacity: 0.45; cursor: default; transform: none; }
  .actions .primary { flex: 1; background: var(--pick); color: var(--on-pick); box-shadow: 0 10px 24px -12px var(--pick); }
  .actions .ghost { background: var(--fill); color: var(--primary-text-color); }
  .actions button:focus-visible { outline: 2px solid var(--pick); outline-offset: 2px; }

  /* Preview */
  .preview { position: sticky; top: 80px; }
  .stage {
    /* Concentric corners: the frame's radius is the card radius plus the gap. */
    --gap: 14px;
    border-radius: calc(var(--ha-card-border-radius, 22px) + var(--gap)); padding: var(--gap);
    overflow: hidden; isolation: isolate; contain: paint; position: relative;
    background: var(--lovelace-background, var(--primary-background-color));
    color: var(--primary-text-color); transition: background 0.4s var(--ease);
    box-shadow: 0 30px 60px -36px rgba(0, 0, 0, 0.6);
  }
  .stage-head { display: flex; align-items: center; justify-content: space-between; margin: 2px 4px var(--gap) 8px; }
  .stage-head .label { margin: 0; }
  .stage-head .seg { width: 180px; }
  .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .cards > * { min-width: 0; }
  .cards .wide { grid-column: 1 / -1; }
  .cards .tile { height: 120px; }

  @media (max-width: 860px) {
    .layout { grid-template-columns: 1fr; padding: 16px 12px 40px; }
    .preview { position: static; order: -1; }
    .toolbar .sub { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
`;

class AtelierPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._mode = null;
    this._pending = null;
    this._inflight = false;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._init();
    if (this._menu) {
      this._menu.hass = hass;
    }
    if (this._cards) {
      const preview = this._previewHass();
      for (const card of this._cards) card.hass = preview;
    }
  }

  set narrow(narrow) {
    this._narrow = narrow;
    if (this._menu) this._menu.narrow = narrow;
  }

  get t() {
    const lang = this._hass?.locale?.language || this._hass?.language || "en";
    return lang.startsWith("pl") ? I18N.pl : I18N.en;
  }

  async _init() {
    this._mode = this._hass.themes?.darkMode ? "dark" : "light";
    try {
      this._state = await this._hass.callWS({ type: "kirion_atelier/get" });
    } catch (err) {
      this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="page"><p style="padding:24px">${err.message || err.code}</p></div>`;
      return;
    }
    this._saved = { ...this._state.palette, default_theme: this._state.default_theme };
    this._draft = { ...this._saved };
    this._render();
    this._sync();
    this._requestPreview();
  }

  /* -------------------------------------------------------------- build -- */

  _render() {
    const t = this.t;
    const { presets, limits } = this._state;
    const slider = (key, label, unit) => `
      <label class="slider">
        <div class="row"><span>${label}</span><output data-out="${key}"></output></div>
        <input type="range" data-key="${key}" min="${limits[key][0]}" max="${limits[key][1]}" step="1" data-unit="${unit}">
      </label>`;

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="page">
        <header class="toolbar">
          <ha-menu-button></ha-menu-button>
          <h1>${t.title}</h1><span class="sub">${t.subtitle}</span>
        </header>
        <main class="layout">
          <section class="controls glass" aria-label="${t.subtitle}">
            ${this._state.theme_loaded ? "" : `<div class="banner">${t.themeMissing}</div>`}
            <div class="group">
              <div class="label">${t.accent}</div>
              <div class="wheel" tabindex="0" role="slider" aria-label="${t.wheel}">
                <div class="disc"></div><div class="handle"></div>
              </div>
              <div class="hexrow">
                <label class="hexfield"><span class="dot"></span><input class="hex" maxlength="7" spellcheck="false" aria-label="HEX"></label>
                <span class="preset-name"></span>
              </div>
              <div class="presets">
                ${presets.map((p) => `<button class="preset" style="--c:${p.accent}" data-accent="${p.accent}" title="${p.name}" aria-label="${p.name}"></button>`).join("")}
              </div>
              <div class="tones">${t.tones}
                <span class="tone"><i data-tone="dark"></i>${t.toneDark}</span>
                <span class="tone"><i data-tone="light"></i>${t.toneLight}</span>
              </div>
            </div>
            <div class="group">
              <div class="label">${t.background}</div>
              <div class="seg" data-seg="harmony">
                ${Object.entries(t.harmony).map(([k, v]) => `<button data-v="${k}">${v}</button>`).join("")}
              </div>
              ${slider("ambient", t.ambient, "%")}
            </div>
            <div class="group">
              <div class="label">${t.glass}</div>
              ${slider("blur", t.blur, " px")}
              ${slider("opacity", t.opacity, "%")}
            </div>
            <div class="group switchrow">
              <div class="text"><div class="title">${t.defaultTheme}</div><div class="hint">${t.defaultHint}</div></div>
              <label class="switch"><input type="checkbox" class="default" aria-label="${t.defaultTheme}"><span></span></label>
            </div>
            <div class="actions">
              <div class="status" role="status"></div>
              <button class="ghost" data-act="reset">${t.reset}</button>
              <button class="primary" data-act="save">${t.save}</button>
            </div>
          </section>
          <section class="preview" aria-label="${t.preview}">
            <div class="stage">
              <div class="stage-head">
                <div class="label">${t.preview}</div>
                <div class="seg" data-seg="mode"><button data-v="dark">${t.dark}</button><button data-v="light">${t.light}</button></div>
              </div>
              <!-- inert: preview cards must never toggle real devices -->
              <div class="cards" inert></div>
            </div>
          </section>
        </main>
      </div>`;

    const $ = (s) => this.shadowRoot.querySelector(s);
    this._menu = $("ha-menu-button");
    this._menu.hass = this._hass;
    this._menu.narrow = this._narrow;

    this._bindWheel($(".wheel"));
    $(".hex").addEventListener("change", (e) => this._setHex(e.target.value));
    $(".hex").addEventListener("keydown", (e) => e.key === "Enter" && this._setHex(e.target.value));
    $(".presets").addEventListener("click", (e) => {
      const btn = e.target.closest(".preset");
      if (btn) this._update({ accent: btn.dataset.accent });
    });
    for (const seg of this.shadowRoot.querySelectorAll(".seg")) {
      seg.addEventListener("click", (e) => {
        const v = e.target.closest("button")?.dataset.v;
        if (!v) return;
        if (seg.dataset.seg === "mode") {
          this._mode = v;
          this._sync();
          this._applyPreview();
        } else this._update({ harmony: v });
      });
    }
    for (const input of this.shadowRoot.querySelectorAll('input[type="range"]')) {
      input.addEventListener("input", () => this._update({ [input.dataset.key]: Number(input.value) }));
    }
    $(".default").addEventListener("change", (e) => this._update({ default_theme: e.target.checked }, false));
    $('[data-act="save"]').addEventListener("click", () => this._save());
    $('[data-act="reset"]').addEventListener("click", () => {
      this._draft = { ...this._saved };
      this._status("");
      this._sync();
      this._requestPreview();
    });

    this._buildCards($(".cards"));
  }

  // Sample devices for the preview, so it always shows the same climate,
  // light and media cards whatever the home has. They exist only in the
  // hass object handed to the preview cards.
  _sampleStates() {
    const t = this.t.sample;
    const now = new Date().toISOString();
    const s = (entity_id, state, attributes) => ({
      entity_id, state, attributes, last_changed: now, last_updated: now, context: { id: "", parent_id: null, user_id: null },
    });
    const unit = this._hass.config?.unit_system?.temperature ?? "°C";
    return Object.fromEntries(
      [
        s(SAMPLE.weather, "sunny", { friendly_name: t.weather, temperature: 18, temperature_unit: unit }),
        s(SAMPLE.temperature, "21.5", { friendly_name: t.temperature, unit_of_measurement: unit, device_class: "temperature", state_class: "measurement" }),
        s(SAMPLE.light, "on", { friendly_name: t.light, brightness: 178, rgb_color: [255, 184, 122], color_mode: "rgb", supported_color_modes: ["rgb"] }),
        s(SAMPLE.climate, "heat", { friendly_name: t.climate, current_temperature: 21.5, temperature: 22, hvac_action: "heating", hvac_modes: ["off", "heat", "cool", "auto"] }),
        s(SAMPLE.media, "playing", { friendly_name: t.media, media_title: t.mediaTitle, volume_level: 0.32 }),
        s(SAMPLE.cover, "open", { friendly_name: t.cover, current_position: 60, device_class: "blind" }),
      ].map((x) => [x.entity_id, x])
    );
  }

  _previewHass() {
    this._samples ??= this._sampleStates();
    return { ...this._hass, states: { ...this._hass.states, ...this._samples } };
  }

  // The cards module may load after this one, so wait for the card elements.
  async _buildCards(host) {
    const defs = [
      ["kirion-atelier-hero-card", { weather: SAMPLE.weather, entities: [SAMPLE.temperature, SAMPLE.media] }, "wide"],
      ["kirion-atelier-tile-card", { entity: SAMPLE.light }, "tile"],
      ["kirion-atelier-tile-card", { entity: SAMPLE.climate }, "tile"],
      ["kirion-atelier-tile-card", { entity: SAMPLE.media }, "tile"],
      ["kirion-atelier-tile-card", { entity: SAMPLE.cover }, "tile"],
    ];
    const hass = this._previewHass();

    this._cards = [];
    // Ask the element itself, not the registry: some HACS add-ons replace
    // window.customElements with a polyfill whose get()/whenDefined() never
    // see elements registered before it.
    const ready = async (tag) => {
      for (let i = 0; i < 50; i++) {
        if (typeof document.createElement(tag).setConfig === "function") return true;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      return false;
    };
    for (const [tag, config, cls] of defs) {
      if (!(await ready(tag))) continue;
      const el = document.createElement(tag);
      try {
        el.setConfig(Object.fromEntries(Object.entries(config).filter(([, v]) => v !== undefined)));
      } catch {
        continue;
      }
      el.classList.add(cls);
      el.hass = hass;
      host.append(el);
      this._cards.push(el);
    }
  }

  /* -------------------------------------------------------------- wheel -- */

  _bindWheel(wheel) {
    const fromPointer = (e) => {
      const r = wheel.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const h = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
      this._update({ accent: hsvToHex({ h: (h + 360) % 360, s, v: 1 }) });
    };
    wheel.addEventListener("pointerdown", (e) => {
      wheel.setPointerCapture(e.pointerId);
      wheel.classList.add("dragging");
      fromPointer(e);
    });
    wheel.addEventListener("pointermove", (e) => wheel.hasPointerCapture(e.pointerId) && fromPointer(e));
    const end = () => wheel.classList.remove("dragging");
    wheel.addEventListener("pointerup", end);
    wheel.addEventListener("pointercancel", end);
    wheel.addEventListener("keydown", (e) => {
      const hsv = hexToHsv(this._draft.accent);
      const step = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, 0.04], ArrowDown: [0, -0.04] }[e.key];
      if (!step) return;
      e.preventDefault();
      this._update({
        accent: hsvToHex({ h: (hsv.h + step[0] + 360) % 360, s: Math.min(1, Math.max(0, hsv.s + step[1])), v: hsv.v || 1 }),
      });
    });
  }

  _setHex(value) {
    let hex = value.trim().toUpperCase();
    if (!hex.startsWith("#")) hex = `#${hex}`;
    if (/^#[0-9A-F]{3}$/.test(hex)) hex = "#" + [...hex.slice(1)].map((c) => c + c).join("");
    if (/^#[0-9A-F]{6}$/.test(hex)) this._update({ accent: hex });
    else this._sync();
  }

  /* -------------------------------------------------------------- state -- */

  _update(patch, preview = true) {
    this._draft = { ...this._draft, ...patch };
    this._status(this._dirty ? this.t.dirty : "");
    this._sync();
    if (preview) this._requestPreview();
  }

  get _dirty() {
    return JSON.stringify(this._draft) !== JSON.stringify(this._saved);
  }

  _paletteOf(draft) {
    const { default_theme, ...palette } = draft;
    return palette;
  }

  // One request in flight; the newest draft wins, so dragging stays smooth.
  async _requestPreview() {
    if (this._inflight) {
      this._pending = true;
      return;
    }
    this._inflight = true;
    try {
      const res = await this._hass.callWS({ type: "kirion_atelier/preview", palette: this._paletteOf(this._draft) });
      this._theme = res.theme;
      this._applyPreview();
    } catch (err) {
      this._status(`${this.t.error}: ${err.message || err.code}`, true);
    } finally {
      this._inflight = false;
      if (this._pending) {
        this._pending = false;
        this._requestPreview();
      }
    }
  }

  _applyPreview() {
    if (!this._theme) return;
    const stage = this.shadowRoot.querySelector(".stage");
    for (const [key, value] of Object.entries(this._theme[this._mode])) {
      // The theme pins the glow to the viewport; inside the stage it should scroll with it.
      stage.style.setProperty(`--${key}`, key === "lovelace-background" ? value.replaceAll(" fixed", "") : value);
    }
    const uiMode = this._hass.themes?.darkMode ? "dark" : "light";
    this.style.setProperty("--pick", this._theme[uiMode]["atelier-accent"]);
    this.style.setProperty("--on-pick", this._theme[uiMode]["atelier-on-accent"]);
    for (const tone of this.shadowRoot.querySelectorAll("[data-tone]")) {
      tone.style.background = this._theme[tone.dataset.tone]["atelier-accent"];
    }
  }

  _sync() {
    const root = this.shadowRoot;
    const d = this._draft;
    const t = this.t;
    const { h, s } = hexToHsv(d.accent);
    const handle = root.querySelector(".handle");
    const rad = (h * Math.PI) / 180;
    handle.style.left = `${50 + Math.sin(rad) * s * 50}%`;
    handle.style.top = `${50 - Math.cos(rad) * s * 50}%`;
    handle.style.background = d.accent;
    root.querySelector(".wheel").setAttribute("aria-valuetext", d.accent);
    root.querySelector(".dot").style.background = d.accent;
    const hex = root.querySelector(".hex");
    if (this.shadowRoot.activeElement !== hex) hex.value = d.accent;
    const preset = this._state.presets.find((p) => p.accent.toUpperCase() === d.accent.toUpperCase());
    root.querySelector(".preset-name").textContent = preset ? preset.name : t.custom;
    for (const b of root.querySelectorAll(".preset")) {
      b.setAttribute("aria-pressed", String(b.dataset.accent.toUpperCase() === d.accent.toUpperCase()));
    }
    for (const b of root.querySelectorAll('[data-seg="harmony"] button')) b.setAttribute("aria-pressed", String(b.dataset.v === d.harmony));
    for (const b of root.querySelectorAll('[data-seg="mode"] button')) b.setAttribute("aria-pressed", String(b.dataset.v === this._mode));
    for (const input of root.querySelectorAll('input[type="range"]')) {
      const key = input.dataset.key;
      input.value = d[key];
      const [lo, hi] = this._state.limits[key];
      input.style.setProperty("--p", `${((d[key] - lo) / (hi - lo)) * 100}%`);
      root.querySelector(`[data-out="${key}"]`).textContent = `${d[key]}${input.dataset.unit}`;
    }
    root.querySelector(".default").checked = d.default_theme;
    root.querySelector('[data-act="save"]').disabled = !this._dirty;
    root.querySelector('[data-act="reset"]').disabled = !this._dirty;
  }

  _status(text, error = false) {
    const el = this.shadowRoot.querySelector(".status");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("err", error);
  }

  async _save() {
    const btn = this.shadowRoot.querySelector('[data-act="save"]');
    btn.disabled = true;
    btn.textContent = this.t.saving;
    try {
      const state = await this._hass.callWS({
        type: "kirion_atelier/save",
        palette: this._paletteOf(this._draft),
        default_theme: this._draft.default_theme,
      });
      this._state = { ...this._state, ...state };
      this._saved = { ...state.palette, default_theme: this._draft.default_theme };
      this._draft = { ...this._saved };
      this._status(this.t.saved);
    } catch (err) {
      this._status(`${this.t.error}: ${err.message || err.code}`, true);
    } finally {
      btn.textContent = this.t.save;
      this._sync();
    }
  }
}

try {
  if (!customElements.get("kirion-atelier-panel")) customElements.define("kirion-atelier-panel", AtelierPanel);
} catch (err) {
  // already defined by another copy of this module
}
