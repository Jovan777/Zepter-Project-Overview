# Predsednik — prvi talas, 8. novembar 2026.

## Obuhvat i interfejs

Implementirani su početni pregled kompanije i pregled sektora prema dve dostavljene mobilne reference, zatim tablet/desktop raspored. Iste komponente koriste donju navigaciju ispod 1024 px, bočnu od 1024 px i kolone od 1200 px. Desktop nema telefonski okvir.

**Predsednik otvara lični link i dolazi direktno na početni pregled. Nema login formular, meni naloga ni dugme za odjavu, ni na telefonu ni na desktopu.** Isti link radi na novom uređaju i pri ponovnom otvaranju na već otvorenoj stranici. Ostale uloge zadržavaju svoj pristup.

- Početna: aktivni projekti, pitanja za reakciju, dnevni/nedeljni pregled kompanije, važna pitanja i svi sektori. Broj aktivnih projekata otvara upravo aktivne projekte.
- Sektor: sektorski dnevni/nedeljni pregled, komentar ili instrukcija rukovodiocu, prethodni razgovor, statistika i projekti. Kartice koriste stvarnu odgovornu osobu, broj članova, status, napredak, poslednje ažuriranje i broj projektnih komentara. Model nema ime tima; timovi se ne izmišljaju.
- Razgovor je sklopljen po potrebi. Podržani su odgovori, status instrukcije, zaštita neposlatog unosa i provera nejasnog ishoda bez automatskog ponovnog slanja. Provera ishoda otvara istoriju razgovora.
- Projekti imaju tekući/svi prikaz, doslovnu pretragu i paginaciju. Promena pretrage, stranice ili širine ne menja instancu razgovora.
- Lista sektora, važnih pitanja i postojeća lista projekata služe kao pomoćna odredišta. Detalji projekta/aktivnosti i konačni predsednički dizajn izveštaja čekaju naredne reference; njihove postojeće rute ostaju povezane.

Izveštaji se automatski otvaraju u odgovarajućem kontekstu kompanije/sektora i dnevnog/nedeljnog perioda. Lista objavljenih izveštaja prati sektor i tip. Brojači iz postojećeg generatora označeni su kao trenutno stanje, odvojeno od rezultata perioda. Objedinjeni pregled prikazuje rezultate, probleme i naredne korake iz objavljenih sektorskih izveštaja.

## API i brojači

Nove read-only rute, samo za president:

| Ruta | Odgovor / parametri |
|---|---|
| GET /api/dashboard/president | stats, attention, sectors; q, sectorPage, attentionPage |
| GET /api/dashboard/president/attention | items, total, page, limit; opcioni sectorId |
| GET /api/sectors/:id/president | sector, stats, attention |
| GET /api/sectors/:id/president/projects | items, total, page, limit; tab=current/all, q |

GET /api/projects prihvata opcioni activeOnly=1 bez zaobilaženja granica sektora/članstva. Postojeći pozivi i statusi ostaju kompatibilni.

Aktivni su active, at_risk i on_hold; tekući uključuju planned. Prosek računa tekuće nearhivirane projekte. Ako ih nema, API vraća avgProgress=null, a UI crticu.

Važna pitanja koriste isti izvor za listu i brojače kompanije/sektora:

1. Otvoreni zahtevi za odluku.
2. Blokirana zaduženja.
3. Nearhivirani tekući projekti sa ugroženim ili prošlim rokom.
4. Blokirane/zakasnele nezavršene aktivnosti ostalih tekućih projekata.

Aktivnost već ugroženog projekta ne pravi drugi projektni alarm. Zatvoreni/arhivirani projekti ne doprinose alarmima aktivnosti. Novo zaduženje čeka rukovodioca i nije predsednikova nerešena odluka. Otvorena instrukcija koja čeka odgovor ostaje u razgovoru/istoriji.

Rokovi koriste početak dana Europe/Belgrade. Pretraga je do 160 znakova i tretira regex znakove doslovno. Liste su paginirane; brojači nisu ograničeni prvom stranicom. Odvojeni upiti nisu transakcioni snapshot; promene se učitavaju preko postojećih događaja.

## Lični link — operatersko podešavanje

**Naknadno ažuriranje:** novi stalni URL je `/president-zp-<nasumični-deo>` i ostaje basename tokom navigacije. Postojeći lokalni fajl preformatiran je bez promene ključa/sesija; [aktuelni postupak i provere](PRESIDENT_PERSONAL_URL.md). Opis fragmenta ispod ostaje dokumentacija kompatibilnog ranijeg ulaza.

Link ima 32 nasumična base64url znaka iz 24 kriptografski nasumična bajta. Ključ je u fragmentu, a ne u putanji ili query parametrima. Frontend ga skida pre router-a i šalje u telu POST /api/auth/president-link. Ponovljena fragment navigacija ponovo pokreće isti postupak.

Server proverava hash, generaciju, opoziv i postojeći odobreni predsednički nalog, pa u pozadini uspostavlja sesiju. Access token ostaje u memoriji; refresh u HttpOnly cookie-u. Ključ/token ne ide u localStorage, kod ili log.

Isti ključ radi dok ga administrator ne zameni/opozove; podrazumevano nema rok isteka. Sama ruta ne daje prava. Posedovanje celog linka daje predsednički pristup, pa se čuva kao poverljiv podatak. Ovo je po korisnikovom izboru višekratni pristup, a ne jednokratni email magic link. Principi zaštite bearer pristupa: [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750), [OWASP OAuth2 smernice](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html); ovaj prilagođeni tok nije OAuth implementacija.

Za postojeći odobreni predsednički nalog, iz root-a:

```powershell
npm --prefix server run president:link -- issue predsednik@demo.zepter.test
```

Link je u server/private-access/predsednik-link.txt; sadržaj se ne ispisuje. Fajl/folder su ignorisani u Gitu. Otvoriti fajl lokalno i koristiti ceo link. Na udaljenom/produkcionom origin-u obavezan je HTTPS; link se izdaje za postojeći CLIENT_ORIGIN.

Komanda ne prepisuje postojeći izlazni fajl. Za namernu zamenu iz server foldera:

```powershell
node src/scripts/president-link.js issue predsednik@demo.zepter.test --file predsednik-novi.txt
```

Opoziv, iz root-a:

```powershell
npm --prefix server run president:link -- revoke predsednik@demo.zepter.test
```

Zamena/opoziv blokiraju ranije link JWT-ove i refresh sesije. Svaki izlazni socket događaj lične sesije proverava nalog/link pre slanja; nevažeća veza se prekida. Važeća istekla socket sesija se u pozadini obnavlja; pri neuspehu prikazuje se ulaz za lični link. Predsednik nema odjavu u UI-ju; operaterski opoziv je administrativna radnja.

Dodati su PresidentAccessLink kolekcija i opciona Session.presidentLink/presidentLinkGeneration polja. Poslovne šeme, nalozi, lozinke i statusi nisu menjani. Postojeće obične sesije rade bez novih polja; nema migracije poslovnih dokumenata.

## Izvršene provere

- Server: 99/99, uključujući pristup sa više uređaja, rotaciju, opoziv, deaktivaciju/promenu uloge, origin zaštitu, rate limit i socket dostavu.
- Client: 43/43, uključujući skidanje fragmenta i odsustvo predsedničke odjave/menija, uz očuvanje odjave drugih uloga.
- Serverska sintaksa i produkcioni frontend/PWA build: prolaze.
- Izolovani HTTP scenario: 46 provera, stvarne auth rute i JWT/cookie, brojači, filter aktivnih projekata, paginacija, pretraga, odredišta alarma, negativne uloge i instrukcija → odgovor rukovodioca.
- Lokalni demo API: 35 provera čitanja i novog pristupa; sopstvena testna sesija odjavljena. Poslovni podaci nisu menjani. Eksplicitno izdat lokalni link za postojeći predsednički nalog.
- Browser: oba ekrana na 320/390/820/1440 px bez horizontalnog prelivanja; jedna forma, unos sačuvan pri resize-u/straničenju; zaštita izlaska; instrukcija i odgovor; četiri ulaza u dnevni/nedeljni pregled kompanije/sektora; prazne liste/pretrage i sektor bez projekata; greška/oporavak; izgubljena potvrda komentara bez dupliranja; reconnect sa očuvanjem unosa i prijemom novog odgovora.
- Browser: ponovo otvoren isti link, odbijen nevažeći ključ, uklonjen fragment; ulaz bez sesije bez login formulara. Na telefonu i desktopu potvrđeno odsustvo odjave/menija naloga.
- git diff --check i ignorisanje privatnog fajla provereni. Testni fixture se gasi sa stop i briše sopstvene priloge.

Izolovani server iz server foldera: ZEPTER_UI_FIXTURE=1, ZEPTER_UI_ROLE=president, ZEPTER_UI_QA=1, pa node tests/fixtures/employee-ui-server.mjs. Nema MongoDB veze. Testni ključ je samo u fixture-u. HTTP scenario: ZEPTER_UI_FIXTURE=1 pa node tests/fixtures/president-wave01-check.mjs. president-ui-qa.mjs podržava home-error, comment-lost, socket-reconnect, reply. Ugasiti fixture posle provere.

Opciona živa provera iz server foldera: ZEPTER_PRESIDENT_READ_CHECK=1 pa node tests/integration/president-read-check.mjs. Čita privatni lokalni fajl bez ispisa ključa, proverava samo čitanje i odjavljuje sopstvenu testnu sesiju.

Granice: pisanje u browseru provereno je u memoriji, ne kao MongoDB transakcioni/konkurentni test. Na demo bazi provereni su čitanje i auth. Stvarni telefon, offline ponašanje, produkcioni HTTPS, deljenje linka stvarnom predsedniku i više API instanci nisu potvrđeni. Raniji demo smoke nije ponovljen niti stari neuspeh proglašen prolaznim.
