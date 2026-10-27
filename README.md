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

## Instalacja w HA z aktualizacją jednym przyciskiem

Działa z tym repo od razu (także prywatnym), bez HACS. Home Assistant sam pobiera `main` z GitHuba i kopiuje pliki do `/config`.

**1. Token (tylko dla prywatnego repo).** GitHub → Settings → Developer settings → *Fine-grained tokens* → dostęp tylko do `KIRION-Engineering/atelier`, uprawnienie *Contents: Read-only*. Zapisz go w HA jako plik `/config/atelier.token`, np. przez dodatek File editor. Nie wkładaj go do `/config/www`, bo ten katalog jest dostępny publicznie.

**2. `configuration.yaml`:**
```yaml
frontend:
  themes: !include_dir_merge_named themes
  extra_module_url:
    - /local/kirion-atelier/kirion-atelier.js

shell_command:
  atelier_update: >-
    bash -c 'curl -fsSL -H "Authorization: Bearer $(cat /config/atelier.token)"
    -H "Accept: application/vnd.github.raw"
    https://api.github.com/repos/KIRION-Engineering/atelier/contents/tools/ha-update.sh | bash'

script:
  atelier_update:
    alias: Aktualizuj KIRION Atelier
    icon: mdi:cloud-download-outline
    sequence:
      - action: shell_command.atelier_update
        response_variable: result
      - action: frontend.reload_themes
      - action: persistent_notification.create
        data:
          title: KIRION Atelier
          message: "{{ result.stdout or result.stderr }}"
```

**3.** Zrestartuj HA, uruchom skrypt **Aktualizuj KIRION Atelier** (Ustawienia → Automatyzacje → Skrypty), potem odśwież przeglądarkę i wybierz motyw w profilu.

**Każda kolejna aktualizacja:** `git push` → przycisk **Aktualizuj KIRION Atelier** → odświeżenie strony. Motyw przeładowuje się sam. Restart HA nie jest potrzebny.

Jak to działa: [tools/ha-update.sh](tools/ha-update.sh) kopiuje JS do `/config/www/kirion-atelier/`, motyw do `/config/themes/` i zapisuje skrót commita w `VERSION`. [ha/kirion-atelier.js](ha/kirion-atelier.js) to stały punkt wejścia: czyta `VERSION` i ładuje moduły z wersją w adresie, więc przeglądarka nie trzyma starych plików, a między aktualizacjami nadal korzysta z cache.

Pliki w `/config/www` są dostępne bez logowania pod `/local/…`. Gotowy JS kart będzie więc publiczny, jeśli HA jest wystawiony do internetu. Samo repo pozostaje prywatne.

## Instalacja przez HACS

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
