# ShowSpace – nový web (2026)

Zkušební verze nového webu showspace.cz. Živý web zůstává v repozitáři `ShowSpace-upgraded-web`.

Čisté HTML, CSS a JavaScript, bez build nástrojů. Pro náhled spusťte v této složce
`python3 -m http.server` a otevřete `http://localhost:8000` (3D model potřebuje server, ze souboru se nenačte).

## Stránky

| Soubor | Obsah |
| --- | --- |
| `index.html` | Pro makléře: 2D půdorys bytu 3+1 ve Svitavách, který se scrollem změní ve 3D model, co dostanou, balíčky SCAN a SKY s cenami, klientská platforma, pro koho to je, postup, další prostory, otázky |
| `prostory.html` | Další prostory: všechny prohlídky s filtrem, fotografie, pro koho to je, cena individuálně |
| `gdpr.html` | Zásady ochrany osobních údajů |
| `sluzby.html`, `galerie.html` | Přesměrování ze starých adres současného webu |
| `404.html` | Stránka pro neexistující adresy |
| `sitemap.xml`, `robots.txt` | Mapa webu a pokyny pro vyhledávače (počítají s adresou showspace.cz) |

## Složky

- `assets/css/styles.css` – veškeré styly; barvy a zaoblení tlačítek jsou nahoře v `:root`
- `assets/js/site.js` – menu, prohlížeč prohlídek a fotek, filtr, přepínač „Co dostanete“, pás prohlídek, odkrývání při scrollu, oko v kontaktu
- `assets/js/model.js` – 3D model (stěny odvozené z obrázku půdorysu, místnosti, kóty a informační body jsou nahoře v souboru)
- `assets/vendor/` – knihovna three.js (MIT)
- `assets/fonts/` – písmo Archivo (OFL), hostované lokálně
- `assets/img/` – fotky z vlastních zakázek zmenšené pro web

## Před spuštěním na showspace.cz

- [ ] Krok „Kam a kdy svítí slunce“ v úvodu: orientace bytu je odečtená z růžice na půdorysu (`NORTH_DEG` v `assets/js/model.js`), výšky oken jsou odhad. Zkontrolovat proti dráze slunce ve 3D půdorysu Giraffe360 a případně upravit
- [ ] Poslat zkušební poptávku z formuláře a ověřit, že dorazí e-mail (a zkontrolovat měsíční limit ve Formspree)
- [ ] Potvrdit, jestli jsou ceny v ceníku s DPH, nebo bez DPH, a doplnit to k cenám
- [ ] Potvrdit lhůtu dodání (na webu je 10 pracovních dnů, v business plánu 72 hodin)
- [ ] Potvrdit, co z klientské platformy už funguje (objednávky, podklady, leady, analytiky)
- [ ] Doplnit do kontaktu příjmení a přímé telefony nebo e-maily členů týmu
- [ ] Nahrát ukázku příspěvku na sítě a české video (hledat `show__todo`)
- [ ] Doplnit recenze z Googlu (potřeba odkaz na firemní profil nebo texty recenzí)
- [ ] Smazat `<meta name="robots" content="noindex, nofollow">` ve všech stránkách
- [ ] Nechat zkontrolovat `gdpr.html`; při přidání měření návštěvnosti nebo reklamních pixelů ho upravit
- [ ] Změřit rychlost úvodní stránky na živé adrese (PageSpeed Insights)
- [ ] Po spuštění přidat web do Google Search Console a odeslat `https://showspace.cz/sitemap.xml`
- [ ] Založit nebo aktualizovat Firemní profil na Googlu a zápis na Firmy.cz (stejný název, adresa a telefon jako na webu)
- [ ] Přidat soubor `CNAME` s obsahem `showspace.cz` a přepnout doménu v nastavení GitHub Pages
