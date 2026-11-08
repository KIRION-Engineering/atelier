"""Config flow for KIRION Atelier."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import CONF_DEFAULT_THEME, DOMAIN, NO_THEME, THEMES


def _schema(default: str) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_DEFAULT_THEME, default=default): SelectSelector(
                SelectSelectorConfig(
                    options=[*THEMES, NO_THEME],
                    translation_key=CONF_DEFAULT_THEME,
                    mode=SelectSelectorMode.LIST,
                )
            )
        }
    )


class KirionAtelierConfigFlow(ConfigFlow, domain=DOMAIN):
    """Single-step install: pick the default theme, or keep the current one."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(
                title="KIRION Atelier", data={}, options=user_input
            )
        return self.async_show_form(step_id="user", data_schema=_schema("ice"))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return KirionAtelierOptionsFlow()


class KirionAtelierOptionsFlow(OptionsFlow):
    """Change the default theme after install."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        current = self.config_entry.options.get(CONF_DEFAULT_THEME, NO_THEME)
        return self.async_show_form(step_id="init", data_schema=_schema(current))
