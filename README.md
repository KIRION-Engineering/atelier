# KIRION Atelier

Seria dodatków do Home Assistanta, które zmieniają wygląd na nowoczesny, minimalistyczny i szklany.

| Pakiet | Typ w HACS | Co robi |
|---|---|---|
| [kirion-atelier-theme](kirion-atelier-theme/) | Theme | 4 motywy (Ice, Sage, Amber, Mono) × tryb jasny/ciemny: paleta, przezroczyste karty, zaokrąglenia, gradientowe tło |
| [kirion-atelier-glass](kirion-atelier-glass/) | Dashboard | Prawdziwe rozmycie tła (`backdrop-filter`) na kartach, nagłówku i dialogach — aktywne tylko przy motywie Atelier |
| [kirion-atelier-cards](kirion-atelier-cards/) | Dashboard | Karty: Hero, Tile, Room, Chips — z edytorem wizualnym, PL/EN |

Pakiety działają niezależnie, ale są projektowane razem: motyw definiuje tokeny `--atelier-*`, a Glass i Cards je czytają.

## Dlaczego HACS, a nie dodatki Supervisora

Dodatki Supervisora to osobne kontenery (np. Mosquitto, Node-RED) — nie mają dostępu do interfejsu i nie zmienią jego wyglądu. Wygląd zmieniają motywy i moduły frontendu, a te dystrybuuje się przez HACS. Każdy pakiet to osobne repozytorium, bo HACS wymaga jednego typu na repo.

## Szybki start

1. Opublikuj każdy katalog `kirion-atelier-*` jako osobne repo na GitHubie (nazwa repo = nazwa katalogu).
2. W HACS dodaj je jako *Custom repositories* (Theme / Dashboard / Dashboard) i zainstaluj.
3. `configuration.yaml`:
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
     extra_module_url:
       - /hacsfiles/kirion-atelier-glass/kirion-atelier-glass.js
   ```
4. Restart → Profil → Motyw → **KIRION Atelier**.
5. Dodaj karty „KIRION Atelier · …” do dashboardu (najlepiej widok *Sections*).

Szkło najlepiej widać na zdjęciu w tle — w ustawieniach widoku ustaw *Background* na własną tapetę.

## Rozwój

```bash
npm run build   # tools/tokens.mjs → themes YAML + demo/themes.generated.js
npm run demo    # http://localhost:8787/demo/ — podgląd bez Home Assistanta
```

Wszystkie kolory i wartości motywów są w [tools/tokens.mjs](tools/tokens.mjs). Nowy wariant = jedna linia w `VARIANTS`.
