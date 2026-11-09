# Stalni predsednički URL

## Aktuelno podešavanje — 9. novembar 2026.

Po zahtevu korisnika novi link je **`/president/zp/002/<12-karaktera>`**. Dvanaest nasumičnih slova/brojeva generiše se jednom i čuva u ignorisanom `server/private-access/predsednik-link.txt`. Ne ugrađuje se u javni kod, Git, manifest, logove ili cache. Ne postoji rok isteka; restart API-ja, promena JWT tajne i obnavljanje sesije ne menjaju link. Nema login formulara.

Na ovom računaru prethodno su nedostajali i predsednički nalog i zapis linka u praznoj lokalnoj bazi, kao i privatni fajl. Prethodni URL zato nije mogao da autentifikuje korisnika. Sama promena rute ne bi popravila nedostajuće podatke.

Jednokratno eksplicitno lokalno podešavanje, iz root-a:

```powershell
npm run setup:president
```

Komanda radi samo nad `mongodb://127.0.0.1:27017/zepter_management_demo` (ili istim URI-jem sa `localhost`) i lokalnim frontend-om, van produkcije. U praznoj bazi dodaje samo odobreni lokalni predsednički nalog sa nasumičnom, nesačuvanom lozinkom i lični link. Ne dodaje druge naloge, sektore, projekte ili istoriju. Ako odobreni predsednik već postoji, koristi njega. Zauzeta adresa drugog naloga ili deaktiviran predsednik zaustavljaju postupak bez njihove izmene.

**Ponavljanje čuva isti URL, hash, generaciju i sesije.** Sačuvani fajl se koristi i ako u bazi još nema zapisa linka. Postojeći opozvan/istekao link se ne aktivira ponovo. Ako u bazi već postoji drugi link ili nedostaje njegov privatni fajl, komanda odbija tihu zamenu. Namenska zamena/opoziv ostaju `president:link -- issue/revoke`.

Komanda nije deo instalacije, starta, build-a ili automatskih testova. Posle podešavanja uobičajeno se pokreću `npm run dev:server` i `npm run dev:client`. Link ostaje router basename za navigaciju, reload, komentarske deep linkove i obaveštenja.

Server i dalje proverava sačuvani hash, aktivni predsednički nalog, generaciju i opoziv; privatne API rute ostaju autorizovane. Uspešni ulasci više ne troše limit od 12 neuspešnih pokušaja u 15 minuta. Stari `/president-zp-<32-karaktera>` i fragment linkovi ostaju podržani. `format` može sačuvati prethodni ključ u novoj putanji bez promene pristupa; zato podržava i 32 karaktera. Poslovne šeme/statusi i telo auth zahteva nisu menjani; migracija postojećih podataka nije potrebna.

Za prenos **postojećih podataka** na drugi računar i dalje se prenose baza, `server/private-access` i privatni prilozi. Git ih namerno ne sadrži. `setup:president` nije vraćanje korisnika/poslovne istorije iz backup-a. Lokalni `localhost` URL radi na računaru na kome su pokrenuti servisi; udaljeni pristup zahteva poseban HTTPS deployment.

Provere ove izmene:

- 179 serverskih i 93 klijentska testa, uključujući novi URL, stare formate, deep linkove, više uređaja, više od 12 uspešnih otvaranja i negativne provere uloga/opoziva.
- 41 provera stvarnog CLI-ja, MongoDB-a i HTTP autentifikacije u zasebnoj bazi: isti link posle ponovnog povezivanja/restarta, ponavljanje podešavanja uz aktivnu sesiju, nedostajući fajl i očuvanje opoziva. Testne sesije su odjavljene; proverena testna baza i privremeni direktorijum su uklonjeni.
- Izolovanu proveru iz `server/` pokreće `ZEPTER_PRESIDENT_SETUP_TEST=1` uz `node tests/integration/president-setup-isolated.mjs`. Ne koristi demo bazu.
- Jednokratno podešavanje je primenjeno na potvrđenoj praznoj lokalnoj bazi: dodat je samo predsednički nalog i njegov link. Stvarni pokrenuti frontend/API prošli su 13 permalink/čitanje provera sa dva nezavisna uređaja; obe testne sesije su odjavljene.
- Browser: potvrđeni su ulazak bez formulara, početni pregled, navigacija na Moje komentare i instrukcije, reload te podstranice i povratak na početnu uz isti prefiks. Početni pregled je ostavljen otvoren korisniku. Ovo je uska provera pristupa na podrazumevanoj širini; ne zatvara ranije otvorene vizuelne/E2E provere ekrana, mobilni uređaj, push ili produkciju.
- Prošli su syntax check 109 JS fajlova, frontend/PWA build, bundle budžet i `git diff --check`. Privatni fajl i `.env` su ignorisani; nema commit-a/push-a.

## Istorija prethodnog formata i ranijih provera

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
