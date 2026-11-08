"""KIRION Atelier — minimalist glass look for Home Assistant.

One config entry installs everything:
  * serves the Glass and Cards modules and loads them on every frontend page,
  * adds the Atelier Panel, where admins set the colours for the whole home,
  * writes the generated theme into <config>/themes and reloads it,
  * optionally makes KIRION Atelier the default theme for all users.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components import frontend, panel_custom
from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv, issue_registry as ir
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from . import websocket
from .const import (
    CONF_DEFAULT_THEME,
    DOCS_URL,
    DOMAIN,
    LEGACY_VARIANTS,
    MODULES,
    NO_THEME,
    PANEL_ELEMENT,
    PANEL_MODULE,
    PANEL_URL,
    STORAGE_KEY,
    STORAGE_VERSION,
    THEME_FILE,
    URL_BASE,
    USE_THEME,
)
from .palette import PRESETS, THEME_NAME, normalize_palette, theme_yaml

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

HERE = Path(__file__).parent
DATA_STATIC = f"{DOMAIN}_static_paths"
ISSUE_THEMES = "themes_not_loaded"
# Entry data flag: True while the default theme is one this integration set.
DATA_APPLIED = "default_theme_applied"

# Frontend keeps its theme state in hass.data; fall back to the literal keys
# in case a release stops exporting the constants.
DATA_THEMES = getattr(frontend, "DATA_THEMES", "frontend_themes")
DATA_DEFAULT_THEME = getattr(frontend, "DATA_DEFAULT_THEME", "frontend_default_theme")
DATA_DEFAULT_DARK_THEME = getattr(
    frontend, "DATA_DEFAULT_DARK_THEME", "frontend_default_dark_theme"
)
OUR_THEMES = {THEME_NAME, *LEGACY_VARIANTS.values()}


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    websocket.async_register(hass)
    return True


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """0.2.x → 0.3: colour variants became presets of a single theme."""
    if entry.version == 1:
        old = entry.options.get(CONF_DEFAULT_THEME, NO_THEME)
        store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        if old in PRESETS and await store.async_load() is None:
            await store.async_save(normalize_palette({"accent": PRESETS[old][1]}))
        hass.config_entries.async_update_entry(
            entry,
            options={
                **entry.options,
                CONF_DEFAULT_THEME: USE_THEME if old in LEGACY_VARIANTS else NO_THEME,
            },
            version=2,
        )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve the frontend, register the panel and install the theme."""
    version = (await async_get_integration(hass, DOMAIN)).version
    base = f"{URL_BASE}/{version}"

    # Routes cannot be removed from aiohttp, so register each path once per run.
    registered: set[str] = hass.data.setdefault(DATA_STATIC, set())
    if base not in registered:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(base, str(HERE / "frontend"), True)]
        )
        registered.add(base)

    urls = [f"{base}/{name}" for name in MODULES]
    for url in urls:
        add_extra_js_url(hass, url)

    def _unload() -> None:
        for url in urls:
            remove_extra_js_url(hass, url)
        frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
        hass.data.pop(DOMAIN, None)

    entry.async_on_unload(_unload)

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title="Atelier Panel",
        sidebar_icon="mdi:palette-swatch-outline",
        module_url=f"{base}/{PANEL_MODULE}",
        require_admin=True,
        config={"version": version},
    )

    atelier = Atelier(hass, entry)
    await atelier.async_load()
    hass.data[DOMAIN] = atelier

    await atelier.async_write_theme()
    await atelier.async_apply_default_theme()

    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Stop serving the modules and panel; the theme stays until the entry is removed."""
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove the theme file and hand the default theme back to Home Assistant."""
    if entry.data.get(DATA_APPLIED) and _default_is_ours(hass):
        await _async_set_default_theme(hass, NO_THEME)
    await hass.async_add_executor_job(
        lambda: Path(hass.config.path("themes", THEME_FILE)).unlink(missing_ok=True)
    )
    await Store(hass, STORAGE_VERSION, STORAGE_KEY).async_remove()
    await _async_reload_themes(hass)
    ir.async_delete_issue(hass, DOMAIN, ISSUE_THEMES)


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    if (atelier := hass.data.get(DOMAIN)) is not None:
        await atelier.async_apply_default_theme()


class Atelier:
    """The palette of one Home Assistant instance and the theme built from it."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.palette = normalize_palette(None)

    @property
    def default_theme(self) -> bool:
        return self.entry.options.get(CONF_DEFAULT_THEME) == USE_THEME

    @property
    def theme_loaded(self) -> bool:
        return THEME_NAME in _loaded_themes(self.hass)

    async def async_load(self) -> None:
        try:
            self.palette = normalize_palette(await self._store.async_load())
        except ValueError as err:
            _LOGGER.warning("Stored palette is invalid, using defaults: %s", err)

    async def async_set_palette(self, raw: dict[str, Any]) -> dict[str, Any]:
        """Validate, persist and apply a palette for the whole home."""
        palette = normalize_palette(raw)
        await self._store.async_save(palette)
        self.palette = palette
        await self.async_write_theme()
        return palette

    async def async_set_default_theme(self, enabled: bool) -> None:
        # The options listener applies it.
        self.hass.config_entries.async_update_entry(
            self.entry,
            options={**self.entry.options, CONF_DEFAULT_THEME: USE_THEME if enabled else NO_THEME},
        )

    async def async_write_theme(self) -> None:
        dest = Path(self.hass.config.path("themes", THEME_FILE))
        changed = await self.hass.async_add_executor_job(
            _write_if_changed, dest, theme_yaml(self.palette)
        )
        if changed or not self.theme_loaded:
            await _async_reload_themes(self.hass)

        # Themes only load when configuration.yaml includes the themes folder.
        if self.theme_loaded:
            ir.async_delete_issue(self.hass, DOMAIN, ISSUE_THEMES)
        else:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                ISSUE_THEMES,
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key=ISSUE_THEMES,
                learn_more_url=DOCS_URL,
            )

    async def async_apply_default_theme(self) -> None:
        if not self.default_theme:
            # "Don't change": undo only a default this integration set itself,
            # never an Atelier theme the user made default on their own.
            if self.entry.data.get(DATA_APPLIED) and _default_is_ours(self.hass):
                await _async_set_default_theme(self.hass, NO_THEME)
            self._set_applied(False)
            return
        if not self.theme_loaded:
            _LOGGER.warning("Theme %s is not loaded, leaving the default theme as is", THEME_NAME)
            return
        await _async_set_default_theme(self.hass, THEME_NAME)
        self._set_applied(True)

    def _set_applied(self, applied: bool) -> None:
        if self.entry.data.get(DATA_APPLIED, False) != applied:
            self.hass.config_entries.async_update_entry(
                self.entry, data={**self.entry.data, DATA_APPLIED: applied}
            )


def _write_if_changed(dest: Path, content: str) -> bool:
    if dest.exists() and dest.read_text(encoding="utf-8") == content:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".tmp")
    tmp.write_text(content, encoding="utf-8")
    tmp.replace(dest)
    return True


def _loaded_themes(hass: HomeAssistant) -> dict:
    return hass.data.get(DATA_THEMES) or {}


async def _async_reload_themes(hass: HomeAssistant) -> None:
    try:
        await hass.services.async_call("frontend", "reload_themes", blocking=True)
    except HomeAssistantError as err:
        _LOGGER.warning("Could not reload themes: %s", err)


def _default_is_ours(hass: HomeAssistant) -> bool:
    return hass.data.get(DATA_DEFAULT_THEME) in OUR_THEMES or (
        hass.data.get(DATA_DEFAULT_DARK_THEME) in OUR_THEMES
    )


async def _async_set_default_theme(hass: HomeAssistant, name: str) -> None:
    for mode in ("light", "dark"):
        await hass.services.async_call(
            "frontend", "set_theme", {"name": name, "mode": mode}, blocking=True
        )
