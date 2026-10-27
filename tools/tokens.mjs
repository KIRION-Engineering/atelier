// KIRION Atelier — design tokens.
// Single source of truth for every theme variant. Run `node tools/build-themes.mjs`
// to regenerate the Home Assistant theme YAML and the demo theme bundle.

export const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

// Accent per variant: a light tone for dark mode, a deep tone for light mode.
export const VARIANTS = {
  "KIRION Atelier": { dark: "#8AB4FF", light: "#2F64E0" }, // Ice
  "KIRION Atelier Sage": { dark: "#9BD1AE", light: "#2D7A52" },
  "KIRION Atelier Amber": { dark: "#F1C27D", light: "#A2611A" },
  "KIRION Atelier Mono": { dark: "#E9EBEF", light: "#16181D" },
};

export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgb = (hex) => hexToRgb(hex).join(", ");

export function dark(accent) {
  const a = rgb(accent);
  const text = "#F1F3F7";
  return {
    "primary-font-family": FONT,
    "ha-font-family-body": FONT,
    "ha-font-family-heading": FONT,

    "primary-color": accent,
    "accent-color": accent,
    "light-primary-color": accent,
    "dark-primary-color": accent,
    "text-primary-color": "#0A0C10",

    "primary-background-color": "#0A0C10",
    "secondary-background-color": "#11141A",
    "card-background-color": "#14171E",
    "primary-text-color": text,
    "secondary-text-color": "rgba(241, 243, 247, 0.58)",
    "disabled-text-color": "rgba(241, 243, 247, 0.32)",
    "divider-color": "rgba(255, 255, 255, 0.08)",
    "state-icon-color": "rgba(241, 243, 247, 0.72)",

    "ha-card-background": "rgba(255, 255, 255, 0.055)",
    "ha-card-border-color": "rgba(255, 255, 255, 0.09)",
    "ha-card-border-width": "1px",
    "ha-card-border-radius": "22px",
    "ha-card-box-shadow":
      "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 24px 48px -28px rgba(0, 0, 0, 0.75)",

    "app-header-background-color": "rgba(10, 12, 16, 0.45)",
    "app-header-text-color": text,
    "app-header-border-bottom": "1px solid rgba(255, 255, 255, 0.06)",
    "sidebar-background-color": "#0C0E13",
    "sidebar-text-color": "rgba(241, 243, 247, 0.78)",
    "sidebar-icon-color": "rgba(241, 243, 247, 0.5)",
    "sidebar-selected-text-color": accent,
    "sidebar-selected-icon-color": accent,

    "mdc-theme-primary": accent,
    "mdc-theme-secondary": accent,
    "mdc-theme-on-primary": "#0A0C10",
    "mdc-theme-surface": "#161A21",
    "mdc-dialog-scrim-color": "rgba(4, 6, 10, 0.55)",
    "ha-dialog-border-radius": "28px",
    "ha-dialog-surface-background": "#161A21",
    "input-fill-color": "rgba(255, 255, 255, 0.04)",
    "mdc-text-field-fill-color": "rgba(255, 255, 255, 0.04)",
    "code-editor-background-color": "#0F1217",
    "markdown-code-background-color": "rgba(255, 255, 255, 0.05)",

    "switch-checked-color": accent,
    "switch-checked-button-color": accent,
    "switch-checked-track-color": accent,

    "lovelace-background": [
      `radial-gradient(1100px 700px at 6% -8%, rgba(${a}, 0.22), transparent 62%) fixed`,
      "radial-gradient(900px 640px at 100% 12%, rgba(146, 112, 255, 0.13), transparent 60%) fixed",
      "radial-gradient(1000px 760px at 46% 118%, rgba(56, 196, 184, 0.09), transparent 60%) fixed",
      "linear-gradient(180deg, #0A0C10 0%, #0D1015 100%) fixed",
    ].join(", "),

    // Atelier tokens — consumed by Atelier Glass and Atelier Cards.
    "atelier-backdrop": "blur(28px) saturate(170%)",
    "atelier-accent": accent,
    "atelier-accent-rgb": a,
    "atelier-on-accent": "#0A0C10",
    "atelier-fill": "rgba(255, 255, 255, 0.07)",
    "atelier-fill-strong": "rgba(255, 255, 255, 0.12)",
    "atelier-stroke": "rgba(255, 255, 255, 0.09)",
    "atelier-dialog-background": "rgba(20, 23, 30, 0.74)",
    "atelier-radius": "22px",
    "atelier-radius-sm": "14px",
  };
}

export function light(accent) {
  const a = rgb(accent);
  const text = "#0E1116";
  return {
    ...dark(accent),

    "text-primary-color": "#FFFFFF",

    "primary-background-color": "#ECEEF2",
    "secondary-background-color": "#E3E6EC",
    "card-background-color": "#F7F8FA",
    "primary-text-color": text,
    "secondary-text-color": "rgba(14, 17, 22, 0.56)",
    "disabled-text-color": "rgba(14, 17, 22, 0.32)",
    "divider-color": "rgba(14, 17, 22, 0.08)",
    "state-icon-color": "rgba(14, 17, 22, 0.62)",

    "ha-card-background": "rgba(255, 255, 255, 0.56)",
    "ha-card-border-color": "rgba(255, 255, 255, 0.78)",
    "ha-card-box-shadow":
      "inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 18px 40px -26px rgba(22, 32, 60, 0.3)",

    "app-header-background-color": "rgba(236, 238, 242, 0.55)",
    "app-header-text-color": text,
    "app-header-border-bottom": "1px solid rgba(14, 17, 22, 0.06)",
    "sidebar-background-color": "#F3F4F7",
    "sidebar-text-color": "rgba(14, 17, 22, 0.78)",
    "sidebar-icon-color": "rgba(14, 17, 22, 0.5)",

    "mdc-theme-on-primary": "#FFFFFF",
    "mdc-theme-surface": "#F7F8FA",
    "mdc-dialog-scrim-color": "rgba(20, 26, 40, 0.28)",
    "ha-dialog-surface-background": "#F7F8FA",
    "input-fill-color": "rgba(14, 17, 22, 0.04)",
    "mdc-text-field-fill-color": "rgba(14, 17, 22, 0.04)",
    "code-editor-background-color": "#F2F3F6",
    "markdown-code-background-color": "rgba(14, 17, 22, 0.05)",

    "lovelace-background": [
      `radial-gradient(1100px 700px at 6% -8%, rgba(${a}, 0.2), transparent 62%) fixed`,
      "radial-gradient(900px 640px at 100% 12%, rgba(170, 140, 255, 0.18), transparent 60%) fixed",
      "radial-gradient(1000px 760px at 46% 118%, rgba(90, 210, 196, 0.16), transparent 60%) fixed",
      "linear-gradient(180deg, #EEF0F4 0%, #E5E8EE 100%) fixed",
    ].join(", "),

    "atelier-on-accent": "#FFFFFF",
    "atelier-fill": "rgba(14, 17, 22, 0.05)",
    "atelier-fill-strong": "rgba(255, 255, 255, 0.8)",
    "atelier-stroke": "rgba(255, 255, 255, 0.78)",
    "atelier-dialog-background": "rgba(248, 249, 251, 0.78)",
  };
}
