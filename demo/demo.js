// Preview harness: fakes just enough of Home Assistant (hass object, ha-card,
// ha-icon, ha-state-icon) to render KIRION Atelier outside a real instance.
import * as mdi from "https://cdn.jsdelivr.net/npm/@mdi/js@7.4.47/+esm";
import { THEMES } from "./themes.generated.js";

/* --------------------------------------------------------------- icons -- */

const mdiPath = (name = "") =>
  mdi["mdi" + name.replace(/^mdi:/, "").replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())];

const DOMAIN_ICON = {
  light: (s) => (s.state === "on" ? "lightbulb" : "lightbulb-outline"),
  switch: (s) => (s.state === "on" ? "toggle-switch-variant" : "toggle-switch-variant-off"),
  fan: (s) => (s.state === "on" ? "fan" : "fan-off"),
  cover: (s) => (s.state === "open" ? "window-shutter-open" : "window-shutter"),
  lock: (s) => (s.state === "locked" ? "lock" : "lock-open-variant"),
  climate: () => "thermostat",
  media_player: (s) => (s.state === "playing" ? "speaker-play" : "speaker"),
  person: (s) => (s.state === "home" ? "account" : "account-arrow-right"),
  binary_sensor: (s) => (s.state === "on" ? "shield-alert-outline" : "shield-check-outline"),
  weather: (s) => ({ sunny: "weather-sunny", partlycloudy: "weather-partly-cloudy", rainy: "weather-rainy", cloudy: "weather-cloudy" })[s.state] ?? "weather-cloudy",
  sensor: (s) => ({ temperature: "thermometer", humidity: "water-percent", power: "flash" })[s.attributes.device_class] ?? "eye",
};

class FakeIcon extends HTMLElement {
  static observedAttributes = ["icon"];
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  attributeChangedCallback() { this._draw(); }
  connectedCallback() { this._draw(); }
  set icon(v) { this._icon = v; this._draw(); }
  get icon() { return this._icon ?? this.getAttribute("icon"); }
  resolve() { return this.icon; }
  async _draw() {
    const name = this.resolve() ?? "";
    // kirion:* comes from the integration's icon set, like in Home Assistant.
    const custom = name.startsWith("kirion:") ? await window.customIcons?.kirion?.getIcon(name.slice(7)) : null;
    const d = custom?.path ?? mdiPath(name) ?? mdi.mdiCircleSmall;
    const box = custom?.viewBox ?? "0 0 24 24";
    this.shadowRoot.innerHTML = `<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="${box}"><path d="${d}"/></svg>`;
  }
}
class FakeStateIcon extends FakeIcon {
  set stateObj(s) { this._s = s; this._draw(); }
  set hass(h) {}
  resolve() {
    if (this.icon) return this.icon;
    const s = this._s;
    if (!s) return "alert-circle-outline";
    return DOMAIN_ICON[s.entity_id.split(".")[0]]?.(s) ?? "circle-outline";
  }
}
customElements.define("ha-icon", FakeIcon);
customElements.define("ha-state-icon", FakeStateIcon);

// Mirrors the frontend's own ha-card styles closely enough for a faithful preview.
const cardSheet = new CSSStyleSheet();
cardSheet.replaceSync(`:host {
  display: block; position: relative; box-sizing: border-box; color: var(--primary-text-color);
  background: var(--ha-card-background, var(--card-background-color, #fff));
  box-shadow: var(--ha-card-box-shadow, none);
  border-radius: var(--ha-card-border-radius, 12px);
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
  transition: all .3s ease-out;
}`);
customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML = "<slot></slot>";
    this.shadowRoot.adoptedStyleSheets = [cardSheet];
  }
  connectedCallback() {}
});

await import("../custom_components/kirion_atelier/frontend/kirion-atelier-icons.js");
await import("../custom_components/kirion_atelier/frontend/kirion-atelier-glass.js");
await import("../custom_components/kirion_atelier/frontend/kirion-atelier-cards.js");

/* ---------------------------------------------------------------- hass -- */

const S = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: new Date().toISOString() });

let states = Object.fromEntries([
  S("light.salon", "on", { friendly_name: "Salon", brightness: 190, rgb_color: [255, 176, 104] }),
  S("light.kuchnia", "off", { friendly_name: "Kuchnia" }),
  S("light.sypialnia", "on", { friendly_name: "Sypialnia", brightness: 80, rgb_color: [150, 170, 255] }),
  S("light.biurko", "off", { friendly_name: "Biurko" }),
  S("switch.ekspres", "off", { friendly_name: "Ekspres" }),
  S("fan.oczyszczacz", "on", { friendly_name: "Oczyszczacz", percentage: 40 }),
  S("cover.rolety_salon", "open", { friendly_name: "Rolety", current_position: 70 }),
  S("lock.drzwi", "locked", { friendly_name: "Drzwi wejściowe" }),
  S("climate.sypialnia", "heat", { friendly_name: "Ogrzewanie", current_temperature: 20.4, temperature: 21 }),
  S("media_player.sonos", "playing", { friendly_name: "Sonos", volume_level: 0.32 }),
  S("sensor.salon_temperatura", "21.6", { unit_of_measurement: "°C", device_class: "temperature" }),
  S("sensor.salon_wilgotnosc", "46", { unit_of_measurement: "%", device_class: "humidity" }),
  S("sensor.sypialnia_temperatura", "20.1", { unit_of_measurement: "°C", device_class: "temperature" }),
  S("sensor.sypialnia_wilgotnosc", "51", { unit_of_measurement: "%", device_class: "humidity" }),
  S("sensor.moc", "1.24", { friendly_name: "Pobór mocy", unit_of_measurement: "kW", device_class: "power" }),
  S("person.olek", "home", { friendly_name: "Olek" }),
  S("binary_sensor.alarm", "off", { friendly_name: "Alarm" }),
  S("weather.dom", "partlycloudy", { friendly_name: "Dom", temperature: 14.2, temperature_unit: "°C" }),
].map((s) => [s.entity_id, s]));

const LABELS = {
  on: "Włączone", off: "Wyłączone", open: "Otwarte", closed: "Zamknięte", locked: "Zablokowane",
  unlocked: "Odblokowane", playing: "Odtwarzanie", paused: "Wstrzymane", home: "W domu",
  not_home: "Poza domem", heat: "Grzanie", partlycloudy: "Częściowe zachmurzenie",
};
const formatEntityState = (s) => {
  const d = s.entity_id.split(".")[0];
  if (d === "binary_sensor") return s.state === "on" ? "Uzbrojony" : "Rozbrojony";
  if (d === "sensor") {
    const n = Number(s.state).toLocaleString("pl", { maximumFractionDigits: 2 });
    return `${n} ${s.attributes.unit_of_measurement ?? ""}`.trim();
  }
  return LABELS[s.state] ?? s.state;
};

const FLIP = { on: "off", off: "on", open: "closed", closed: "open", heat: "off", playing: "paused", paused: "playing" };

function callService(domain, service, data) {
  const id = data.entity_id;
  const s = states[id];
  if (!s) return;
  let next = s.state;
  if (service === "lock") next = "locked";
  else if (service === "unlock") next = "unlocked";
  else if (["toggle", "media_play_pause"].includes(service)) next = FLIP[s.state] ?? s.state;
  if (id.startsWith("climate.") && s.state === "off") next = "heat";
  states = { ...states, [id]: { ...s, state: next } };
  push();
  return Promise.resolve();
}

let hass;
const cards = [];
function push() {
  hass = {
    states,
    user: { name: "Olek Kirion" },
    language: "pl",
    locale: { language: "pl", time_format: "24" },
    formatEntityState,
    callService,
  };
  for (const c of cards) c.hass = hass;
}

/* ----------------------------------------------------------- dashboard -- */

const LAYOUT = [
  { cards: [
    { type: "kirion-atelier-title-card", title: "Dom", subtitle: "Jaśminów · wszystko pod kontrolą" },
    { type: "kirion-atelier-chips-card", chips: [
      { entity: "person.olek", content: "name" },
      "binary_sensor.alarm",
      "sensor.moc",
      "lock.drzwi",
      { icon: "kirion:gear", tap_action: { action: "navigate", navigation_path: "#config" } },
    ] },
    { type: "kirion-atelier-hero-card", weather: "weather.dom", entities: ["sensor.salon_temperatura", "media_player.sonos"] },
  ] },
  { sections: [
    { title: "Salon", cards: [
      { type: "kirion-atelier-room-card", name: "Salon", icon: "kirion:couch",
        temperature: "sensor.salon_temperatura", humidity: "sensor.salon_wilgotnosc",
        entities: ["light.salon", "light.kuchnia", "cover.rolety_salon", "media_player.sonos"] },
      { type: "kirion-atelier-tile-card", entity: "light.salon" },
      { type: "kirion-atelier-tile-card", entity: "light.kuchnia" },
      { type: "kirion-atelier-tile-card", entity: "cover.rolety_salon" },
      { type: "kirion-atelier-tile-card", entity: "media_player.sonos" },
    ] },
    { title: "Sypialnia", cards: [
      { type: "kirion-atelier-room-card", name: "Sypialnia", icon: "kirion:bed",
        temperature: "sensor.sypialnia_temperatura", humidity: "sensor.sypialnia_wilgotnosc",
        entities: ["light.sypialnia", "light.biurko", "fan.oczyszczacz", "climate.sypialnia"] },
      { type: "kirion-atelier-tile-card", entity: "light.sypialnia" },
      { type: "kirion-atelier-tile-card", entity: "fan.oczyszczacz" },
      { type: "kirion-atelier-tile-card", entity: "climate.sypialnia" },
      { type: "kirion-atelier-tile-card", entity: "switch.ekspres", icon: "kirion:coffee" },
    ] },
  ] },
];

function slotFor(config) {
  const el = document.createElement(config.type);
  el.setConfig(config);
  cards.push(el);
  const g = el.getGridOptions?.() ?? { columns: 12, rows: "auto" };
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.style.gridColumn = `span ${g.columns === "full" ? 12 : g.columns}`;
  if (typeof g.rows === "number") slot.style.height = `${g.rows * 56 + (g.rows - 1) * 8}px`;
  slot.append(el);
  return slot;
}

const main = document.getElementById("main");
for (const block of LAYOUT) {
  if (block.cards) {
    const sec = document.createElement("div");
    sec.className = "section";
    block.cards.forEach((c) => sec.append(slotFor(c)));
    main.append(sec);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "sections";
    for (const s of block.sections) {
      const sec = document.createElement("div");
      sec.className = "section";
      sec.innerHTML = `<h2>${s.title}</h2>`;
      s.cards.forEach((c) => sec.append(slotFor(c)));
      wrap.append(sec);
    }
    main.append(wrap);
  }
}
push();

/* ------------------------------------------------------------ controls -- */

const params = new URLSearchParams(location.search);
const ui = {
  variant: params.get("variant") ?? Object.keys(THEMES)[0],
  mode: params.get("mode") ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  wall: params.get("wall") ?? "gradient",
};

function applyTheme() {
  const vars = THEMES[ui.variant][ui.mode];
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(vars)) root.setProperty(`--${k}`, v);
  document.body.classList.toggle("photo", ui.wall === "photo");
  document.documentElement.style.colorScheme = ui.mode;
}

function segment(id, key, options) {
  const host = document.getElementById(id);
  const render = () => {
    host.innerHTML = options
      .map(([value, label]) => `<button data-v="${value}" aria-pressed="${ui[key] === value}">${label}</button>`)
      .join("");
  };
  host.addEventListener("click", (e) => {
    const v = e.target.closest("button")?.dataset.v;
    if (!v) return;
    ui[key] = v;
    render();
    applyTheme();
  });
  render();
}

segment("variant", "variant", Object.keys(THEMES).map((n) => [n, n]));
segment("mode", "mode", [["dark", "Ciemny"], ["light", "Jasny"]]);
segment("wall", "wall", [["gradient", "Gradient"], ["photo", "Tapeta"]]);
applyTheme();

const toast = document.getElementById("toast");
let toastTimer;
document.addEventListener("hass-more-info", (e) => {
  toast.textContent = `more-info → ${e.detail.entityId}`;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
});
