# KIRION Atelier

Nowoczesny, minimalistyczny i szklany wygląd dla Home Assistanta. Jedna integracja instaluje wszystko:

- **Motyw KIRION Atelier:** tryb jasny i ciemny przełączany razem z systemem, karty bez obrysów, głębia budowana tylko cieniem.
- **Atelier Panel** w pasku bocznym: kolorystyka całego domu z koła kolorów albo z presetów, harmonia tła, siła szkła i podgląd na żywo.
- **Efekt szkła:** prawdziwe rozmycie tła pod kartami, nagłówkiem i oknami.
- **5 kart:** Hero (powitanie, zegar, pogoda), Tile, Room, Chips i Title (nagłówek bez tła, z szablonami). Mają edytor wizualny, teksty są po polsku lub angielsku.
- **Ikony Atelier:** wszystkie ikony MDI w HA dostają kolory z palety motywu i delikatną poświatę w aktywnych kafelkach, a karty Atelier używają własnego zestawu cienkich ikon linii.

## Instalacja

Wymaga Home Assistanta 2024.11 lub nowszego oraz [HACS](https://hacs.xyz).

1. **HACS** → ⋮ → **Custom repositories** → wklej `https://github.com/KIRION-Engineering/atelier`, typ **Integration** → **Add**.
2. Wyszukaj **KIRION Atelier** w HACS → **Download**.
3. **Zrestartuj** Home Assistanta.
4. **Ustawienia → Urządzenia i usługi → Dodaj integrację → KIRION Atelier.** Zdecyduj, czy KIRION Atelier ma być motywem domyślnym.
5. Odśwież przeglądarkę. W pasku bocznym pojawi się **Atelier Panel**, a karty znajdziesz w selektorze kart jako „KIRION Atelier · …”.

**Aktualizacje** pojawiają się w HACS. Po kliknięciu **Update** i restarcie Home Assistanta przeglądarki od razu pobierają nowe pliki: każda wersja ma własne adresy, więc cache przeglądarki, aplikacji ani Cloudflare nie trzyma starej wersji.

## Atelier Panel

Dostępny dla administratorów. Ustawienia obowiązują w całym domu, na każdym urządzeniu z motywem KIRION Atelier.

- **Kolor akcentu:** dowolny kolor z koła kolorów, wpis HEX albo jeden z 8 presetów (Ice, Sage, Amber, Rose, Lavender, Teal, Coral, Mono). Z wybranego koloru integracja wylicza w przestrzeni OKLCH dwa odcienie: jaśniejszy do trybu ciemnego i głębszy do jasnego. Dzięki temu każdy kolor jest czytelny w obu trybach.
- **Tło:** harmonia poświaty (analogiczna, dopełniająca lub jednolita) i jej siła.
- **Szkło:** siła rozmycia i krycie kart.
- **Motyw domyślny dla wszystkich:** urządzenia bez własnego wyboru w profilu dostają KIRION Atelier.

Podgląd pokazuje przykładowe karty Atelier (pogoda, światło, klimat, multimedia, rolety) w trybie jasnym albo ciemnym. To tylko wizualizacja i nie steruje żadnym urządzeniem. Zmiana trafia na wszystkie urządzenia dopiero po kliknięciu **Zastosuj w całym domu**, od razu i bez restartu.

### Motyw się nie pojawił?

Integracja zapisuje motyw w folderze `themes`. Home Assistant wczytuje go tylko wtedy, gdy `configuration.yaml` zawiera:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Nowe instalacje HA mają to domyślnie. Jeśli tego brakuje, integracja pokaże zgłoszenie w **Ustawienia → Naprawy**, a Atelier Panel ostrzeżenie. Gdy `frontend:` już istnieje, dopisz do niego tylko linię `themes:`, nie twórz drugiego klucza.

### Aktualizacja z 0.2

Wersja 0.2 miała cztery osobne motywy (Ice, Sage, Amber, Mono). Teraz to presety jednego motywu. Integracja przenosi wybrany wcześniej wariant do Atelier Panel automatycznie. Użytkownicy, którzy w profilu mieli wybrany np. „KIRION Atelier Sage”, muszą raz wybrać „KIRION Atelier”.

### Odinstalowanie

Usuń integrację w **Urządzenia i usługi**. Motyw i zapisana paleta zostaną usunięte, a motyw domyślny wróci do standardowego, jeśli ustawiła go integracja. Potem usuń ją w HACS.

## Ikony

**Wszystkie ikony MDI** (około 7000 w każdej karcie HA) zostają, ale motyw nadaje im kolory z palety liczonej w OKLCH z koloru akcentu:
- aktywne urządzenia mają kolor akcentu,
- grzanie, chłodzenie, osuszanie i wentylacja mają własne, zharmonizowane odcienie,
- zamki, alarm i baterie mają stonowaną zieleń, żółć i czerwień,
- nieaktywne ikony są wyciszone.

Moduł Glass dodaje pod ikonami aktywnych kafelków HA delikatną poświatę w ich własnym kolorze.

**Zestaw `kirion:`** to 88 cienkich ikon linii plus ikona `kirion:atelier`. Karty Atelier dobierają je automatycznie według domeny, klasy urządzenia i stanu: żarówka, płomień przy grzaniu, płatek przy chłodzeniu, głośnik, listwy rolet, zamek, tarcza alarmu, poziom baterii, pogoda i inne. Własną ikonę ustawisz polem `icon:` w karcie. Zestawu `kirion:` możesz też użyć w dowolnej karcie HA, np. `icon: kirion:lamp-pendant`. Pełna lista nazw jest w [assets/icons/phosphor/](assets/icons/phosphor/).

Ikony linii pochodzą z [Phosphor Icons](https://phosphoricons.com) (waga „light”), licencja MIT, © 2023 Phosphor Icons. Tekst licencji jest w [assets/icons/phosphor/LICENSE](assets/icons/phosphor/LICENSE).

## Karty

Konfiguracja YAML wszystkich kart: [docs/cards.md](docs/cards.md).

## Rozwój

```bash
npm run build   # palette.py → demo/themes.generated.js; ikonaatelier.svg + assets/icons/phosphor → zestaw kirion
npm run demo    # http://localhost:8787/demo/ — podgląd kart bez Home Assistanta
npm test        # testy integracji w prawdziwym Home Assistancie
```

| Ścieżka | Zawartość |
|---|---|
| `custom_components/kirion_atelier/` | integracja (to pobiera HACS) |
| `…/palette.py` | jedyne źródło kolorów: paleta → motyw (OKLCH, presety, harmonie) |
| `…/websocket.py` | API Atelier Panel: `kirion_atelier/get`, `/preview`, `/save` |
| `…/frontend/` | moduły Glass, Cards i Atelier Panel |
| `ikonaatelier.svg` | ikona Atelier Panel w pasku bocznym (`kirion:atelier`); po zmianie uruchom `npm run build` |
| `demo/` | strona podglądu z atrapą Home Assistanta |
| `tests/` | testy pytest |

Przy wydaniu podbij `version` w `manifest.json` i wersję w nagłówkach plików JS, potem utwórz release na GitHubie z tagiem `v<wersja>`. HACS pokazuje klientom wydania jako aktualizacje.
