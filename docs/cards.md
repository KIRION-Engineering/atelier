# KIRION Atelier Cards

Cztery minimalistyczne karty w stylu KIRION Atelier. Działają z każdym motywem, najlepiej wyglądają z motywem KIRION Atelier i efektem szkła.

Karty instaluje integracja KIRION Atelier (patrz README). Pojawią się w selektorze kart jako „KIRION Atelier · …”.

## Hero
```yaml
type: custom:kirion-atelier-hero-card
weather: weather.dom          # opcjonalnie
entities:                     # opcjonalne szybkie statusy
  - sensor.salon_temperatura
  - media_player.sonos
name: Olek                    # domyślnie imię zalogowanego użytkownika
show_clock: true
```

## Tile
```yaml
type: custom:kirion-atelier-tile-card
entity: light.salon
name: Salon                   # opcjonalnie
icon: mdi:ceiling-light       # opcjonalnie
tap_action: { action: toggle }      # domyślnie toggle dla przełączalnych
hold_action: { action: more-info }  # domyślnie more-info
```
Światła z kolorem barwią kafel swoim kolorem; jasność / pozycja rolety / głośność pokazuje cienki pasek.

## Room
```yaml
type: custom:kirion-atelier-room-card
name: Salon
icon: mdi:sofa-outline
temperature: sensor.salon_temperatura
humidity: sensor.salon_wilgotnosc
navigation_path: /dashboard-dom/salon
entities:
  - light.salon
  - entity: cover.rolety_salon
    icon: mdi:blinds
```

## Chips
```yaml
type: custom:kirion-atelier-chips-card
alignment: start              # start | center | end
chips:
  - entity: person.olek
    content: name             # state (domyślnie) | name | both
  - binary_sensor.alarm
  - sensor.moc
  - icon: mdi:cog-outline
    tap_action: { action: navigate, navigation_path: /config }
```

Akcje: `toggle`, `more-info`, `navigate`, `url`, `perform-action`, `none` (+ `confirmation`). Teksty interfejsu po polsku lub angielsku, wg języka użytkownika HA.
