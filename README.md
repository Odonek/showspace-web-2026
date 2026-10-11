# ShowSpace – nový web (2026)

Zkušební verze nového webu showspace.cz. Živý web zůstává v repozitáři `ShowSpace-upgraded-web`.

Čisté HTML, CSS a JavaScript, bez build nástrojů. Stačí otevřít `index.html`
(3D model na úvodu potřebuje lokální server, např. `python3 -m http.server`).

## Stránky

| Soubor | Obsah |
| --- | --- |
| `index.html` | Úvod pro makléře: 3D model bytu řízený scrollem, hotová zakázka, co dostanou, postup, balíčky |
| `prostory.html` | Hotely, fitness, wellness, gastro: reference s filtrem podle typu prostoru |
| `cenik.html` | Balíčky pro byty a domy i pro provozovny |
| `gdpr.html` | Zásady ochrany osobních údajů (text převzatý ze starého webu) |

## Složky

- `assets/css/styles.css` – veškeré styly, barvy jsou nahoře v `:root`
- `assets/js/site.js` – menu, načtení prohlídky po kliknutí, filtr referencí, předvyplnění formuláře, odkrývání při scrollu, náklon za kurzorem, otázky
- `assets/js/model.js` – 3D model bytu (dispozice, nábytek, kóty a informační body jsou nahoře v souboru)
- `assets/vendor/` – knihovna three.js (MIT)
- `assets/fonts/` – písmo Archivo (OFL), hostované lokálně
- `assets/img/` – fotky zmenšené pro web

## Před spuštěním na showspace.cz

- [ ] Doplnit ceny v `cenik.html` a `index.html` (hledat `X XXX Kč`) a potvrdit rozdělení balíčků
- [ ] Smazat poznámku „Návrh k doplnění“ v `cenik.html`
- [ ] Smazat `<meta name="robots" content="noindex, nofollow">` ve všech čtyřech stránkách
- [ ] Projít texty a příklady u informačních bodů v 3D modelu a odpovědi v sekci otázek
- [ ] Doplnit skutečné reference klientů (citace), až budou k dispozici
- [ ] Změřit rychlost úvodní stránky na živé adrese (PageSpeed Insights)
- [ ] Přidat soubor `CNAME` s obsahem `showspace.cz` a přepnout doménu v nastavení GitHub Pages
