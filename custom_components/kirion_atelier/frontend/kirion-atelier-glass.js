/*! KIRION Atelier Glass v0.6.3
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026 KIRION. See NOTICE for the attribution requirements.
 *
 * Adds what theme variables cannot: the glass edge drawn above each card's
 * content, and backdrop blur on elements without a native blur variable.
 * Everything reads `--atelier-*` variables that only the KIRION Atelier theme
 * defines, so with any other theme active the module changes nothing.
 *
 * The KIRION Atelier integration loads it on every page. For a manual install
 * use `frontend: extra_module_url` (whole UI) or a dashboard resource.
 */
(() => {
  const VERSION = "0.6.3";
  if (window.KirionAtelierGlass) return;

  const GLASS = `
    backdrop-filter: var(--atelier-backdrop, none);
    -webkit-backdrop-filter: var(--atelier-backdrop, none);
  `;

  // An ha-input without its Material chrome: no visible label, filled box or
  // underline. The pill around it supplies background and focus ring.
  const BARE_INPUT = (height) => `
      --secondary-text-color: transparent;
      --primary-color: transparent;
      --ha-color-border-neutral-loud: transparent;
      --ha-color-form-background: transparent;
      --ha-color-form-background-hover: transparent;
      height: ${height}px;`;
  const PILL = `
      background: var(--atelier-fill, var(--ha-color-form-background));
      border-radius: 999px; overflow: hidden; transition: box-shadow 0.2s ease;`;
  const RING = "box-shadow: 0 0 0 2px var(--atelier-accent, var(--primary-color));";

  // tag -> CSS adopted into that element's shadow root.
  const PATCHES = {
    // The edge is a layer above the card's content (inset shadows on the card
    // itself are painted below it, so artwork or dials would hide them).
    "ha-card": `
      :host { ${GLASS} }
      :host::after {
        content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none;
        border-radius: inherit; box-shadow: var(--atelier-edge, none);
      }`,
    // Soft glow under the icon of active tiles, in the icon's own colour.
    "ha-tile-icon": `
      :host(:not([data-state="off"]):not([data-state="closed"]):not([data-state="locked"])
        :not([data-state="disarmed"]):not([data-state="idle"]):not([data-state="standby"])
        :not([data-state="not_home"]):not([data-state="unavailable"]):not([data-state="unknown"]))
        .container.background {
        box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--tile-icon-color) var(--atelier-icon-glow, 0%), transparent);
      }`,
    // Media card as plain glass: no solid colour block, placeholder art or
    // grayscale; artwork fades into the glass from the right. The card sets
    // colours inline, hence !important.
    "hui-media-control-card": `
      .color-block, .no-img {
        background-color: transparent !important; background-image: none !important;
      }
      .color-gradient { background-image: none !important; }
      .off.background { filter: none; }
      .image {
        -webkit-mask-image: linear-gradient(to right, transparent, #000 60%);
        mask-image: linear-gradient(to right, transparent, #000 60%);
        opacity: 0.9;
      }
      .player { color: var(--primary-text-color) !important; }
      .player .icon { color: var(--state-icon-color); }
      .controls { color: var(--primary-text-color); }
      ha-slider {
        --ha-slider-track-color: var(--atelier-fill-strong, #c8c8c880);
        --ha-slider-indicator-color: var(--atelier-accent, var(--primary-color));
      }`,
    // Time input as a compact glass pill without the hh/mm labels, filled
    // background and underline.
    "ha-base-time-input": `
      .time-input-wrap { ${PILL} height: 40px; align-items: center; }
      .time-input-wrap:focus-within { ${RING} }
      ha-input { ${BARE_INPUT(40)} }
      ha-input::part(wa-base) { height: 40px; background: transparent; }
      ha-input::part(wa-input) {
        padding-top: 0; text-align: center; font-size: 15px; font-weight: 500;
        font-variant-numeric: tabular-nums; color: var(--primary-text-color);
      }
      .time-separator, ha-icon-button {
        background: transparent; border-bottom: none; height: 40px;
        color: var(--secondary-text-color);
      }`,
    // Alarm code field: the same glass pill; the keypad below explains it, and
    // the hidden label stays available to screen readers.
    "hui-alarm-panel-card": `
      ha-input { ${BARE_INPUT(44)} ${PILL} }
      ha-input:focus-within { ${RING} }
      ha-input::part(wa-base) { height: 44px; background: transparent; }
      ha-input::part(wa-input) {
        padding-top: 0; text-align: center; font-size: 18px; letter-spacing: 0.3em;
        color: var(--primary-text-color);
      }
      /* Keypad keys as small glass discs, like the cards. */
      .keypad ha-control-button {
        --control-button-background-color: var(--atelier-key-background, var(--disabled-color));
        --control-button-background-opacity: var(--atelier-key-opacity, 0.2);
        border-radius: 50%;
        ${GLASS}
        box-shadow: var(--atelier-edge, inset 0 0 0 transparent), 0 10px 22px -14px rgba(0, 0, 0, 0.55);
      }`,
    "hui-root": `.header { ${GLASS} }`,
    "ha-dialog": `
      .mdc-dialog__surface {
        ${GLASS}
        background: var(--atelier-dialog-background, var(--ha-dialog-surface-background, var(--mdc-theme-surface)));
        border: 1px solid var(--atelier-stroke, transparent);
      }`,
    "ha-md-dialog": `
      :host { --md-dialog-container-color: var(--atelier-dialog-background, var(--card-background-color)); }
      dialog { ${GLASS} border: 1px solid var(--atelier-stroke, transparent); }`,
  };

  const sheets = new Map();

  const sheetFor = (tag, css) => {
    let sheet = sheets.get(tag);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheets.set(tag, sheet);
    }
    sheet.replaceSync(css);
    return sheet;
  };

  const adopt = (el, sheet) => {
    const root = el.shadowRoot;
    if (root && !root.adoptedStyleSheets.includes(sheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
  };

  function* deep(root) {
    for (const el of root.querySelectorAll("*")) {
      yield el;
      if (el.shadowRoot) yield* deep(el.shadowRoot);
    }
  }

  // The element's Lit class (the one with `elementStyles`). Home Assistant
  // ships a scoped-registry polyfill: get() misses elements defined before it,
  // an instance's constructor misses elements defined after it, and for a tag
  // that is not defined yet it hands out a placeholder class. So accept only a
  // class that really has elementStyles, from either source. Many cards are
  // defined lazily, when a dashboard first uses them: wake on whenDefined(),
  // with a slow poll as the fallback.
  async function classOf(tag) {
    let defined = false;
    const whenDefined = customElements.whenDefined(tag).then(() => (defined = true));
    for (let i = 0; ; i++) {
      for (const ctor of [customElements.get(tag), document.createElement(tag).constructor]) {
        if (ctor && Array.isArray(ctor.elementStyles)) return ctor;
      }
      const delay = new Promise((resolve) => setTimeout(resolve, Math.min(250 * 2 ** i, 30000)));
      await (defined ? delay : Promise.race([whenDefined, delay]));
    }
  }

  async function patch(tag, css) {
    const sheet = sheetFor(tag, css);
    const ctor = await classOf(tag);
    // Lit adopts `elementStyles` whenever it creates a shadow root, so every
    // instance made from now on gets the sheet. (Patching connectedCallback
    // would not work: browsers read lifecycle callbacks once, at define().)
    if (Array.isArray(ctor.elementStyles) && !ctor.elementStyles.includes(sheet)) {
      ctor.elementStyles.push(sheet);
    }
    // Instances that already have a shadow root.
    for (const el of deep(document)) if (el.localName === tag) adopt(el, sheet);
  }

  for (const [tag, css] of Object.entries(PATCHES)) patch(tag, css);

  // Public hook so other Atelier pieces (or users) can glass more elements.
  window.KirionAtelierGlass = { version: VERSION, patch };

  console.info(
    `%c KIRION ATELIER %c Glass ${VERSION} `,
    "background:#0A0C10;color:#8AB4FF;font-weight:600;border-radius:4px 0 0 4px;padding:2px 4px",
    "background:#8AB4FF;color:#0A0C10;border-radius:0 4px 4px 0;padding:2px 4px"
  );
})();
