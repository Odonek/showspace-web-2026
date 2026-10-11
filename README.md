# ShowSpace – nový web (2026)

Zkušební verze nového webu showspace.cz. Živý web zůstává v repozitáři `ShowSpace-upgraded-web`.

Čisté HTML, CSS a JavaScript, bez build nástrojů. Pro náhled spusťte v této složce
`python3 -m http.server` a otevřete `http://localhost:8000` (3D model potřebuje server, ze souboru se nenačte).

## Stránky

| Soubor | Obsah |
| --- | --- |
| `index.html` | Pro makléře: klikací 3D model bytu řízený scrollem, hotová zakázka, co dostanou, služby a ceny, postup, další prostory, weby, otázky |
| `prostory.html` | Další prostory: všechny prohlídky s filtrem, fotografie, pro koho to je, služby a ceny pro provozy |
| `gdpr.html` | Zásady ochrany osobních údajů (text převzatý ze starého webu) |

## Složky

- `assets/css/styles.css` – veškeré styly, barvy jsou nahoře v `:root`
- `assets/js/site.js` – menu, prohlížeč prohlídek a fotek, filtr, přepínač „Co dostanete“, pás prohlídek, odkrývání při scrollu, oko v kontaktu
- `assets/js/model.js` – 3D model bytu (dispozice, nábytek, kóty a informační body jsou nahoře v souboru)
- `assets/vendor/` – knihovna three.js (MIT)
- `assets/fonts/` – písmo Archivo (OFL), hostované lokálně
- `assets/img/`, `assets/video/` – fotky a videa zmenšené pro web

## Před spuštěním na showspace.cz

- [ ] Doplnit ceny v `index.html` a `prostory.html` (hledat `X XXX Kč`) a potvrdit rozdělení balíčků
- [ ] Smazat poznámky „Návrh k doplnění“ (hledat `draft-note`)
- [ ] Smazat `<meta name="robots" content="noindex, nofollow">` ve všech stránkách
- [ ] Projít texty: příklady u informačních bodů v 3D modelu, odpovědi v sekci otázek, sekci o webech
- [ ] Doplnit skutečné reference klientů (citace), až budou k dispozici
- [ ] Změřit rychlost úvodní stránky na živé adrese (PageSpeed Insights)
- [ ] Přidat soubor `CNAME` s obsahem `showspace.cz` a přepnout doménu v nastavení GitHub Pages
