# ShowSpace – nový web (2026)

Zkušební verze nového webu showspace.cz. Živý web zůstává v repozitáři `ShowSpace-upgraded-web`.

Čisté HTML, CSS a JavaScript, bez build nástrojů. Pro náhled spusťte v této složce
`python3 -m http.server` a otevřete `http://localhost:8000` (3D model potřebuje server, ze souboru se nenačte).

## Stránky

| Soubor | Obsah |
| --- | --- |
| `index.html` | Pro makléře: klikací 3D model podle půdorysu zakázky Houseboat Praha, hotová zakázka, co dostanou, měsíční předplatné, postup, další prostory, otázky |
| `prostory.html` | Další prostory: všechny prohlídky s filtrem, fotografie, pro koho to je, cena individuálně |
| `gdpr.html` | Zásady ochrany osobních údajů |
| `sitemap.xml`, `robots.txt` | Mapa webu a pokyny pro vyhledávače (počítají s adresou showspace.cz) |

## Složky

- `assets/css/styles.css` – veškeré styly, barvy jsou nahoře v `:root`
- `assets/js/site.js` – menu, prohlížeč prohlídek a fotek, filtr, přepínač „Co dostanete“, pás prohlídek, odkrývání při scrollu, oko v kontaktu
- `assets/js/model.js` – 3D model (dispozice, nábytek, kóty a informační body jsou nahoře v souboru)
- `assets/vendor/` – knihovna three.js (MIT)
- `assets/fonts/` – písmo Archivo (OFL), hostované lokálně
- `assets/img/` – fotky z vlastních zakázek zmenšené pro web

## Před spuštěním na showspace.cz

- [ ] Doplnit ceny předplatného v `index.html` (hledat `X XXX Kč`) a potvrdit názvy a počty nemovitostí v balíčcích
- [ ] Smazat poznámku „Návrh k doplnění“ (hledat `draft-note`)
- [ ] Nahrát české video s AI komentářem a vložit ho do přepínače „Co dostanete“ (hledat `show__todo`)
- [ ] Potvrdit seznam „Na přání k tomu přidáme“ podle toho, co máte v tarifu Giraffe360
- [ ] Smazat `<meta name="robots" content="noindex, nofollow">` ve všech stránkách
- [ ] Po spuštění přidat web do Google Search Console a odeslat `https://showspace.cz/sitemap.xml`
- [ ] Založit nebo aktualizovat Firemní profil na Googlu a zápis na Firmy.cz (stejný název, adresa a telefon jako na webu)
- [ ] Nechat zkontrolovat `gdpr.html`; při přidání měření návštěvnosti nebo reklamních pixelů ho upravit
- [ ] Změřit rychlost úvodní stránky na živé adrese (PageSpeed Insights)
- [ ] Přidat soubor `CNAME` s obsahem `showspace.cz` a přepnout doménu v nastavení GitHub Pages
