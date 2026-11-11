# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (c) 2026 KIRION. See NOTICE for the attribution requirements.
"""Websocket API used by the Atelier Panel."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN
from .palette import DEFAULT_PALETTE, HARMONIES, LIMITS, PRESETS, build_theme, normalize_palette

if TYPE_CHECKING:
    from . import Atelier

PALETTE_SCHEMA = vol.Schema(
    {
        vol.Optional("accent"): str,
        vol.Optional("harmony"): vol.In(HARMONIES),
        vol.Optional("ambient"): vol.Coerce(float),
        vol.Optional("blur"): vol.Coerce(float),
        vol.Optional("opacity"): vol.Coerce(float),
    }
)


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_get)
    websocket_api.async_register_command(hass, ws_preview)
    websocket_api.async_register_command(hass, ws_save)


def _atelier(hass: HomeAssistant, connection, msg) -> Atelier | None:
    atelier = hass.data.get(DOMAIN)
    if atelier is None:
        connection.send_error(msg["id"], "not_loaded", "KIRION Atelier is not set up")
    return atelier


def _state(atelier: Atelier) -> dict[str, Any]:
    return {
        "palette": atelier.palette,
        "default_theme": atelier.default_theme,
        "theme_loaded": atelier.theme_loaded,
        "defaults": DEFAULT_PALETTE,
        "limits": {key: list(value) for key, value in LIMITS.items()},
        "presets": [
            {"key": key, "name": name, "accent": accent}
            for key, (name, accent) in PRESETS.items()
        ],
    }


@websocket_api.websocket_command({vol.Required("type"): "kirion_atelier/get"})
@websocket_api.require_admin
@callback
def ws_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if atelier := _atelier(hass, connection, msg):
        connection.send_result(msg["id"], _state(atelier))


@websocket_api.websocket_command(
    {vol.Required("type"): "kirion_atelier/preview", vol.Required("palette"): PALETTE_SCHEMA}
)
@websocket_api.require_admin
@callback
def ws_preview(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Theme variables for an unsaved palette, so the panel can preview it."""
    try:
        palette = normalize_palette(msg["palette"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    connection.send_result(msg["id"], {"palette": palette, "theme": build_theme(palette)})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "kirion_atelier/save",
        vol.Required("palette"): PALETTE_SCHEMA,
        vol.Optional("default_theme"): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Persist the palette and apply it to every device in the home."""
    if not (atelier := _atelier(hass, connection, msg)):
        return
    try:
        await atelier.async_set_palette(msg["palette"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    if "default_theme" in msg and msg["default_theme"] != atelier.default_theme:
        await atelier.async_set_default_theme(msg["default_theme"])
    connection.send_result(msg["id"], _state(atelier))
