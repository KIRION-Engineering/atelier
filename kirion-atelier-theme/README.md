# KIRION Atelier Theme

Minimalistyczne, szklane motywy dla Home Assistanta. Każdy ma tryb jasny i ciemny (przełączany automatycznie z systemem).

| Motyw | Akcent |
|---|---|
| `KIRION Atelier` | Ice — chłodny błękit |
| `KIRION Atelier Sage` | szałwiowa zieleń |
| `KIRION Atelier Amber` | ciepły bursztyn |
| `KIRION Atelier Mono` | grafit / biel |

## Instalacja

1. HACS → ⋮ → *Custom repositories* → URL repozytorium, typ **Theme**.
2. Zainstaluj **KIRION Atelier Theme**.
3. W `configuration.yaml`:
   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```
4. Zrestartuj HA, potem Profil → Motyw → `KIRION Atelier`.

Sam motyw daje kolory, przezroczyste karty, zaokrąglenia i tło. Prawdziwe rozmycie (*frosted glass*) dokłada **KIRION Atelier Glass**.

Plik YAML jest generowany z `tools/tokens.mjs` (repo główne) — nie edytuj go ręcznie.
