# Stalni predsednički URL

Predsednički ulaz sada ima format `/president-zp-<nasumični-deo>`, kao normalna putanja bez fragmenta. Tačan lokalni URL ostaje u ignorisanom `server/private-access/predsednik-link.txt`. Ne kopirati njegovu vrednost u dokumentaciju, kod, logove ili Git.

URL ostaje u adresnoj traci i služi kao React Router basename: projekti, aktivnosti, ideje, komentari, filteri i direktni linkovi zadržavaju isti lični prefiks. Ponovno otvaranje celog URL-a ili osvežavanje podstranice pokreće proveru istog ključa i čuva odabrani sadržaj/query/sidro. Može se sačuvati u omiljene i otvoriti na drugom uređaju bez prethodnog cookie-a.

Predsednik nema login formular, meni naloga ili odjavu. Server i dalje proverava postojeći hash, generaciju, nalog i opoziv, pa obezbeđuje API pristup u pozadini. Ako redovno osvežavanje pristupa istekne na ovom URL-u, frontend ponovo proverava lični ključ bez formulara. Ne ponavlja poslovni upis. Pogrešan/opozvan ključ i deaktiviran nalog ne dobijaju pristup.

Sačuvan je postojeći kriptografski ključ od 32 base64url znaka, bez promene naloga, lozinki, generacije ili otvorenih korisničkih sesija. Promenjen je samo format privatnog URL fajla. Stari `/predsednik#...` i `/president#...` ulazi ostaju kompatibilni. Nema izmene MongoDB šeme, statusa ni API ugovora.

## Operaterske komande

Iz root-a, formatiranje postojećeg privatnog fajla bez MongoDB konekcije:

```powershell
npm --prefix server run president:link -- format
```

Formatiranje je idempotentno i zamenjuje fajl atomskim rename-om tek nakon potvrđenog pisanja privremenog fajla. `--file drugi.txt` bira drugi fajl unutar istog privatnog direktorijuma. Postojeći `issue` i `revoke` ostaju eksplicitne operaterske akcije: issue sada zapisuje novi URL format, a zamena/opoziv i dalje namenski poništavaju stare pristupe.

Lični URL predstavlja poverljiv pristupni link. Dokument postavlja `no-referrer` i `noindex,nofollow`; [MDN opisuje sprečavanje prosleđivanja URL-a kroz Referer](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/referrer). Hosting treba da zadrži postojeći SPA fallback za duboke rute i izostavi ovakve putanje iz access/analytics logova. Prilozi i API ostaju iza autorizacije; service worker ne kešira poslovne odgovore. Klik na obaveštenje u već otvorenom predsedničkom prozoru čuva lični prefiks. Manifest ostaje generički i ne sadrži ključ.

## Provere

- Client: **74/74** — novi trajni URL, ponovno otvaranje nezavisno od uređaja, duboke rute i sidra, odbijanje pogrešnog formata, scoped navigacija i odsustvo odjave/login menija.
- Server: **142/142** — postojeće granice uloga, više uređaja, opoziv i rate limit; novi formatter i stvarna CLI provera u privremenom folderu sa nedostupnom MongoDB adresom potvrđuju rad bez baze, idempotentnost i odsustvo ključa u izlazu.
- Sintaksa: **88 JS fajlova**; frontend i service worker build prolaze.
- Stvarni lokalni frontend/API: **13 provera**, uključujući osnovni i dva duboka URL-a, no-referrer dokument, dva nezavisna klijenta bez Cookie zaglavlja i ovlašćeno čitanje pregleda. Obe testne sesije odjavljene; poslovni podaci nisu upisivani. Lokalni privatni fajl je preformatiran, bez ispisa URL-a/ključa.
- Browser kontrola ponovo je odbijena porukom `Local browser use is disabled in Work settings`. HTTP/SSR provere potvrđuju servis, parsing i linkove, ali interaktivni browser tok, automatski oporavak isteka i fizičko push/PWA otvaranje nisu proglašeni vizuelno/E2E potvrđenim. Ranije otvorene provere ostaju otvorene.

Živa provera je eksplicitna: iz `server/`, postaviti `ZEPTER_PRESIDENT_URL_CHECK=1` i pokrenuti `node tests/integration/president-permalink-check.mjs`. Koristi već pokrenute lokalne servise, pravi samo sopstvene auth sesije i odjavljuje ih. `president-read-check.mjs` razume i raniji i novi format privatnog fajla. Seed i sadržaj sektora/zaposlenih nisu menjani ovim zadatkom.
