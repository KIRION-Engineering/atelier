"""KIRION Atelier palette → Home Assistant theme.

The single source of every colour in the theme. A palette is a handful of
choices made in the Atelier Panel; `build_theme` turns it into the light and
dark variable sets. Accent tones are derived in OKLCH, so any hue picked on the
colour wheel gets the same perceived lightness in both modes.
"""

from __future__ import annotations

import math
import re
from typing import Any

THEME_NAME = "KIRION Atelier"

FONT = (
    '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", '
    'Roboto, "Helvetica Neue", sans-serif'
)

HARMONIES = ("analogous", "complementary", "mono")

DEFAULT_PALETTE: dict[str, Any] = {
    "accent": "#8AB4FF",
    "harmony": "analogous",
    "ambient": 100,  # % strength of the background glow
    "blur": 28,  # px of glass blur
    "opacity": 30,  # % card opacity
}

# Presets offered next to the colour wheel; key → (label, accent).
PRESETS: dict[str, tuple[str, str]] = {
    "ice": ("Ice", "#8AB4FF"),
    "sage": ("Sage", "#8FCBA4"),
    "amber": ("Amber", "#F1B866"),
    "rose": ("Rose", "#F29BB0"),
    "lavender": ("Lavender", "#B4A2F5"),
    "teal": ("Teal", "#5CC9C2"),
    "coral": ("Coral", "#F59A7C"),
    "mono": ("Mono", "#E9EBEF"),
}

LIMITS = {"ambient": (0, 150), "blur": (0, 60), "opacity": (0, 100)}
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def normalize_palette(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Merge with defaults and clamp; raises ValueError on malformed input."""
    palette = {**DEFAULT_PALETTE, **(raw or {})}
    if not _HEX.match(str(palette["accent"])):
        raise ValueError(f"accent must be #RRGGBB, got {palette['accent']!r}")
    if palette["harmony"] not in HARMONIES:
        raise ValueError(f"harmony must be one of {HARMONIES}")
    out = {"accent": palette["accent"].upper(), "harmony": palette["harmony"]}
    for key, (lo, hi) in LIMITS.items():
        out[key] = int(min(hi, max(lo, round(float(palette[key])))))
    return out


# --------------------------------------------------------------------- colour


def _to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _to_srgb(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def _cbrt(x: float) -> float:
    return math.copysign(abs(x) ** (1 / 3), x)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    return tuple(int(value[i : i + 2], 16) for i in (1, 3, 5))  # type: ignore[return-value]


def hex_to_oklch(value: str) -> tuple[float, float, float]:
    r, g, b = (_to_linear(c / 255) for c in hex_to_rgb(value))
    l_ = _cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m_ = _cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s_ = _cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def _oklch_to_linear(L: float, C: float, H: float) -> tuple[float, float, float]:
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def oklch_to_hex(L: float, C: float, H: float) -> str:
    """OKLCH → #RRGGBB, reducing chroma until the colour fits in sRGB."""
    lo, hi = 0.0, C
    rgb = _oklch_to_linear(L, 0, H)
    if all(-1e-4 <= c <= 1 + 1e-4 for c in _oklch_to_linear(L, C, H)):
        rgb = _oklch_to_linear(L, C, H)
    else:
        for _ in range(24):
            mid = (lo + hi) / 2
            candidate = _oklch_to_linear(L, mid, H)
            if all(-1e-4 <= c <= 1 + 1e-4 for c in candidate):
                lo, rgb = mid, candidate
            else:
                hi = mid
    return "#" + "".join(
        f"{round(min(1, max(0, _to_srgb(min(1, max(0, c))))) * 255):02X}" for c in rgb
    )


def rgb_str(value: str) -> str:
    return ", ".join(str(c) for c in hex_to_rgb(value))


def _neutral(chroma: float) -> bool:
    return chroma < 0.03


def accent_tones(accent: str) -> dict[str, str]:
    """The accent as it appears in dark mode and in light mode."""
    L, C, H = hex_to_oklch(accent)
    if _neutral(C):
        return {"dark": oklch_to_hex(0.94, C, H), "light": oklch_to_hex(0.26, C, H)}
    # Dark mode keeps the picked lightness within a readable band; light mode
    # sits lower and a little more saturated so it holds up on pale glass.
    return {
        "dark": oklch_to_hex(min(0.88, max(0.76, L)), min(C, 0.15), H),
        "light": oklch_to_hex(0.52, min(C * 1.3, 0.18), H),
    }


def _glow_hues(accent: str, harmony: str) -> tuple[float, float, float, float]:
    """Hue of the three background glows, plus their chroma."""
    _, C, H = hex_to_oklch(accent)
    offsets = {"analogous": (40, -40), "complementary": (180, 150), "mono": (0, 0)}[harmony]
    return H, (H + offsets[0]) % 360, (H + offsets[1]) % 360, min(C, 0.14)


# ---------------------------------------------------------------------- theme


def _semantic(mode: str) -> dict[str, str]:
    """State colours at the theme's lightness, so icons read as one family."""
    L, C = (0.78, 0.13) if mode == "dark" else (0.58, 0.15)
    hues = {"warm": 62, "heat": 40, "cool": 240, "dry": 95, "fan": 195, "green": 152, "red": 25, "yellow": 85}
    return {name: oklch_to_hex(L, C, hue) for name, hue in hues.items()}


def _state_colors(accent: str, icon: str, mode: str) -> dict[str, str]:
    c = _semantic(mode)
    colors = {
        "state-active-color": accent,
        "state-inactive-color": icon,
        "state-light-active-color": c["warm"],
        "state-climate-heat-color": c["heat"],
        "state-climate-cool-color": c["cool"],
        "state-climate-heat_cool-color": accent,
        "state-climate-auto-color": accent,
        "state-climate-dry-color": c["dry"],
        "state-climate-fan_only-color": c["fan"],
        "state-water_heater-active-color": c["heat"],
        "state-fan-active-color": accent,
        "state-cover-active-color": accent,
        "state-media_player-active-color": accent,
        "state-binary_sensor-active-color": accent,
        "state-person-home-color": accent,
        "state-device_tracker-home-color": accent,
        "state-lock-locked-color": c["green"],
        "state-lock-unlocked-color": c["red"],
        "state-lock-open-color": c["red"],
        "state-lock-jammed-color": c["red"],
        "state-lock-locking-color": c["yellow"],
        "state-lock-unlocking-color": c["yellow"],
        "state-alarm_control_panel-disarmed-color": c["green"],
        "state-alarm_control_panel-arming-color": c["yellow"],
        "state-alarm_control_panel-pending-color": c["yellow"],
        "state-alarm_control_panel-triggered-color": c["red"],
        "state-sensor-battery-high-color": c["green"],
        "state-sensor-battery-medium-color": c["yellow"],
        "state-sensor-battery-low-color": c["red"],
        "state-sun-above_horizon-color": c["yellow"],
        "success-color": c["green"],
        "warning-color": c["yellow"],
        "error-color": c["red"],
        "info-color": accent,
    }
    for armed in ("armed_away", "armed_home", "armed_night", "armed_vacation", "armed_custom_bypass"):
        colors[f"state-alarm_control_panel-{armed}-color"] = accent
    return colors


def _glows(palette: dict[str, Any], mode: str) -> list[str]:
    h1, h2, h3, chroma = _glow_hues(palette["accent"], palette["harmony"])
    strength = palette["ambient"] / 100
    lightness = 0.72 if mode == "dark" else 0.80
    alphas = (0.22, 0.13, 0.09) if mode == "dark" else (0.20, 0.18, 0.16)
    shapes = (
        "1100px 700px at 6% -8%",
        "900px 640px at 100% 12%",
        "1000px 760px at 46% 118%",
    )
    layers = []
    for shape, hue, alpha in zip(shapes, (h1, h2, h3), alphas):
        color = rgb_str(oklch_to_hex(lightness, chroma, hue))
        layers.append(
            f"radial-gradient({shape}, rgba({color}, {alpha * strength:.3f}), transparent 62%) fixed"
        )
    base = "#0A0C10 0%, #0D1015 100%" if mode == "dark" else "#EEF0F4 0%, #E5E8EE 100%"
    layers.append(f"linear-gradient(180deg, {base}) fixed")
    return layers


def _mode_vars(palette: dict[str, Any], mode: str) -> dict[str, str]:
    dark = mode == "dark"
    accent = accent_tones(palette["accent"])[mode]
    on_accent = "#0A0C10" if dark else "#FFFFFF"
    text = "#F1F3F7" if dark else "#0E1116"
    t = palette["opacity"] / 100
    card_alpha = 0.02 + 0.12 * t if dark else min(0.95, 0.30 + 0.75 * t)
    backdrop = f"blur({palette['blur']}px) saturate(170%)" if palette["blur"] else "none"
    ink = "241, 243, 247" if dark else "14, 17, 22"

    return {
        "primary-font-family": FONT,
        "ha-font-family-body": FONT,
        "ha-font-family-heading": FONT,
        "primary-color": accent,
        "accent-color": accent,
        "light-primary-color": accent,
        "dark-primary-color": accent,
        "text-primary-color": on_accent,
        "primary-background-color": "#0A0C10" if dark else "#ECEEF2",
        "secondary-background-color": "#11141A" if dark else "#E3E6EC",
        "card-background-color": "#14171E" if dark else "#F7F8FA",
        "primary-text-color": text,
        "secondary-text-color": f"rgba({ink}, {0.58 if dark else 0.56})",
        "disabled-text-color": f"rgba({ink}, 0.32)",
        "divider-color": "rgba(255, 255, 255, 0.08)" if dark else "rgba(14, 17, 22, 0.08)",
        "state-icon-color": f"rgba({ink}, {0.72 if dark else 0.62})",
        # Cards: glass without outlines — depth comes from the shadow alone.
        "ha-card-background": f"rgba(255, 255, 255, {card_alpha:.3f})",
        "ha-card-border-width": "0px",
        "ha-card-border-color": "transparent",
        "ha-card-border-radius": "22px",
        # Native card blur (HA 2025+); the Glass module covers older releases.
        "ha-card-backdrop-filter": backdrop,
        "ha-card-box-shadow": (
            "0 24px 48px -28px rgba(0, 0, 0, 0.75)" if dark else "0 18px 40px -24px rgba(22, 32, 60, 0.32)"
        ),
        "app-header-background-color": "rgba(10, 12, 16, 0.45)" if dark else "rgba(236, 238, 242, 0.55)",
        "app-header-text-color": text,
        "app-header-border-bottom": "1px solid rgba(255, 255, 255, 0.06)"
        if dark
        else "1px solid rgba(14, 17, 22, 0.06)",
        "sidebar-background-color": "#0C0E13" if dark else "#F3F4F7",
        "sidebar-text-color": f"rgba({ink}, 0.78)",
        "sidebar-icon-color": f"rgba({ink}, 0.5)",
        "sidebar-selected-text-color": accent,
        "sidebar-selected-icon-color": accent,
        "mdc-theme-primary": accent,
        "mdc-theme-secondary": accent,
        "mdc-theme-on-primary": on_accent,
        "mdc-theme-surface": "#161A21" if dark else "#F7F8FA",
        "mdc-dialog-scrim-color": "rgba(4, 6, 10, 0.55)" if dark else "rgba(20, 26, 40, 0.28)",
        "ha-dialog-border-radius": "28px",
        "ha-dialog-surface-background": "#161A21" if dark else "#F7F8FA",
        "input-fill-color": f"rgba({'255, 255, 255' if dark else '14, 17, 22'}, 0.04)",
        "mdc-text-field-fill-color": f"rgba({'255, 255, 255' if dark else '14, 17, 22'}, 0.04)",
        "code-editor-background-color": "#0F1217" if dark else "#F2F3F6",
        "markdown-code-background-color": f"rgba({'255, 255, 255' if dark else '14, 17, 22'}, 0.05)",
        "switch-checked-color": accent,
        "switch-checked-button-color": accent,
        "switch-checked-track-color": accent,
        "lovelace-background": ", ".join(_glows(palette, mode)),
        # Every MDI icon in HA takes its colour from these state variables.
        **_state_colors(accent, f"rgba({ink}, {0.72 if dark else 0.62})", mode),
        # Atelier tokens — consumed by the Glass module, the cards and the panel.
        "atelier-backdrop": backdrop,
        "atelier-accent": accent,
        "atelier-accent-rgb": rgb_str(accent),
        "atelier-on-accent": on_accent,
        "atelier-fill": "rgba(255, 255, 255, 0.07)" if dark else "rgba(14, 17, 22, 0.05)",
        "atelier-fill-strong": "rgba(255, 255, 255, 0.12)" if dark else "rgba(255, 255, 255, 0.8)",
        # Glass edge: a light top rim plus a soft sheen. The Glass module draws it
        # above each card's content, so artwork and dials cannot cover it.
        "atelier-edge": (
            "inset 0 1px 0 rgba(255, 255, 255, 0.10), inset 0 14px 24px -20px rgba(255, 255, 255, 0.08)"
            if dark
            else "inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 14px 24px -20px rgba(255, 255, 255, 0.55)"
        ),
        # Glass keys (alarm keypad), painted at full opacity.
        "atelier-key-background": "rgba(255, 255, 255, 0.08)" if dark else "rgba(255, 255, 255, 0.62)",
        "atelier-key-opacity": "1",
        # Strength of the glow under active tile icons (Glass module).
        "atelier-icon-glow": "55%" if dark else "45%",
        "atelier-stroke": "rgba(255, 255, 255, 0.09)" if dark else "rgba(255, 255, 255, 0.78)",
        "atelier-dialog-background": "rgba(20, 23, 30, 0.74)" if dark else "rgba(248, 249, 251, 0.78)",
        "atelier-radius": "22px",
        "atelier-radius-sm": "14px",
    }


def build_theme(palette: dict[str, Any]) -> dict[str, dict[str, str]]:
    palette = normalize_palette(palette)
    return {"light": _mode_vars(palette, "light"), "dark": _mode_vars(palette, "dark")}


def _quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def theme_yaml(palette: dict[str, Any]) -> str:
    modes = build_theme(palette)
    lines = [
        "# KIRION Atelier — generated by the KIRION Atelier integration.",
        "# Change colours in the Atelier Panel; edits to this file are overwritten.",
        "",
        f"{THEME_NAME}:",
        "  modes:",
    ]
    for mode, variables in modes.items():
        lines.append(f"    {mode}:")
        lines.extend(f"      {key}: {_quote(value)}" for key, value in variables.items())
    return "\n".join(lines) + "\n"
