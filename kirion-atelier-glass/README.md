# KIRION Atelier Glass

Motywy HA potrafią ustawiać tylko zmienne CSS, a frontend nie ma zmiennej dla `backdrop-filter`. Ten moduł ją dodaje: karty, nagłówek dashboardu i okna dialogowe czytają `--atelier-backdrop`, którą definiują wyłącznie motywy KIRION Atelier. Przy innym motywie moduł nic nie zmienia.

## Instalacja

1. HACS → ⋮ → *Custom repositories* → URL repozytorium, typ **Dashboard** (plugin).
2. Zainstaluj **KIRION Atelier Glass**.
3. Zalecane — ładowanie w całym interfejsie (także okna more-info poza dashboardami):
   ```yaml
   frontend:
     extra_module_url:
       - /hacsfiles/kirion-atelier-glass/kirion-atelier-glass.js
   ```
   Bez tego kroku moduł działa tylko na dashboardach (jako zasób dodany przez HACS).

## Własne elementy

```js
window.KirionAtelierGlass.patch("ha-tile-info", ":host { ... }");
```

Patchowane domyślnie: `ha-card`, `hui-root` (nagłówek), `ha-dialog`, `ha-md-dialog`. Wewnętrzna struktura frontendu HA zmienia się między wersjami — nagłówek i dialogi to *best effort*, karty są stabilne.
