/*! KIRION Atelier Glass v0.4.0
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
  const VERSION = "0.4.0";
  if (window.KirionAtelierGlass) return;

  const GLASS = `
    backdrop-filter: var(--atelier-backdrop, none);
    -webkit-backdrop-filter: var(--atelier-backdrop, none);
  `;

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

  // The element's class, taken from an instance: a registry polyfill installed
  // by another add-on may hide elements defined before it from get() and
  // whenDefined(). Polls until the tag is upgraded (or gives up after a minute).
  async function classOf(tag) {
    for (let i = 0; i < 120; i++) {
      const ctor = document.createElement(tag).constructor;
      if (ctor !== HTMLElement && ctor !== HTMLUnknownElement) return ctor;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return null;
  }

  async function patch(tag, css) {
    const sheet = sheetFor(tag, css);
    const ctor = await classOf(tag);
    if (!ctor) return;
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
