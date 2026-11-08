"""End-to-end tests of KIRION Atelier inside a real Home Assistant instance."""

from homeassistant import config_entries
from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import issue_registry as ir
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kirion_atelier.const import DOMAIN, PANEL_URL, THEME_FILE
from custom_components.kirion_atelier.palette import PRESETS, THEME_NAME, accent_tones

BASE = "/kirion_atelier/0.3.0"
MODULE_URLS = {f"{BASE}/kirion-atelier-glass.js", f"{BASE}/kirion-atelier-cards.js"}


def extra_modules(hass: HomeAssistant) -> set[str]:
    return set(hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)


def theme_accent(hass: HomeAssistant, mode: str = "dark") -> str:
    return hass.data[frontend.DATA_THEMES][THEME_NAME]["modes"][mode]["atelier-accent"]


async def setup_entry(hass: HomeAssistant, options: dict, version: int = 2) -> MockConfigEntry:
    assert await async_setup_component(hass, "frontend", {})
    entry = MockConfigEntry(
        domain=DOMAIN, title="KIRION Atelier", options=options, unique_id=DOMAIN, version=version
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow_single_instance(hass, config_dir):
    assert await async_setup_component(hass, "frontend", {})
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"default_theme": "atelier"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    assert hass.data[frontend.DATA_DEFAULT_THEME] == THEME_NAME

    again = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert again["type"] is FlowResultType.ABORT


async def test_setup_serves_modules_panel_and_theme(hass, config_dir, hass_client):
    await setup_entry(hass, {"default_theme": "atelier"})

    assert MODULE_URLS <= extra_modules(hass)
    panel = hass.data[frontend.DATA_PANELS][PANEL_URL]
    assert panel.require_admin
    assert panel.config["_panel_custom"]["module_url"] == f"{BASE}/kirion-atelier-panel.js"

    client = await hass_client()
    for url in [*MODULE_URLS, f"{BASE}/kirion-atelier-panel.js"]:
        resp = await client.get(url)
        assert resp.status == 200, url
        assert "KIRION Atelier" in await resp.text()

    theme_file = config_dir / "themes" / THEME_FILE
    assert THEME_NAME in theme_file.read_text(encoding="utf-8")
    assert theme_accent(hass) == accent_tones(PRESETS["ice"][1])["dark"]
    # Cards have no outline: the theme zeroes the border for every card in HA.
    assert hass.data[frontend.DATA_THEMES][THEME_NAME]["modes"]["light"]["ha-card-border-width"] == "0px"
    assert hass.data[frontend.DATA_DEFAULT_THEME] == THEME_NAME
    assert hass.data[frontend.DATA_DEFAULT_DARK_THEME] == THEME_NAME
    assert ir.async_get(hass).async_get_issue(DOMAIN, "themes_not_loaded") is None


async def test_panel_api_preview_and_save(hass, config_dir, hass_ws_client):
    entry = await setup_entry(hass, {"default_theme": "none"})
    ws = await hass_ws_client(hass)

    await ws.send_json({"id": 1, "type": "kirion_atelier/get"})
    state = (await ws.receive_json())["result"]
    assert state["palette"]["accent"] == PRESETS["ice"][1]
    assert state["default_theme"] is False and state["theme_loaded"] is True
    assert len(state["presets"]) == len(PRESETS)

    # Preview computes but does not apply.
    await ws.send_json({"id": 2, "type": "kirion_atelier/preview", "palette": {"accent": "#F29BB0", "blur": 999}})
    preview = (await ws.receive_json())["result"]
    assert preview["palette"]["blur"] == 60, "values are clamped"
    assert preview["theme"]["dark"]["atelier-accent"] == "#F29BB0"
    assert theme_accent(hass) == accent_tones(PRESETS["ice"][1])["dark"]

    # Save applies to every device: the theme reloads with the new accent.
    await ws.send_json({
        "id": 3, "type": "kirion_atelier/save",
        "palette": {"accent": "#5CC9C2", "harmony": "complementary", "ambient": 40, "blur": 12, "opacity": 70},
        "default_theme": True,
    })
    saved = await ws.receive_json()
    assert saved["success"], saved
    await hass.async_block_till_done()
    assert theme_accent(hass) == "#5CC9C2"
    assert theme_accent(hass, "light") == accent_tones("#5CC9C2")["light"]
    dark = hass.data[frontend.DATA_THEMES][THEME_NAME]["modes"]["dark"]
    assert dark["atelier-backdrop"] == "blur(12px) saturate(170%)"
    assert hass.data[frontend.DATA_DEFAULT_THEME] == THEME_NAME
    assert entry.options["default_theme"] == "atelier"

    # The palette survives a reload of the integration.
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert theme_accent(hass) == "#5CC9C2"

    await ws.send_json({"id": 4, "type": "kirion_atelier/save", "palette": {"accent": "teal"}})
    error = await ws.receive_json()
    assert not error["success"] and error["error"]["code"] == "invalid_format"


async def test_panel_api_requires_admin(hass, config_dir, hass_ws_client, hass_read_only_access_token):
    await setup_entry(hass, {"default_theme": "none"})
    ws = await hass_ws_client(hass, hass_read_only_access_token)
    await ws.send_json({"id": 1, "type": "kirion_atelier/save", "palette": {"accent": "#FF0000"}})
    msg = await ws.receive_json()
    assert not msg["success"] and msg["error"]["code"] == "unauthorized"


async def test_migrates_colour_variant_to_preset(hass, config_dir):
    entry = await setup_entry(hass, {"default_theme": "sage"}, version=1)
    assert entry.version == 2
    assert entry.options["default_theme"] == "atelier"
    assert theme_accent(hass) == accent_tones(PRESETS["sage"][1])["dark"]
    assert hass.data[frontend.DATA_DEFAULT_THEME] == THEME_NAME


async def test_options_change_and_remove(hass, config_dir):
    entry = await setup_entry(hass, {"default_theme": "atelier"})
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"default_theme": "none"})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    # "Don't change" hands back a default this integration had set.
    assert hass.data[frontend.DATA_DEFAULT_THEME] == "default"
    assert MODULE_URLS <= extra_modules(hass)

    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert not MODULE_URLS & extra_modules(hass)
    assert PANEL_URL not in hass.data[frontend.DATA_PANELS]
    assert not (config_dir / "themes" / THEME_FILE).exists()
    assert THEME_NAME not in hass.data[frontend.DATA_THEMES]


async def test_keeps_user_default_theme(hass, config_dir):
    entry = await setup_entry(hass, {"default_theme": "none"})
    await hass.services.async_call("frontend", "set_theme", {"name": THEME_NAME}, blocking=True)
    # An Atelier default the user picked themselves survives reloads and restarts.
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.data[frontend.DATA_DEFAULT_THEME] == THEME_NAME


async def test_issue_when_themes_folder_not_included(hass, tmp_path):
    hass.config.config_dir = str(tmp_path)
    (tmp_path / "configuration.yaml").write_text("default_config:\n", encoding="utf-8")
    await setup_entry(hass, {"default_theme": "atelier"})

    assert MODULE_URLS <= extra_modules(hass), "cards still load without themes"
    assert ir.async_get(hass).async_get_issue(DOMAIN, "themes_not_loaded") is not None
