"""End-to-end tests of KIRION Atelier inside a real Home Assistant instance."""

from homeassistant import config_entries
from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kirion_atelier.const import DOMAIN, THEME_FILE, THEMES

BASE = "/kirion_atelier/0.2.0"
MODULE_URLS = {f"{BASE}/kirion-atelier-glass.js", f"{BASE}/kirion-atelier-cards.js"}


def extra_modules(hass: HomeAssistant) -> set[str]:
    return set(hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)


async def setup_entry(hass: HomeAssistant, options: dict) -> MockConfigEntry:
    assert await async_setup_component(hass, "frontend", {})
    entry = MockConfigEntry(domain=DOMAIN, title="KIRION Atelier", options=options, unique_id=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow_single_instance(hass, config_dir):
    assert await async_setup_component(hass, "frontend", {})
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"default_theme": "amber"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["options"] == {"default_theme": "amber"}
    await hass.async_block_till_done()

    again = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert again["type"] is FlowResultType.ABORT


async def test_setup_serves_modules_and_installs_themes(hass, config_dir, hass_client):
    await setup_entry(hass, {"default_theme": "sage"})

    assert MODULE_URLS <= extra_modules(hass)
    client = await hass_client()
    for url in MODULE_URLS:
        resp = await client.get(url)
        assert resp.status == 200, url
        assert "KIRION Atelier" in await resp.text()

    assert (config_dir / "themes" / THEME_FILE).exists()
    assert set(THEMES.values()) <= set(hass.data[frontend.DATA_THEMES])
    assert hass.data[frontend.DATA_DEFAULT_THEME] == "KIRION Atelier Sage"
    assert hass.data[frontend.DATA_DEFAULT_DARK_THEME] == "KIRION Atelier Sage"
    assert ir.async_get(hass).async_get_issue(DOMAIN, "themes_not_loaded") is None


async def test_options_change_and_remove(hass, config_dir):
    entry = await setup_entry(hass, {"default_theme": "ice"})
    assert hass.data[frontend.DATA_DEFAULT_THEME] == "KIRION Atelier"

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"default_theme": "none"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    # "Don't change" hands back a default this integration had set.
    assert hass.data[frontend.DATA_DEFAULT_THEME] == "default"
    assert MODULE_URLS <= extra_modules(hass), "reload must re-add the modules"

    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert not MODULE_URLS & extra_modules(hass)
    assert not (config_dir / "themes" / THEME_FILE).exists()
    assert "KIRION Atelier" not in hass.data[frontend.DATA_THEMES]


async def test_keeps_user_default_theme(hass, config_dir):
    entry = await setup_entry(hass, {"default_theme": "none"})
    await hass.services.async_call("frontend", "set_theme", {"name": "KIRION Atelier Mono"}, blocking=True)
    # An Atelier default the user picked themselves survives reloads and restarts.
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.data[frontend.DATA_DEFAULT_THEME] == "KIRION Atelier Mono"


async def test_issue_when_themes_folder_not_included(hass, tmp_path):
    hass.config.config_dir = str(tmp_path)
    (tmp_path / "configuration.yaml").write_text("default_config:\n", encoding="utf-8")
    await setup_entry(hass, {"default_theme": "ice"})

    assert MODULE_URLS <= extra_modules(hass), "cards still load without themes"
    assert ir.async_get(hass).async_get_issue(DOMAIN, "themes_not_loaded") is not None
