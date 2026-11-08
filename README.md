# KIRION Atelier

Nowoczesny, minimalistyczny i szklany wygląd dla Home Assistanta. Jedna integracja instaluje wszystko:

- **4 motywy:** Ice, Sage, Amber i Mono. Każdy ma tryb jasny i ciemny, przełączany razem z systemem.
- **Efekt szkła:** prawdziwe rozmycie tła pod kartami, nagłówkiem i oknami.
- **4 karty:** Hero (powitanie, zegar, pogoda), Tile, Room i Chips. Mają edytor wizualny, teksty są po polsku lub angielsku.

## Instalacja

Wymaga Home Assistanta 2024.11 lub nowszego oraz [HACS](https://hacs.xyz).

1. **HACS** → ⋮ → **Custom repositories** → wklej `https://github.com/KIRION-Engineering/atelier`, typ **Integration** → **Add**.
2. Wyszukaj **KIRION Atelier** w HACS → **Download**.
3. **Zrestartuj** Home Assistanta.
4. **Ustawienia → Urządzenia i usługi → Dodaj integrację → KIRION Atelier.** Wybierz motyw domyślny albo zostaw obecny.
5. Odśwież przeglądarkę. Karty znajdziesz w selektorze kart jako „KIRION Atelier · …”.

Każdy użytkownik może wybrać własny wariant w swoim profilu. Motyw domyślny zmienisz w **opcjach integracji**.

**Aktualizacje** pojawiają się w HACS. Po kliknięciu **Update** i restarcie Home Assistanta przeglądarki od razu pobierają nowe pliki: każda wersja ma własne adresy, więc cache przeglądarki, aplikacji ani Cloudflare nie trzyma starej wersji.

### Motywy się nie pojawiły?

Integracja kopiuje motywy do folderu `themes`. Home Assistant wczytuje je tylko wtedy, gdy `configuration.yaml` zawiera:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Nowe instalacje HA mają to domyślnie. Jeśli tego brakuje, integracja pokaże zgłoszenie w **Ustawienia → Naprawy**. Gdy `frontend:` już istnieje, dopisz do niego tylko linię `themes:`, nie twórz drugiego klucza.

### Odinstalowanie

Usuń integrację w **Urządzenia i usługi**. Pliki motywów zostaną usunięte, a motyw domyślny wróci do standardowego, jeśli ustawiła go integracja. Potem usuń ją w HACS.

## Karty

Konfiguracja YAML wszystkich kart: [docs/cards.md](docs/cards.md).

## Rozwój

```bash
npm run build   # tools/tokens.mjs → motywy YAML + demo/themes.generated.js
npm run demo    # http://localhost:8787/demo/ — podgląd bez Home Assistanta
npm test        # testy integracji w prawdziwym Home Assistancie
```

| Ścieżka | Zawartość |
|---|---|
| `custom_components/kirion_atelier/` | integracja (to pobiera HACS) |
| `custom_components/kirion_atelier/frontend/` | moduły Glass i Cards |
| `tools/tokens.mjs` | wszystkie kolory i wartości motywów; nowy wariant to jedna linia w `VARIANTS` |
| `demo/` | strona podglądu z atrapą Home Assistanta |
| `tests/` | testy pytest |

Przy wydaniu podbij `version` w `manifest.json` i `VERSION` w obu plikach JS, potem utwórz release na GitHubie z tagiem `v<wersja>`. HACS pokazuje klientom wydania jako aktualizacje.

### Ręczna instalacja bez HACS

Dla instancji, które nie mogą używać HACS, zostaje [tools/ha-update.sh](tools/ha-update.sh) z loaderem [ha/kirion-atelier.js](ha/kirion-atelier.js). Kopiuje on pliki do `/config/www/kirion-atelier/` i `/config/themes/`. Nie używaj go razem z integracją.
