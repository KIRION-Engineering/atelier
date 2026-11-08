"""Palette → theme maths."""

import re

import pytest

from custom_components.kirion_atelier.palette import (
    PRESETS,
    accent_tones,
    build_theme,
    hex_to_oklch,
    normalize_palette,
    oklch_to_hex,
    theme_yaml,
)

HEX = re.compile(r"^#[0-9A-F]{6}$")


def test_presets_keep_their_colour_in_dark_mode():
    for name, accent in PRESETS.values():
        assert accent_tones(accent)["dark"] == accent.upper(), name


@pytest.mark.parametrize("accent", ["#FF0000", "#FFFF00", "#00FF00", "#0000FF", "#FF00FF", "#000000", "#FFFFFF", "#7F7F7F"])
def test_any_wheel_colour_gives_readable_tones(accent):
    tones = accent_tones(accent)
    assert HEX.match(tones["dark"]) and HEX.match(tones["light"])
    # Dark mode accents are light, light mode accents are dark.
    assert hex_to_oklch(tones["dark"])[0] > 0.7
    assert hex_to_oklch(tones["light"])[0] < 0.6


def test_oklch_round_trip():
    for accent in ["#8AB4FF", "#F1B866", "#5CC9C2", "#123456"]:
        assert oklch_to_hex(*hex_to_oklch(accent)) == accent


def test_normalize_clamps_and_validates():
    palette = normalize_palette({"accent": "#abcdef", "blur": -5, "ambient": 1000, "opacity": "42"})
    assert palette == {"accent": "#ABCDEF", "harmony": "analogous", "ambient": 150, "blur": 0, "opacity": 42}
    with pytest.raises(ValueError):
        normalize_palette({"accent": "red"})
    with pytest.raises(ValueError):
        normalize_palette({"harmony": "triadic"})


def test_theme_has_no_card_outline_and_respects_glass_settings():
    theme = build_theme({"blur": 0, "opacity": 100})
    for mode in ("light", "dark"):
        assert theme[mode]["ha-card-border-width"] == "0px"
        assert theme[mode]["atelier-backdrop"] == "none"
    assert theme["dark"]["ha-card-background"] == "rgba(255, 255, 255, 0.140)"


def test_yaml_is_one_theme_with_both_modes():
    text = theme_yaml({})
    assert text.count("\nKIRION Atelier:\n") == 1
    assert "    light:\n" in text and "    dark:\n" in text


def test_glass_edge_is_its_own_layer():
    # The rim is drawn above card content by the Glass module, so the card's own
    # shadow must not carry an inset highlight as well.
    for mode, variables in build_theme({}).items():
        assert variables["atelier-edge"].startswith("inset 0 1px 0"), mode
        assert "inset" not in variables["ha-card-box-shadow"], mode


def test_cards_use_native_blur_variable():
    theme = build_theme({"blur": 12})
    assert theme["dark"]["ha-card-backdrop-filter"] == "blur(12px) saturate(170%)"
    assert build_theme({"blur": 0})["light"]["ha-card-backdrop-filter"] == "none"


def test_state_colours_share_the_theme_lightness():
    theme = build_theme({"accent": "#5CC9C2"})
    for mode, (lo, hi) in {"dark": (0.7, 0.86), "light": (0.5, 0.66)}.items():
        v = theme[mode]
        assert v["state-active-color"] == v["atelier-accent"]
        for key in ("state-climate-heat-color", "state-climate-cool-color", "success-color", "warning-color", "error-color"):
            assert lo < hex_to_oklch(v[key])[0] < hi, (mode, key)
        assert v["atelier-icon-glow"].endswith("%")
