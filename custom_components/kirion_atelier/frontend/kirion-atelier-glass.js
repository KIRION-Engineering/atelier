/*! KIRION Atelier Glass v0.3.1
 *
 * Home Assistant themes can only set CSS variables, and the frontend has no
 * variable for backdrop-filter. This module adds one: every patched element
 * reads `--atelier-backdrop`, which only KIRION Atelier themes define. With any
 * other theme active the variable is unset and the module does nothing.
 *
 * The KIRION Atelier integration loads it on every page. For a manual install
 * use `frontend: extra_module_url` (whole UI) or a dashboard resource.
 */
(() => {
  const VERSION = "0.3.1";
  if (window.KirionAtelierGlass) return;

  const GLASS = `
    backdrop-filter: var(--atelier-backdrop, none);
    -webkit-backdrop-filter: var(--atelier-backdrop, none);
  `;

  // tag -> CSS adopted into that element's shadow root.
  const PATCHES = {
    "ha-card": `:host { ${GLASS} }`,
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

  async function patch(tag, css) {
    const sheet = sheetFor(tag, css);
    await customElements.whenDefined(tag);
    const proto = customElements.get(tag).prototype;
    if (!Object.prototype.hasOwnProperty.call(proto, "__atelierGlass")) {
      const connected = proto.connectedCallback;
      proto.connectedCallback = function () {
        connected?.call(this);
        adopt(this, sheet);
      };
      proto.__atelierGlass = true;
    }
    // Elements rendered before this module loaded.
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
