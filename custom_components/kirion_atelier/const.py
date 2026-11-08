"""Constants for KIRION Atelier."""

DOMAIN = "kirion_atelier"

# Static files are served under a versioned path, so every release gets fresh
# URLs and no browser or CDN cache can hold on to an old build.
URL_BASE = "/kirion_atelier"
MODULES = ("kirion-atelier-glass.js", "kirion-atelier-cards.js")

THEME_FILE = "kirion-atelier.yaml"

CONF_DEFAULT_THEME = "default_theme"
NO_THEME = "none"
THEMES = {
    "ice": "KIRION Atelier",
    "sage": "KIRION Atelier Sage",
    "amber": "KIRION Atelier Amber",
    "mono": "KIRION Atelier Mono",
}

DOCS_URL = "https://github.com/KIRION-Engineering/atelier"
