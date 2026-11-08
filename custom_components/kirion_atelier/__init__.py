"""KIRION Atelier — minimalist glass look for Home Assistant.

One config entry installs everything:
  * serves the Glass and Cards modules and loads them on every frontend page,
  * copies the themes into <config>/themes and reloads them,
  * optionally makes an Atelier theme the default for all users.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.loader import async_get_integration

from .const import (
    CONF_DEFAULT_THEME,
    DOCS_URL,
    DOMAIN,
    MODULES,
    NO_THEME,
    THEME_FILE,
    THEMES,
    URL_BASE,
)

_LOGGER = logging.getLogger(__name__)

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


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve and load the frontend modules, install the themes."""
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

    def _remove_modules() -> None:
        for url in urls:
            remove_extra_js_url(hass, url)

    entry.async_on_unload(_remove_modules)

    await _async_install_themes(hass)
    await _async_apply_default_theme(hass, entry)

    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Stop loading the modules; files and themes stay until the entry is removed."""
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Remove the theme file and hand the default theme back to Home Assistant."""
    if entry.data.get(DATA_APPLIED) and _default_is_ours(hass):
        await _async_set_default_theme(hass, NO_THEME)
    await hass.async_add_executor_job(
        lambda: Path(hass.config.path("themes", THEME_FILE)).unlink(missing_ok=True)
    )
    await _async_reload_themes(hass)
    ir.async_delete_issue(hass, DOMAIN, ISSUE_THEMES)


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _copy_theme_file(dest: Path) -> bool:
    """Copy the bundled themes into the config folder. Returns True when changed."""
    content = (HERE / "themes" / THEME_FILE).read_text(encoding="utf-8")
    if dest.exists() and dest.read_text(encoding="utf-8") == content:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding="utf-8")
    return True


def _loaded_themes(hass: HomeAssistant) -> dict:
    return hass.data.get(DATA_THEMES) or {}


def _themes_loaded(hass: HomeAssistant) -> bool:
    return all(name in _loaded_themes(hass) for name in THEMES.values())


async def _async_reload_themes(hass: HomeAssistant) -> None:
    try:
        await hass.services.async_call("frontend", "reload_themes", blocking=True)
    except HomeAssistantError as err:
        _LOGGER.warning("Could not reload themes: %s", err)


async def _async_install_themes(hass: HomeAssistant) -> None:
    dest = Path(hass.config.path("themes", THEME_FILE))
    changed = await hass.async_add_executor_job(_copy_theme_file, dest)
    if changed or not _themes_loaded(hass):
        await _async_reload_themes(hass)

    # Themes only load when configuration.yaml includes the themes folder.
    if _themes_loaded(hass):
        ir.async_delete_issue(hass, DOMAIN, ISSUE_THEMES)
    else:
        ir.async_create_issue(
            hass,
            DOMAIN,
            ISSUE_THEMES,
            is_fixable=False,
            severity=ir.IssueSeverity.WARNING,
            translation_key=ISSUE_THEMES,
            learn_more_url=DOCS_URL,
        )


def _default_is_ours(hass: HomeAssistant) -> bool:
    ours = set(THEMES.values())
    return hass.data.get(DATA_DEFAULT_THEME) in ours or (
        hass.data.get(DATA_DEFAULT_DARK_THEME) in ours
    )


async def _async_set_default_theme(hass: HomeAssistant, name: str) -> None:
    for mode in ("light", "dark"):
        await hass.services.async_call(
            "frontend", "set_theme", {"name": name, "mode": mode}, blocking=True
        )


async def _async_apply_default_theme(hass: HomeAssistant, entry: ConfigEntry) -> None:
    choice = entry.options.get(CONF_DEFAULT_THEME, NO_THEME)
    name = THEMES.get(choice)
    if name is None:
        # "Don't change": undo only a default this integration set itself, never
        # an Atelier theme the user made default on their own.
        if entry.data.get(DATA_APPLIED) and _default_is_ours(hass):
            await _async_set_default_theme(hass, NO_THEME)
        _set_applied(hass, entry, False)
        return
    if name not in _loaded_themes(hass):
        _LOGGER.warning("Theme %s is not loaded, leaving the default theme as is", name)
        return
    await _async_set_default_theme(hass, name)
    _set_applied(hass, entry, True)


def _set_applied(hass: HomeAssistant, entry: ConfigEntry, applied: bool) -> None:
    if entry.data.get(DATA_APPLIED, False) != applied:
        hass.config_entries.async_update_entry(entry, data={**entry.data, DATA_APPLIED: applied})
