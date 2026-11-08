# Rukovodilac — četvrti talas: priprema izveštaja i ideje sektora

Datum: 8. novembar 2026. Grana `develop`; bez commit-a ili push-a.

## Ekrani i reference

| Ekran | Ruta | Referenca |
|---|---|---|
| 7. Kreiranje izveštaja | `/reports/new?type=daily` / `?type=weekly&day=YYYY-MM-DD` | [Mobilna referenca](design/manager/07-report-editor.png) |
| 8. Ideje zaposlenih | `/ideas` | [Mobilna referenca](design/manager/08-employee-ideas.png) |

Nova forma izveštaja koristi se i na `/reports/:id`: nastavlja nacrt ili prikazuje zaključan objavljen izveštaj. Druge uloge zadržavaju prethodne ekrane. Detalji/odluka o ideji i rukovodiočeva obaveštenja ostaju sledeći talas, prema novim referencama.

Mobilni raspored prati dostavljenu belu/zlatnu osnovu. Polja sažetka odmah su dostupna umesto posebnog „Uredi“ dugmeta za svako polje. Model nema avatar: kartice prikazuju inicijale i stvarno ime autora, bez izmišljenih fotografija. Brojevi, nazivi i datumi dolaze iz API-ja.

## Priprema i objavljivanje izveštaja

- Izbor dnevnog/nedeljnog tipa i datuma koristi `Europe/Belgrade`, nedelja ponedeljak–nedelja. Promena perioda otvara drugi kontekst; nesačuvan sažetak štiti postojeći dijalog za napuštanje forme i `beforeunload`.
- Otvaranje forme ne upisuje podatke. Postojeći nacrt istog tipa/perioda nastavlja se sa sačuvanim tekstom i automatskim podacima. Objavljen sadržaj je zaključan; na `/reports/new` ostaje izbor drugog perioda.
- Automatski pregled prikazuje projekte, napredak, brojače i sklopive stvarne dnevne unose. Rezultati, problemi/rizici i naredni koraci su opciona dopuna rukovodioca, do postojećih 8000 znakova po polju. Evidencije nije potrebno ponovo kucati.
- „Sačuvaj nacrt“ čuva dopunu i osvežava automatske podatke. „Objavi izveštaj“ prvo čuva novi/izmenjeni nacrt, zatim objavljuje njegovu sačuvanu verziju. Ako druga faza ne uspe, nacrt ostaje sačuvan i UI navodi da objava nije potvrđena.
- Zahtevi su zaključani dok traju. Greška zadržava unos; zastarela verzija vraća 409. „Proveri sačuvan izveštaj“ preuzima stanje radi poređenja, bez automatskog prepisivanja lokalnog unosa. Preuzimanje sačuvane verzije traži izričitu akciju korisnika. Uslovni zahtevi štite i ponavljanje posle nejasnog ishoda.
- Jedan atomski prelaz iz `draft` u `published` sprečava duplu objavu. Predsednik zatim može pročitati izveštaj i dobija postojeće obaveštenje; nisu dodati novi kanali obaveštenja.

Postojeći agregator ne izračunava istorijsko stanje projekata na kraju izabranog perioda. Broj projekata, završenih/zakašnjelih aktivnosti i napredak opisuju stanje pri pripremi/čuvanju/objavi. Dnevni unosi filtriraju se po izabranom periodu. UI to razdvaja i ne tvrdi da su sve trenutno završene aktivnosti završene u tom periodu. Objavljeni pregled koristi sačuvani snapshot. Broj ideja na pregledu je jasno označen kao trenutno stanje. Starijem izveštaju bez `generated` podataka ne pripisuje se današnji pregled kao da je sačuvan prilikom objave.

## Ideje zaposlenih

Lista i svi brojači ograničeni su na sektor sesije. Tri kartice prikazuju ukupan broj ideja, razmatranje i doradu. Filteri su „Sve“, „Na razmatranju“, „Na doradi“ i „Prosleđene predsedniku“, sa globalnim sektorskim brojačima. `submitted` i `in_review` zajedno pripadaju razmatranju; statusi nisu menjani.

Kartica prikazuje stvaran naziv, autora, pun datum sa godinom, status i sažetak opisa. Cela kartica otvara postojeće detalje ideje. Paginacija učitava po 10 stavki, nezavisno od globalnih brojača. Stare prečice `?status=submitted` i dalje otvaraju razmatranje. Postojeća mogućnost rukovodioca da predloži svoju ideju sačuvana je kroz pomoćni link.

## API dopune i kompatibilnost

Modeli, indeksi, nazivi statusa i tela postojećih zahteva nisu menjani; nema migracije ili promene demo naloga.

- Novi `GET /api/reports/prepare?type=weekly&day=YYYY-MM-DD`: samo manager sa sektorom, read-only, `no-store`. Vraća `{report, generated, period:{type,start,end}, sector:{_id,name}}`. Sektor dolazi isključivo iz sesije; postojeći period nastavlja se bez upisa.
- `POST /api/reports` uz opcioni `If-None-Match: *`: postojeći period vraća 409 umesto prepisivanja. Postojeći jedinstveni indeks štiti i trku pri kreiranju.
- `POST /api/reports` i `PATCH /api/reports/:id` uz opcioni `If-Match: "<updatedAt ISO>"`: provera verzije i atomski uslov `draft + updatedAt`, 409 kod konflikta. POST osvežava automatske podatke; PATCH zadržava postojeći snapshot.
- `POST /api/reports/:id/publish` uz opcioni `If-Match`: ponovo generiše automatske podatke i koristi atomski uslov `status:draft`, uz verziju kada je poslata. Samo pobednički prelaz pravi audit/obaveštenje.
- Novi `GET /api/ideas/sector?tab=all&page=1&limit=10`: samo manager sa sektorom, `no-store`. Podržani tabovi su `all`, `review`, `revision`, `forwarded`. Odgovor: `{items,total,page,limit,stats:{total,review,revision,forwarded}}`. Svi upiti koriste sektor sesije; sort je `createdAt` i `_id` opadajuće.

Stari klijenti bez novih zaglavlja ostaju podržani i imaju raniju semantiku prepisivanja nacrta. POST/PATCH proveravaju `draft` i u trenutku upisa; objava sprečava ponovno objavljivanje. Zaštita od međusobnog prepisivanja dve izmene istog nacrta zahteva `If-Match`, koji nova forma uvek šalje. Stari `/ideas` feed dodatno odbija rukovodioca bez sektora pre upita. Prava drugih uloga nisu proširena.

## Tablet i desktop

Jedna instanca forme ostaje na svim širinama. Tablet od 768 px dobija veće razmake i kartice; postojeći workspace prikazuje bočnu navigaciju od 1024 px. Od 1200 px automatski podaci/projekti su levo, sažetak/akcije desno, a ideje imaju dve kolone. Mobilni redosled je pregled → sažetak i akcije → projekti. Nema JavaScript grananja po širini ili remount-a forme pri resize-u.

## Provere i ograničenja

| Provera | Rezultat |
|---|---|
| `npm run test:client` | 24/24; sačuvani tekst, uslovni zahtevi i statusni linkovi. |
| `npm run test:server` | 67/67; priprema, sektorske granice, generisanje, zaštita verzije/konkurentnog upisa, jednokratna objava, predsednikov pristup, stari PATCH i ideje/brojači. |
| `npm run test:rbac` | 39/39 live podprovera, 40 sa roditeljskim testom; nove rute za sve uloge, lažni sektor i read-only priprema. Testne sesije odjavljene. |
| Izolovani API tok | Prošao `manager-wave04-check.mjs`: novi/postojeći nacrt, nedeljni period, stale/duplicate 409, objava/zaključavanje, ideje i brojači/paginacija/strani sektor. |
| `npm run smoke:demo` | 15/19; ista četiri poznata neuspeha: već odobren kandidat i odsutne očekivane dnevne evidencije kompanije/sektora. Podaci nisu menjani radi testova. |
| `npm run check:server` | Prošla sintaksa 53 JS/MJS fajla, uključujući dodatne QA kontrole. |
| `npm run build:client` | Prošao React/PWA build. |

Prvi browser pokušaji bili su prekinuti jer Windows Computer Use nije mogao pouzdano da utvrdi URL. Nakon korisnikovog osvežavanja sesija, 8. novembra, pristup je proradio i izvršena je naknadna provera oba nova ekrana u Chrome-u sa izolovanim fixture-om:

- Vizuelno pregledani mobilni prikazi 320/390 px, tablet 820 px i desktop 1440 px. Potvrđeni su donja/bočna navigacija, jedna/dve kolone, polja sažetka, kartice i statusi.
- Započet tekst ostao je u istoj formi pri promeni 390 → 820 → 1440 → 320 → 390 px. Promena tipa sa nesačuvanim tekstom otvorila je dijalog koji staje u 320 px; „Ostani ovde“ sačuvao je unos.
- Kroz mobilni UI sačuvan je nacrt, zatim objavljen; prikazani su uspeh, sačuvani tekst i zaključan sadržaj bez akcije za ponovnu objavu. Upisi su samo u memoriji fixture-a.
- Provereni su filteri dorade i prosleđenih ideja, nepromenjeni globalni brojači, otvaranje tačne ideje i povratak na prethodni filter.
- Ispravljene su dve CSS greške pronađene pregledom: ikonica uz napredak više ne raste zajedno sa tekstom; duža statusna oznaka ideje može da se prelomi. Ispravke su ponovo pregledane, a React/PWA build ponovo prolazi.

Nisu sačuvani screenshot fajlovi. U fixture-u je zabeležen razvojni Vite WebSocket fallback; produkcioni build prolazi. Pri završnom povratku na `localhost:5173` u prvoj proveri alat je ponovo prekinuo kontrolu zbog nepouzdanog utvrđivanja URL-a. Naknadna dopuna ispod proverava preostale osnovne browser scenarije. Pravi telefon, PWA instalacija, mobilna tastatura, Web Push i pun pregled pristupačnosti ostaju zasebne provere.

### Dopunska završna provera istog talasa

Izvršena je dodatna browser provera na 390 px, sa `ZEPTER_UI_FIXTURE=1`, `ZEPTER_UI_ROLE=manager` i opcionim `ZEPTER_UI_QA=1`. Taj režim postoji samo u testnom serveru, dodaje 12 ideja u memoriji i omogućava eksplicitne simulacije grešaka. Ne menja produkcioni API, modele ili demo bazu.

| Scenario u browseru | Stvarni rezultat |
|---|---|
| Ideje sa 16 stavki | Prva/druga stranica prikazuju različite stavke; globalni brojači ostaju 16 ukupno / 14 na razmatranju, kraj liste onemogućava sledeću stranicu. |
| Prazan sektor ideja, dok je otvorena druga stranica | Prikazano jasno prazno stanje i nule; URL se vraća na prvu stranicu. Vraćanje normalnog odgovora ponovo prikazuje podatke. |
| HTTP 503 pri učitavanju ideja | Poruka greške i „Pokušaj ponovo“; uspešan retry vraća svih 16 stavki/brojače. |
| HTTP 503 pri pripremi izveštaja | Poruka greške i uspešan retry; i usporeni odgovor uspešno učitava obrazac. |
| HTTP 503 pre čuvanja nacrta | Rezultati i naredni koraci ostaju u poljima; prikazana je greška, bez lažnog uspeha. |
| Sačuvan nacrt, izgubljena potvrda odgovora | UI zadržava tekst; ponovni klik dobija 409 umesto novog zapisa. „Proveri sačuvan izveštaj“ prikazuje stvaran nacrt radi poređenja. |
| Preuzimanje sačuvane verzije | Dugme se bira tastaturom i aktivira Enter-om; promena se primenjuje tek posle izričite akcije. |
| Druga sesija promeni nacrt, zatim lokalni save | 409 ostavlja lokalni tekst; poređenje prikazuje oba različita teksta. Izričito preuzimanje novije verzije usklađuje formu. |
| HTTP 503 pri objavi | Jasno piše da je nacrt sačuvan i da objava nije potvrđena; API potvrđuje status `draft`. |
| Refresh posle neuspešne objave | Nastavlja isti nacrt, sa istim rezultatima/narednim koracima; ne pravi novi zapis. |
| Ponovna objava posle oporavka | Uspeh i zaključan sadržaj; dodatna API provera potvrđuje tačno jedan zapis za period i oba očekivana teksta. |
| Prelaz sa objavljene nedelje na dnevni tip | Otvara zaseban nov dnevni kontekst sa praznim sažetkom i ispravnim jednim datumom. |

Za ovu dopunu nisu bile potrebne funkcionalne izmene aplikacije; samo su gramatički usklađeni nazivi pri učitavanju. Ponovo prolaze 24 klijentska, 67 serverskih i 39 live RBAC podprovera (40 sa roditeljskim testom), sintaksa i build. Smoke ponovo daje istih 15/19, sa četiri već poznate neusaglašenosti demo podataka. Nije nađen blokirajući problem za nastavak na rukovodiočeve ekrane 9–10. Ovo je procena spremnosti ovog razvojnog talasa, bez tvrdnje da je kompletna aplikacija spremna za produkciju.

Pomoćni `server/tests/fixtures/manager-ui-qa.mjs` pre svake akcije proverava dummy token i manager ulogu na fiksnom loopback portu. Komande `ideas-empty`, `ideas-normal`, `ideas-error`, `prepare-error`, `prepare-delay`, `save-error`, `save-lost`, `race`, `publish-error`, `assert-draft` i `assert-published` namenjene su ponavljanju opisanih provera. Komande `race`, `assert-draft` i `assert-published` koriste testnu nedelju 16–22. novembra. Posle rada obavezno ugasiti fixture komandom `stop`.

Upisi su izvršeni isključivo u fixture modelima u memoriji, bez MongoDB veze. Fixture je ugašen komandom `stop`, uz čišćenje sopstvenih privremenih priloga; postojeći Vite server korisnika nije gašen. Live prijave standardno ažuriraju `lastLoginAt` i sesije. Poslovni podaci, nalozi i lozinke nisu resetovani ili menjani.

## Ponovljiva izolovana provera

Svež fixture iz `server/`, u prvom terminalu:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
$env:ZEPTER_UI_ROLE = 'manager'
node tests/fixtures/employee-ui-server.mjs
```

U drugom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/manager-wave04-check.mjs
```

Runner pre upisa proverava dummy fixture token i manager ulogu; koristi fiksni `127.0.0.1:4002`. Posle provere ukucati `stop` u fixture terminalu. Kroz agentski terminal koristiti `tty:true`.

Za buduću browser proveru potreban je Vite na 5173. Otvoriti `http://127.0.0.1:4002/reports/new?type=weekly&day=2026-11-15` i `/ideas`, na 320/390/820/1440 px. Proveriti nov/prazan/objavljen izveštaj, promenu perioda sa započetim tekstom, grešku čuvanja/objave, zastarelu verziju, unos pri resize-u, filtere, paginaciju, otvaranje ideje i tastaturu. Runner čini testni izveštaj objavljenim; za browser pisanje pokrenuti nov fixture.
