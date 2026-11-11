# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (c) 2026 KIRION. See NOTICE for the attribution requirements.
"""Shared fixtures: load custom_components/ and give each test its own config dir."""

import pytest

pytest_plugins = "pytest_homeassistant_custom_component"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield


@pytest.fixture
def config_dir(hass, tmp_path):
    """Point Home Assistant at an empty config dir that includes the themes folder."""
    hass.config.config_dir = str(tmp_path)
    (tmp_path / "configuration.yaml").write_text(
        "frontend:\n  themes: !include_dir_merge_named themes\n", encoding="utf-8"
    )
    return tmp_path
