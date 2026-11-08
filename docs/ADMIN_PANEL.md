# Administracija portala

Panel na `/admin` koristi postojeći beli i zlatni identitet, zajedničke vizuelne prelaze i jednu instancu svakog obrasca na svim širinama. Na telefonu je donja navigacija, a od 1024 px bočna. Nisu menjani poslovni podaci, lozinke ili predsednikov lični link.

- `/admin`: aktuelni brojači naloga/sektora, prijave na čekanju i sektori bez rukovodioca.
- `/admin/users`: pretraga, filteri statusa/uloge/sektora, paginacija i detalji naloga. Administrator eksplicitno bira konačnu ulogu i sektor registracije. Moguće je odbiti prijavu, ponovo razmotriti odbijenu, urediti ime/radno mesto/prava i deaktivirati ili reaktivirati postojeći nalog. Aktivacija koristi postojeću lozinku.
- `/admin/sectors`: dodavanje, pretraga, uređivanje naziva/opisa i aktivnog stanja sektora. Link vodi do njegovih korisnika, gde se dodeljuje rukovodilac. Deaktivacija je odbijena ako postoje aktivni nalozi ili otvoreni projekti. Istorija se ne briše.
- `/admin/audit`: paginirana istorija, sa filterom administratorskih/svih promena i oblasti. UI ne ispisuje sirove audit detalje, IP adrese ili kredencijale.

Administratorski i predsednički nalog imaju samo pregled. Nema dodele tih privilegovanih uloga kroz panel, menjanja tuđih lozinki, brisanja istorije ili otkrivanja predsedničkog URL-a. Novi zaposleni koriste postojeću registraciju.

## API i zaštite

Novi aditivni endpoint-i su `GET /api/admin/overview`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id` i `PATCH /api/admin/users/:id/activate`. Postojeće approve/reject/disable i sector/audit rute ostaju; korisnička lista aditivno prihvata `q` i `approval`. Registracije zadržavaju legacy limit 200 bez eksplicitne paginacije. Audit zadržava ranija polja odgovora i dobija filtere `entity` i `administrative=true`.

Svaki admin endpoint proverava ulogu. UI šalje opcioni `If-Match`; server radi compare-and-set i odbija zastarele izmene. Nejasan ishod upisa blokira novo slanje do eksplicitne provere servera. Otvoreni dijalozi i unos sektora upozoravaju na napuštanje neposlatih izmena; resize ne pravi novu formu. Važne promene statusa naloga imaju potvrdu.

Promena sektora blokirana je dok postoje članstva/odgovornosti u projektima, dodeljene aktivnosti ili ideje na razmatranju. Promena sektora i ukidanje rukovodeće uloge proveravaju otvorena predsednička zaduženja i zahteve. Ovo ne predstavlja automatsku migraciju poslovne istorije između sektora.

Rukovodeće mesto se zauzima atomski; konkurentno odobravanje ne može dodeliti istom sektoru dva rukovodioca. Neuspešan korisnički upis oslobađa samo novo zauzeto mesto. Administratorske izmene serijalizovane su u jednoj API instanci, uz verzionisane upise; nema distribuirane transakcije preko korisnika, sektora, sesija i audit-a. Posle prekida baze tokom višestrukog upisa proveriti trenutno stanje i audit pre ponavljanja.

Promena prava/statusa povećava korisnički `sessionVersion`, opoziva sesije i odspaja socket konekcije. Session model ima novo **opciono** polje `sessionVersion`: novoizdate sesije ga čuvaju, refresh proverava poklapanje. Time se odbija i stara sesija koju je konkurentan refresh napravio posle opoziva. Stare sesije bez polja tretiraju se kao verzija 0; korisnik sa već promenjenom verzijom mora se ponovo prijaviti. Migracija poslovnih dokumenata nije potrebna.

Socket događaji proveravaju aktuelni nalog, ulogu, sektor, verziju i istek pre isporuke. Administrator ima sopstvenu autorizovanu sobu za osvežavanje prijava i izmena; javna registracija ne dobija administrativne podatke. Postojeće provere predsedničkog linka ostaju aktivne.

## Provere i ograničenja

- 168 serverskih i 81 klijentski test; uključene pozitivne i negativne regresije uloga, potvrda registracije, aktiviranja, zaštite privilegovanih naloga, filtera i starih sesija.
- 29 provera stvarnog HTTP/MongoDB toka u novoj privremenoj bazi: promene uloga, konkurentno odobravanje rukovodilaca, zabrane prenosa dodela, deaktivacija/aktivacija, legacy i opozvane sesije, audit i očuvanje zapisa. Pokretanje iz `server/`: `ZEPTER_ADMIN_DB_TEST=1`, pa `node tests/integration/admin-isolated.mjs`. Skripta briše samo svoju potvrđenu nasumičnu testnu bazu i zatvara testni HTTP server.
- Live RBAC: 43 podprovere (44 sa roditeljskim testom), uključujući nove read-only admin endpoint-e i zabrane drugih uloga; testne sesije su odjavljene. Live poslovni upisi nisu izvršavani.
- Serverska sintaksa (99 fajlova), frontend/PWA build i Git diff provere.
- React SSR proverava rute, ulogu zaposlenog kao početni izbor registracije, odsustvo kontrola privilegovanih naloga i jednu instancu forme. To nije interaktivni browser test.
- Browser alat vraća „Local browser use is disabled in Work settings“. Vizuelna provera na telefonu/tabletu/desktopu, fokus/tastatura, potvrde dijaloga, stvarni resize i simulacija prekida mreže u browseru ostaju nepotvrđeni. Ranije otvorene provere drugih talasa nisu zatvorene.

Zastareli smoke-cleanup fixture usklađen je sa aktuelnim kompanijskim sektorima, adresama i odgovorima izveštaja; sva tri scenarija i dalje proveravaju odjavu sopstvenih sesija, uključujući neočekivano uspešnu prijavu i prekinut test. Poslovna baza nije menjana da bi test prošao.
