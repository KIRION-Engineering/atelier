"""Constants for KIRION Atelier."""

DOMAIN = "kirion_atelier"

# Static files are served under a versioned path, so every release gets fresh
# URLs and no browser or CDN cache can hold on to an old build.
URL_BASE = "/kirion_atelier"
MODULES = ("kirion-atelier-glass.js", "kirion-atelier-cards.js")
PANEL_MODULE = "kirion-atelier-panel.js"
PANEL_URL = "kirion-atelier"
PANEL_ELEMENT = "kirion-atelier-panel"

THEME_FILE = "kirion-atelier.yaml"
STORAGE_KEY = f"{DOMAIN}.palette"
STORAGE_VERSION = 1

CONF_DEFAULT_THEME = "default_theme"
USE_THEME = "atelier"
NO_THEME = "none"

# 0.2.x shipped one theme per colour; they are now presets of a single theme.
LEGACY_VARIANTS = {
    "ice": "KIRION Atelier",
    "sage": "KIRION Atelier Sage",
    "amber": "KIRION Atelier Amber",
    "mono": "KIRION Atelier Mono",
}

DOCS_URL = "https://github.com/KIRION-Engineering/atelier"
