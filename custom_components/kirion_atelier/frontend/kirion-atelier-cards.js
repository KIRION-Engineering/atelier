/*! KIRION Atelier Cards v0.4.3
 * Minimal glass cards for Home Assistant: hero, tile, room, chips.
 * Styled through KIRION Atelier theme tokens; fall back to stock HA variables.
 */
const VERSION = "0.4.3";

/* ---------------------------------------------------------------- i18n -- */

const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
};

const I18N = {
  pl: {
    morning: "Dzień dobry",
    afternoon: "Miłego popołudnia",
    evening: "Dobry wieczór",
    night: "Dobrej nocy",
    active: (n) =>
      n === 0 ? "Wszystko wyłączone"
        : `${n} ${plural(n, "urządzenie aktywne", "urządzenia aktywne", "urządzeń aktywnych")}`,
    not_found: "Nie znaleziono encji",
    confirm: "Czy na pewno?",
    labels: {
      entity: "Encja", name: "Nazwa", icon: "Ikona", entities: "Encje",
      weather: "Pogoda", temperature: "Czujnik temperatury", humidity: "Czujnik wilgotności",
      navigation_path: "Ścieżka po kliknięciu nazwy", show_clock: "Pokaż zegar",
      tap_action: "Akcja kliknięcia", hold_action: "Akcja przytrzymania",
    },
  },
  en: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Good night",
    active: (n) => (n === 0 ? "Everything off" : `${n} active`),
    not_found: "Entity not found",
    confirm: "Are you sure?",
    labels: {
      entity: "Entity", name: "Name", icon: "Icon", entities: "Entities",
      weather: "Weather", temperature: "Temperature sensor", humidity: "Humidity sensor",
      navigation_path: "Path when the name is tapped", show_clock: "Show clock",
      tap_action: "Tap action", hold_action: "Hold action",
    },
  },
};

const lang = (hass) => (hass?.locale?.language || hass?.language || "en");
const t = (hass) => (lang(hass).startsWith("pl") ? I18N.pl : I18N.en);

/* ------------------------------------------------------------- helpers -- */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fire = (node, type, detail = {}) =>
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));

const haptic = (kind = "light") => fire(window, "haptic", kind);

const domainOf = (id = "") => id.split(".")[0];

const ACTIVE = new Set([
  "on", "open", "opening", "closing", "playing", "home", "unlocked", "unlocking",
  "heat", "cool", "heat_cool", "auto", "dry", "fan_only", "cleaning", "active",
]);

const isActive = (s) => {
  if (!s) return false;
  const d = domainOf(s.entity_id);
  if (d === "sensor" || d === "weather") return false;
  if (d === "climate") return s.state !== "off" && s.state !== "unavailable";
  return ACTIVE.has(s.state);
};

const TOGGLEABLE = new Set([
  "light", "switch", "fan", "input_boolean", "automation", "siren", "humidifier", "climate",
  "cover", "valve", "media_player", "lock", "script", "scene", "button", "input_button", "vacuum",
]);

function toggle(hass, s) {
  const id = s.entity_id;
  const d = domainOf(id);
  const call = (domain, service) => hass.callService(domain, service, { entity_id: id });
  switch (d) {
    case "lock": return call("lock", s.state === "locked" ? "unlock" : "lock");
    case "script":
    case "scene": return call(d, "turn_on");
    case "button":
    case "input_button": return call(d, "press");
    case "media_player": return call(d, "media_play_pause");
    case "cover":
    case "valve": return call(d, "toggle");
    case "vacuum": return call(d, s.state === "cleaning" ? "return_to_base" : "start");
    default: return call("homeassistant", "toggle");
  }
}

const nameOf = (hass, s, override) =>
  override ?? s?.attributes?.friendly_name ?? s?.entity_id ?? "";

const stateText = (hass, s) => {
  if (!s) return t(hass).not_found;
  if (hass.formatEntityState) return hass.formatEntityState(s);
  const unit = s.attributes.unit_of_measurement;
  return unit ? `${s.state} ${unit}` : s.state;
};

// Secondary reading shown next to the state for dimmable/positional entities.
const levelOf = (s) => {
  if (!s || !isActive(s)) return null;
  const d = domainOf(s.entity_id);
  if (d === "light" && s.attributes.brightness != null)
    return Math.round((s.attributes.brightness / 255) * 100);
  if ((d === "cover" || d === "valve") && s.attributes.current_position != null)
    return s.attributes.current_position;
  if (d === "fan" && s.attributes.percentage != null) return s.attributes.percentage;
  if (d === "media_player" && s.attributes.volume_level != null)
    return Math.round(s.attributes.volume_level * 100);
  return null;
};

// What a tile shows after the state: the reading that matters for the domain,
// falling back to the level (brightness, position, volume) as a percentage.
const detailOf = (hass, s) => {
  if (!s) return null;
  const d = domainOf(s.entity_id);
  const temp = s.attributes.current_temperature;
  if (d === "climate" && temp != null) {
    const unit = hass.config?.unit_system?.temperature ?? "°C";
    return `${Number(temp).toLocaleString(lang(hass), { maximumFractionDigits: 1 })} ${unit}`;
  }
  if (d === "media_player" && isActive(s) && s.attributes.media_title) {
    return [s.attributes.media_artist, s.attributes.media_title].filter(Boolean).join(" – ");
  }
  const level = levelOf(s);
  return level != null && d !== "fan" ? `${level}%` : null;
};

// Lights tint the UI with their own colour, climate with its mode colour from
// the theme palette; everything else uses the accent.
function applyTint(el, s) {
  const d = s && domainOf(s.entity_id);
  const c = d === "light" && s.state === "on" ? s.attributes.rgb_color : null;
  if (Array.isArray(c)) {
    const [r, g, b] = c;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    el.style.setProperty("--tint", `rgb(${r}, ${g}, ${b})`);
    el.style.setProperty("--on-tint", lum > 0.55 ? "#111318" : "#ffffff");
  } else if (d === "climate" && isActive(s)) {
    el.style.setProperty("--tint", `var(--state-climate-${s.state}-color, var(--accent))`);
    el.style.removeProperty("--on-tint");
  } else {
    el.style.removeProperty("--tint");
    el.style.removeProperty("--on-tint");
  }
}

/* -------------------------------------------------------------- icons -- */

// Atelier line icons (kirion icon set, Phosphor light) for an entity; null
// falls back to the Home Assistant default icon.
const BATTERY = (level) =>
  level >= 70 ? "battery-high" : level >= 35 ? "battery-medium" : level >= 10 ? "battery-low" : "battery-empty";

const WEATHER_ICONS = {
  sunny: "sun", "clear-night": "moon", partlycloudy: "cloud-sun", cloudy: "cloud",
  rainy: "cloud-rain", pouring: "cloud-rain", snowy: "cloud-snow", "snowy-rainy": "cloud-snow",
  hail: "cloud-snow", lightning: "cloud-lightning", "lightning-rainy": "cloud-lightning",
  fog: "cloud-fog", windy: "wind", "windy-variant": "wind", exceptional: "warning",
};

const SENSOR_ICONS = {
  temperature: "thermometer", humidity: "drop", moisture: "drop", power: "lightning",
  energy: "lightning", current: "lightning", voltage: "lightning", illuminance: "sun-dim",
  pressure: "gauge", atmospheric_pressure: "gauge", carbon_dioxide: "wind", pm25: "wind",
  pm10: "wind", aqi: "wind", volatile_organic_compounds: "wind", timestamp: "clock",
  duration: "timer", signal_strength: "wifi-high", wind_speed: "wind", precipitation: "cloud-rain",
};

const BINARY_ICONS = {
  motion: ["person-simple-walk", "person"], occupancy: ["person-simple-walk", "person"],
  presence: ["house", "house"], door: ["door-open", "door"], garage_door: ["garage", "garage"],
  opening: ["door-open", "door"], window: ["square-split-vertical", "square-split-vertical"],
  smoke: ["warning", "shield-check"], gas: ["warning", "shield-check"], problem: ["warning", "shield-check"],
  safety: ["warning", "shield-check"], moisture: ["drop", "drop-half"], lock: ["lock-open", "lock"],
  plug: ["plugs-connected", "plug"], power: ["lightning", "power"], light: ["sun", "moon"],
  battery: ["battery-low", "battery-high"], connectivity: ["wifi-high", "wifi-high"],
};

function atelierIcon(s) {
  if (!s) return null;
  const d = domainOf(s.entity_id);
  const dc = s.attributes.device_class;
  const on = isActive(s);
  switch (d) {
    case "light": return on ? "lightbulb-filament" : "lightbulb";
    case "switch":
    case "input_boolean":
      if (dc === "outlet") return on ? "plugs-connected" : "plug";
      return on ? "toggle-right" : "toggle-left";
    case "fan": return "fan";
    case "climate":
      return { heat: "fire", cool: "snowflake", dry: "drop-half", fan_only: "fan", auto: "arrows-clockwise",
        heat_cool: "arrows-clockwise", off: "thermometer-simple" }[s.state] ?? "thermometer";
    case "water_heater": return on ? "fire" : "drop";
    case "humidifier": return "drop";
    case "media_player":
      if (dc === "tv") return "television";
      return s.state === "off" ? "speaker-simple-x" : on ? "speaker-hifi" : "speaker-high";
    case "cover":
      if (dc === "garage" || dc === "gate") return "garage";
      if (dc === "door") return on ? "door-open" : "door";
      if (dc === "window") return "square-split-vertical";
      if (dc === "curtain") return "columns";
      return "rows";
    case "lock": return s.state === "locked" ? "lock" : "lock-open";
    case "person":
    case "device_tracker": return s.state === "home" ? "house" : "user";
    case "alarm_control_panel":
      if (s.state === "triggered") return "shield-warning";
      return s.state.startsWith("armed") ? "shield-check" : "shield";
    case "siren": return "siren";
    case "sensor":
      if (dc === "battery" && !isNaN(Number(s.state))) return BATTERY(Number(s.state));
      return SENSOR_ICONS[dc] ?? null;
    case "binary_sensor": {
      const pair = BINARY_ICONS[dc];
      return pair ? pair[s.state === "on" ? 0 : 1] : null;
    }
    case "weather": return WEATHER_ICONS[s.state] ?? "cloud";
    case "vacuum": return "broom";
    case "scene": return "sparkle";
    case "script": return "play";
    case "automation": return "robot";
    case "button":
    case "input_button": return "hand-tap";
    case "camera": return "video-camera";
    case "valve": return "drop";
    case "sun": return s.state === "above_horizon" ? "sun" : "moon";
    case "timer": return "timer";
    case "calendar": return "calendar";
    case "update": return "arrows-clockwise";
    default: return null;
  }
}

function runAction(el, hass, action, entityId) {
  if (!action || action.action === "none" || !hass) return;
  if (action.confirmation) {
    const text = action.confirmation.text || t(hass).confirm;
    if (!window.confirm(text)) return;
  }
  const s = entityId ? hass.states[entityId] : undefined;
  switch (action.action) {
    case "toggle":
      if (s) toggle(hass, s);
      break;
    case "more-info":
      fire(el, "hass-more-info", { entityId: action.entity || entityId });
      break;
    case "navigate":
      if (!action.navigation_path) break;
      history.pushState(null, "", action.navigation_path);
      fire(window, "location-changed", { replace: false });
      break;
    case "url":
      if (action.url_path) window.open(action.url_path, "_blank", "noopener");
      break;
    case "perform-action":
    case "call-service": {
      const [domain, service] = (action.perform_action || action.service || "").split(".");
      if (domain && service)
        hass.callService(domain, service, action.data || action.service_data || {}, action.target);
      break;
    }
  }
  haptic();
}

const defaultTap = (entityId) => ({
  action: TOGGLEABLE.has(domainOf(entityId)) ? "toggle" : "more-info",
});

// Tap via click, hold via a 500 ms press. A hold swallows the following click.
function bindPress(el, { tap, hold }) {
  let timer = null;
  let held = false;
  let origin = null;
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    held = false;
    origin = [e.clientX, e.clientY];
    cancel();
    timer = setTimeout(() => {
      held = true;
      timer = null;
      haptic("medium");
      hold?.();
    }, 500);
  });
  el.addEventListener("pointermove", (e) => {
    if (timer && origin && Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) > 8) cancel();
  });
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("pointerleave", cancel);
  el.addEventListener("contextmenu", (e) => hold && e.preventDefault());
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    if (held) {
      held = false;
      return;
    }
    tap?.();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap?.();
    }
  });
}

const iconMarkup = (entity, icon) =>
  entity
    ? `<ha-state-icon data-entity="${esc(entity)}"${icon ? ` icon="${esc(icon)}" data-fixed` : ""}></ha-state-icon>`
    : `<ha-icon icon="${esc(icon || "mdi:circle-small")}"></ha-icon>`;

// ha-state-icon needs live objects, so wire them after every hass update.
// Without a configured icon the Atelier line icon follows the state.
function syncIcons(root, hass) {
  for (const el of root.querySelectorAll("ha-state-icon[data-entity]")) {
    const s = hass.states[el.dataset.entity];
    el.hass = hass;
    el.stateObj = s;
    if (!("fixed" in el.dataset)) {
      const name = atelierIcon(s);
      el.icon = name ? `kirion:${name}` : undefined;
    }
  }
}

/* ---------------------------------------------------------------- base -- */

const BASE_CSS = `
  :host {
    display: block;
    height: 100%;
    --accent: var(--atelier-accent, var(--primary-color));
    --accent-rgb: var(--atelier-accent-rgb, var(--rgb-primary-color, 3, 169, 244));
    --on-accent: var(--atelier-on-accent, var(--text-primary-color, #fff));
    --fill: var(--atelier-fill, rgba(127, 127, 127, 0.12));
    --stroke: var(--atelier-stroke, var(--divider-color));
    --radius: var(--atelier-radius, var(--ha-card-border-radius, 16px));
    --radius-sm: var(--atelier-radius-sm, 12px);
    --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  ha-card {
    height: 100%;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    font-family: inherit;
    -webkit-font-smoothing: antialiased;
  }
  .press {
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    transition: transform 0.25s var(--ease);
  }
  .press:active { transform: scale(0.97); }
  .press:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
  .ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .num { font-variant-numeric: tabular-nums; }
  .warning { padding: 16px; color: var(--error-color, #db4437); font-size: 14px; }
`;

class AtelierCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = this.normalize(config);
    this._built = false;
    this._render();
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this._built || this.changed(prev, hass)) this._render();
  }

  get hass() {
    return this._hass;
  }

  normalize(config) {
    return { ...config };
  }

  // Entity ids whose state changes should trigger an update.
  watched() {
    return [];
  }

  changed(prev, next) {
    if (!prev || lang(prev) !== lang(next)) return true;
    return this.watched().some((id) => prev.states[id] !== next.states[id]);
  }

  _render() {
    if (!this._config) return;
    if (!this._built) {
      this.shadowRoot.innerHTML = `<style>${BASE_CSS}${this.constructor.styles}</style>${this.template()}`;
      this._built = true;
      this.bind();
    }
    if (this._hass) {
      this.update();
      syncIcons(this.shadowRoot, this._hass);
    }
  }

  template() {
    return "";
  }

  bind() {}

  update() {}

  $(sel) {
    return this.shadowRoot.querySelector(sel);
  }

  getCardSize() {
    return 2;
  }
}

/* ---------------------------------------------------------------- hero -- */

class AtelierHeroCard extends AtelierCard {
  static styles = `
    ha-card { padding: 22px 24px 20px; }
    .row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px 24px; flex-wrap: wrap; }
    .eyebrow {
      font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--secondary-text-color); margin-bottom: 6px;
    }
    h1 {
      margin: 0; font-size: clamp(24px, 4vw, 32px); font-weight: 600; line-height: 1.1;
      letter-spacing: -0.025em; color: var(--primary-text-color);
    }
    .aside { display: flex; align-items: flex-end; gap: 20px; }
    .clock {
      font-size: clamp(36px, 6vw, 52px); font-weight: 250; line-height: 0.9;
      letter-spacing: -0.04em; color: var(--primary-text-color);
    }
    .weather {
      display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
      color: var(--secondary-text-color); font-size: 13px; cursor: pointer;
    }
    .weather .now { display: flex; align-items: center; gap: 6px; color: var(--primary-text-color); font-size: 20px; font-weight: 500; }
    .weather ha-state-icon { --mdc-icon-size: 22px; color: var(--accent); }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
    .chips:empty { display: none; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px 0 9px;
      border-radius: 999px; background: var(--fill); font-size: 13px; color: var(--primary-text-color);
      --mdc-icon-size: 18px;
    }
    .chip ha-state-icon { color: var(--state-icon-color); }
    .chip.on ha-state-icon { color: var(--accent); }
  `;

  static getConfigElement() {
    return document.createElement("kirion-atelier-hero-card-editor");
  }

  static getStubConfig(hass) {
    const weather = Object.keys(hass?.states ?? {}).find((id) => id.startsWith("weather."));
    return weather ? { weather } : {};
  }

  normalize(c) {
    return { show_clock: true, ...c, entities: (c.entities ?? []).map((e) => (typeof e === "string" ? e : e.entity)) };
  }

  watched() {
    return [this._config.weather, ...this._config.entities].filter(Boolean);
  }

  changed(prev, next) {
    return super.changed(prev, next) || prev.user?.name !== next.user?.name;
  }

  template() {
    const c = this._config;
    return `
      <ha-card>
        <div class="row">
          <div>
            <div class="eyebrow" id="date"></div>
            <h1 id="greeting"></h1>
          </div>
          <div class="aside">
            ${c.weather ? `
              <div class="weather press" id="weather" tabindex="0">
                <div class="now">${iconMarkup(c.weather)}<span id="temp" class="num"></span></div>
                <span id="cond"></span>
              </div>` : ""}
            ${c.show_clock ? `<div class="clock num" id="clock"></div>` : ""}
          </div>
        </div>
        <div class="chips">
          ${c.entities.map((id) => `<div class="chip press" tabindex="0" data-id="${esc(id)}">${iconMarkup(id)}<span class="ellipsis"></span></div>`).join("")}
        </div>
      </ha-card>`;
  }

  bind() {
    const w = this.$("#weather");
    if (w) bindPress(w, { tap: () => runAction(this, this._hass, { action: "more-info" }, this._config.weather) });
    for (const chip of this.shadowRoot.querySelectorAll(".chip")) {
      bindPress(chip, { tap: () => runAction(this, this._hass, { action: "more-info" }, chip.dataset.id) });
    }
  }

  connectedCallback() {
    this._tick = setInterval(() => this._time(), 15000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
  }

  _time() {
    if (!this._hass || !this._built) return;
    const hass = this._hass;
    const now = new Date();
    const h = now.getHours();
    const tr = t(hass);
    const part = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : h >= 18 && h < 23 ? "evening" : "night";
    const who = this._config.name ?? hass.user?.name?.split(" ")[0];
    this.$("#greeting").textContent = who ? `${tr[part]}, ${who}` : tr[part];
    this.$("#date").textContent = new Intl.DateTimeFormat(lang(hass), {
      weekday: "long", day: "numeric", month: "long",
    }).format(now);
    const clock = this.$("#clock");
    if (clock) {
      const tf = hass.locale?.time_format;
      clock.textContent = new Intl.DateTimeFormat(lang(hass), {
        hour: "2-digit", minute: "2-digit",
        hour12: tf === "12" ? true : tf === "24" ? false : undefined,
      }).format(now);
    }
  }

  update() {
    const hass = this._hass;
    this._time();
    const w = this._config.weather && hass.states[this._config.weather];
    if (this.$("#weather")) {
      const temp = w?.attributes?.temperature;
      this.$("#temp").textContent = temp != null ? `${Math.round(temp)}°` : "—";
      this.$("#cond").textContent = w ? stateText(hass, w) : t(hass).not_found;
    }
    for (const chip of this.shadowRoot.querySelectorAll(".chip")) {
      const s = hass.states[chip.dataset.id];
      chip.classList.toggle("on", isActive(s));
      chip.querySelector("span").textContent = stateText(hass, s);
    }
  }

  getCardSize() {
    return this._config?.entities?.length ? 3 : 2;
  }

  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }
}

/* ---------------------------------------------------------------- tile -- */

class AtelierTileCard extends AtelierCard {
  static styles = `
    ha-card { min-height: 112px; }
    .tile {
      display: flex; flex-direction: column; justify-content: space-between;
      height: 100%; box-sizing: border-box; padding: 14px 16px 15px; gap: 12px; position: relative; z-index: 1;
    }
    .glow {
      position: absolute; inset: 0; pointer-events: none; opacity: 0;
      background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--tint, var(--accent)) 20%, transparent), transparent 62%);
      transition: opacity 0.5s var(--ease);
    }
    .on .glow { opacity: 1; }
    .bubble {
      width: 40px; height: 40px; border-radius: var(--radius-sm); display: grid; place-items: center;
      background: var(--fill); color: var(--state-icon-color); --mdc-icon-size: 22px;
      transition: background 0.4s var(--ease), color 0.4s var(--ease), box-shadow 0.4s var(--ease);
    }
    .on .bubble {
      background: var(--tint, var(--accent)); color: var(--on-tint, var(--on-accent));
      box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--tint, var(--accent)) 75%, transparent);
    }
    .unavailable { opacity: 0.45; }
    .name { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: var(--primary-text-color); }
    .state { font-size: 12.5px; color: var(--secondary-text-color); margin-top: 2px; }
    .bar { position: absolute; left: 16px; right: 16px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0; overflow: hidden; }
    .bar i {
      display: block; height: 100%; width: 0; background: var(--tint, var(--accent));
      transition: width 0.6s var(--ease);
    }
  `;

  static getConfigElement() {
    return document.createElement("kirion-atelier-tile-card-editor");
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states ?? {});
    return { entity: ids.find((id) => id.startsWith("light.")) ?? ids[0] ?? "" };
  }

  normalize(c) {
    if (!c.entity) throw new Error("entity is required");
    return { ...c };
  }

  watched() {
    return [this._config.entity];
  }

  template() {
    const c = this._config;
    return `
      <ha-card>
        <div class="glow"></div>
        <div class="tile press" tabindex="0" role="button">
          <div class="bubble">${iconMarkup(c.entity, c.icon)}</div>
          <div>
            <div class="name ellipsis" id="name"></div>
            <div class="state ellipsis num" id="state"></div>
          </div>
        </div>
        <div class="bar"><i></i></div>
      </ha-card>`;
  }

  bind() {
    const c = this._config;
    bindPress(this.$(".tile"), {
      tap: () => runAction(this, this._hass, c.tap_action ?? defaultTap(c.entity), c.entity),
      hold: () => runAction(this, this._hass, c.hold_action ?? { action: "more-info" }, c.entity),
    });
  }

  update() {
    const hass = this._hass;
    const s = hass.states[this._config.entity];
    const card = this.$("ha-card");
    const level = levelOf(s);
    card.classList.toggle("on", isActive(s));
    card.classList.toggle("unavailable", !s || s.state === "unavailable");
    applyTint(card, s);
    this.$("#name").textContent = nameOf(hass, s, this._config.name);
    const detail = detailOf(hass, s);
    this.$("#state").textContent = detail ? `${stateText(hass, s)} · ${detail}` : stateText(hass, s);
    this.$(".bar i").style.width = `${level ?? 0}%`;
    this.$(".tile").setAttribute("aria-label", `${this.$("#name").textContent}: ${this.$("#state").textContent}`);
  }

  getGridOptions() {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 };
  }
}

/* ---------------------------------------------------------------- room -- */

class AtelierRoomCard extends AtelierCard {
  static styles = `
    ha-card { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
    .glow {
      position: absolute; inset: 0; pointer-events: none; opacity: 0;
      background: radial-gradient(90% 120% at 100% 0%, rgba(var(--accent-rgb), 0.16), transparent 60%);
      transition: opacity 0.6s var(--ease);
    }
    .lit .glow { opacity: 1; }
    .head { display: flex; align-items: center; gap: 12px; position: relative; }
    .bubble {
      flex: none; width: 44px; height: 44px; border-radius: var(--radius-sm); display: grid; place-items: center;
      background: var(--fill); color: var(--state-icon-color); --mdc-icon-size: 24px;
      transition: background 0.4s var(--ease), color 0.4s var(--ease);
    }
    .lit .bubble { background: var(--accent); color: var(--on-accent); box-shadow: 0 10px 24px -10px rgba(var(--accent-rgb), 0.7); }
    .titles { min-width: 0; flex: 1; }
    .name { font-size: 16px; font-weight: 600; letter-spacing: -0.015em; color: var(--primary-text-color); }
    .sub { font-size: 12.5px; color: var(--secondary-text-color); margin-top: 2px; }
    .climate { text-align: right; flex: none; }
    .climate .temp { font-size: 22px; font-weight: 300; letter-spacing: -0.03em; color: var(--primary-text-color); line-height: 1; }
    .climate .hum { font-size: 12px; color: var(--secondary-text-color); margin-top: 4px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; position: relative; }
    .actions:empty { display: none; }
    .btn {
      width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
      background: var(--fill); color: var(--state-icon-color); --mdc-icon-size: 22px;
      border: 1px solid transparent;
      transition: background 0.35s var(--ease), color 0.35s var(--ease), box-shadow 0.35s var(--ease);
    }
    .btn.on {
      background: var(--tint, var(--accent)); color: var(--on-tint, var(--on-accent));
      box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--tint, var(--accent)) 70%, transparent);
    }
    .btn.unavailable { opacity: 0.4; }
  `;

  static getConfigElement() {
    return document.createElement("kirion-atelier-room-card-editor");
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states ?? {});
    return {
      name: "Salon",
      icon: "kirion:couch",
      entities: ids.filter((id) => id.startsWith("light.")).slice(0, 3),
    };
  }

  normalize(c) {
    return {
      icon: "kirion:house",
      ...c,
      entities: (c.entities ?? []).map((e) => (typeof e === "string" ? { entity: e } : e)),
    };
  }

  watched() {
    const c = this._config;
    return [c.temperature, c.humidity, ...c.entities.map((e) => e.entity)].filter(Boolean);
  }

  template() {
    const c = this._config;
    return `
      <ha-card>
        <div class="glow"></div>
        <div class="head press" tabindex="0" role="button">
          <div class="bubble"><ha-icon icon="${esc(c.icon)}"></ha-icon></div>
          <div class="titles">
            <div class="name ellipsis">${esc(c.name ?? "")}</div>
            <div class="sub ellipsis" id="sub"></div>
          </div>
          ${c.temperature || c.humidity ? `
            <div class="climate num">
              <div class="temp" id="temp"></div>
              <div class="hum" id="hum"></div>
            </div>` : ""}
        </div>
        <div class="actions">
          ${c.entities.map((e, i) => `
            <div class="btn press" tabindex="0" role="button" data-i="${i}">${iconMarkup(e.entity, e.icon)}</div>`).join("")}
        </div>
      </ha-card>`;
  }

  bind() {
    const c = this._config;
    bindPress(this.$(".head"), {
      tap: () => {
        if (c.navigation_path) runAction(this, this._hass, { action: "navigate", navigation_path: c.navigation_path });
        else if (c.temperature) runAction(this, this._hass, { action: "more-info" }, c.temperature);
      },
    });
    for (const btn of this.shadowRoot.querySelectorAll(".btn")) {
      const e = c.entities[Number(btn.dataset.i)];
      bindPress(btn, {
        tap: () => runAction(this, this._hass, e.tap_action ?? defaultTap(e.entity), e.entity),
        hold: () => runAction(this, this._hass, e.hold_action ?? { action: "more-info" }, e.entity),
      });
    }
  }

  update() {
    const hass = this._hass;
    const c = this._config;
    let active = 0;
    for (const btn of this.shadowRoot.querySelectorAll(".btn")) {
      const e = c.entities[Number(btn.dataset.i)];
      const s = hass.states[e.entity];
      const on = isActive(s);
      if (on) active++;
      btn.classList.toggle("on", on);
      btn.classList.toggle("unavailable", !s || s.state === "unavailable");
      applyTint(btn, s);
      btn.title = `${nameOf(hass, s, e.name)} · ${stateText(hass, s)}`;
    }
    this.$("ha-card").classList.toggle("lit", active > 0);
    this.$("#sub").textContent = t(hass).active(active);

    const reading = (id) => {
      const s = id && hass.states[id];
      if (!s || isNaN(Number(s.state))) return "";
      return Number(s.state).toLocaleString(lang(hass), { maximumFractionDigits: 1 });
    };
    if (this.$("#temp")) {
      const temp = reading(c.temperature);
      const hum = reading(c.humidity);
      this.$("#temp").textContent = temp ? `${temp}°` : "";
      this.$("#hum").textContent = hum ? `${hum}%` : "";
    }
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }
}

/* --------------------------------------------------------------- chips -- */

class AtelierChipsCard extends AtelierCard {
  static styles = `
    ha-card {
      background: none; border: none; box-shadow: none;
      backdrop-filter: none; -webkit-backdrop-filter: none; overflow: visible;
    }
    ha-card::after { display: none; }
    .row {
      display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none;
      padding: 2px; justify-content: var(--chips-align, flex-start);
    }
    .row::-webkit-scrollbar { display: none; }
    .chip {
      flex: none; display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px 0 10px;
      border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--primary-text-color);
      background: var(--ha-card-background, var(--card-background-color));
      box-shadow: var(--atelier-edge, inset 0 0 0 transparent), 0 10px 24px -16px rgba(0, 0, 0, 0.45);
      backdrop-filter: var(--atelier-backdrop, none); -webkit-backdrop-filter: var(--atelier-backdrop, none);
      --mdc-icon-size: 18px;
    }
    .chip ha-state-icon, .chip ha-icon { color: var(--state-icon-color); transition: color 0.3s var(--ease); }
    .chip.on ha-state-icon { color: var(--tint, var(--accent)); }
    .chip.icon-only { padding: 0; width: 36px; justify-content: center; }
  `;

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states ?? {});
    return { chips: ids.filter((id) => id.startsWith("person.")).slice(0, 2) };
  }

  normalize(c) {
    const chips = c.chips ?? c.entities ?? [];
    if (!Array.isArray(chips)) throw new Error("chips must be a list");
    return {
      ...c,
      chips: chips.map((x) => (typeof x === "string" ? { entity: x } : x)),
    };
  }

  watched() {
    return this._config.chips.map((x) => x.entity).filter(Boolean);
  }

  template() {
    const align = { center: "center", end: "flex-end" }[this._config.alignment] ?? "flex-start";
    return `
      <ha-card style="--chips-align:${align}">
        <div class="row">
          ${this._config.chips.map((x, i) => `
            <div class="chip press ${!x.entity && !x.name ? "icon-only" : ""}" tabindex="0" role="button" data-i="${i}">
              ${iconMarkup(x.entity, x.icon)}${x.entity || x.name ? `<span class="ellipsis"></span>` : ""}
            </div>`).join("")}
        </div>
      </ha-card>`;
  }

  bind() {
    for (const el of this.shadowRoot.querySelectorAll(".chip")) {
      const x = this._config.chips[Number(el.dataset.i)];
      bindPress(el, {
        tap: () => runAction(this, this._hass, x.tap_action ?? { action: "more-info" }, x.entity),
        hold: x.hold_action ? () => runAction(this, this._hass, x.hold_action, x.entity) : undefined,
      });
    }
  }

  update() {
    const hass = this._hass;
    for (const el of this.shadowRoot.querySelectorAll(".chip")) {
      const x = this._config.chips[Number(el.dataset.i)];
      const label = el.querySelector("span");
      const s = x.entity ? hass.states[x.entity] : null;
      el.classList.toggle("on", isActive(s));
      applyTint(el, s);
      if (!label) continue;
      const content = x.content ?? "state";
      const name = nameOf(hass, s, x.name);
      label.textContent = !s ? name
        : content === "name" ? name
        : content === "both" ? `${name} · ${stateText(hass, s)}`
        : stateText(hass, s);
    }
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: 12, rows: "auto" };
  }
}

/* ------------------------------------------------------------- editors -- */

// Thin wrapper around HA's own <ha-form>, so editors match the native UI.
class AtelierEditor extends HTMLElement {
  static schema = [];

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this._form) {
      this.attachShadow({ mode: "open" });
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => t(this._hass).labels[s.name] ?? s.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        fire(this, "config-changed", { config: ev.detail.value });
      });
      this.shadowRoot.append(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this.constructor.schema;
    this._form.data = this._config;
  }
}

const ACTIONS = [
  { name: "tap_action", selector: { ui_action: {} } },
  { name: "hold_action", selector: { ui_action: {} } },
];

class TileEditor extends AtelierEditor {
  static schema = [
    { name: "entity", required: true, selector: { entity: {} } },
    {
      type: "grid", name: "", schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } },
      ],
    },
    ...ACTIONS,
  ];
}

class RoomEditor extends AtelierEditor {
  static schema = [
    {
      type: "grid", name: "", schema: [
        { name: "name", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
        { name: "humidity", selector: { entity: { domain: "sensor", device_class: "humidity" } } },
      ],
    },
    { name: "entities", selector: { entity: { multiple: true } } },
    { name: "navigation_path", selector: { text: {} } },
  ];

  setConfig(config) {
    // The form edits plain entity ids; keep per-entity overrides out of its way.
    super.setConfig({
      ...config,
      entities: (config.entities ?? []).map((e) => (typeof e === "string" ? e : e.entity)),
    });
  }
}

class HeroEditor extends AtelierEditor {
  static schema = [
    {
      type: "grid", name: "", schema: [
        { name: "name", selector: { text: {} } },
        { name: "show_clock", selector: { boolean: {} } },
      ],
    },
    { name: "weather", selector: { entity: { domain: "weather" } } },
    { name: "entities", selector: { entity: { multiple: true } } },
  ];
}

/* ------------------------------------------------------------ register -- */

const CARDS = [
  ["kirion-atelier-hero-card", AtelierHeroCard, "Hero", "Powitanie, zegar, pogoda i szybkie statusy."],
  ["kirion-atelier-tile-card", AtelierTileCard, "Tile", "Minimalny kafel encji z poświatą i poziomem."],
  ["kirion-atelier-room-card", AtelierRoomCard, "Room", "Pokój: klimat, licznik aktywnych i przyciski."],
  ["kirion-atelier-chips-card", AtelierChipsCard, "Chips", "Rząd szklanych pigułek ze statusami."],
];

const EDITORS = [
  ["kirion-atelier-hero-card-editor", HeroEditor],
  ["kirion-atelier-tile-card-editor", TileEditor],
  ["kirion-atelier-room-card-editor", RoomEditor],
];

for (const [tag, cls] of [...CARDS, ...EDITORS]) {
  // A second copy of this module (e.g. right after an update) must not throw.
  try {
    if (!customElements.get(tag)) customElements.define(tag, cls);
  } catch (err) {
    // already defined
  }
}

window.customCards = window.customCards || [];
for (const [type, , name, description] of CARDS) {
  if (!window.customCards.some((c) => c.type === type)) {
    window.customCards.push({ type, name: `KIRION Atelier · ${name}`, description, preview: true });
  }
}

console.info(
  `%c KIRION ATELIER %c Cards ${VERSION} `,
  "background:#0A0C10;color:#8AB4FF;font-weight:600;border-radius:4px 0 0 4px;padding:2px 4px",
  "background:#8AB4FF;color:#0A0C10;border-radius:0 4px 4px 0;padding:2px 4px"
);
