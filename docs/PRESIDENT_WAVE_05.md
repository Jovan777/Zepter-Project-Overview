# Predsednik — peti talas: Moji komentari i instrukcije

## Obuhvat

Ekran 9 je povezan sa postojećom rutom `/my-comments` i predsedničkom navigacijom. Mobilni raspored prati dostavljenu referencu: naslov, tri brojača, filteri i kartice sopstvenih poruka sa statusom i poslednjim odgovorom. Ista komponenta koristi zajednički shell na tabletu i desktopu; od 1200 px kartice prelaze u dve kolone. Tekst poruke ima veći font, a filteri dodirnu visinu najmanje 44 px. Ne uvode se formular prijave, meni naloga ili odjava predsednika.

- Brojači „Ukupno“, „Čeka odgovor“ i „Odgovoreno“ obuhvataju celu dostupnu istoriju, nezavisno od stranice i filtera. Klik na brojač bira odgovarajući status svih nivoa.
- Status i nivo mogu se kombinovati. Sektor, projekat, aktivnost i ideja su stalno dostupni; postojeća zaduženja i zahtevi pojavljuju se kao dodatni nivoi kada imaju poruke.
- Kartica prikazuje stvarni naziv cilja, datum u `Europe/Belgrade`, poruku i poslednji direktan odgovor drugog autora iz istog razgovora. Inicijali dolaze iz stvarnih podataka; model nema fotografije korisnika.
- Odgovor mora imati `parent` te konkretne poruke i isti cilj. Predsednikova sopstvena dopuna i komentar koji samo pripada istom projektu ne predstavljaju tuđi odgovor. Sačuvani stari `answered` bez dostupnog odgovora dobija objašnjenje umesto izmišljenog teksta.
- `resolved` je posebno stanje i čuva prethodni odgovor. Obrisani cilj ostaje kao istorija sopstvene poruke sa statusom `unavailable`, bez neispravnog linka. Ove kategorije imaju zasebne filtere kada postoje i ne ulaze u „Čeka odgovor“ ili „Odgovoreno“.
- Postojeća neprosleđena ideja isključena je iz celog odgovora i brojača. Ranija poruka na ideji ne daje dozvolu za njen privatni sadržaj.
- Klik otvara odgovarajući sadržaj uz `commentId` i postojeće sidro razgovora. Postojeći `focus` pronalazi i označava konkretnu poruku na njenoj stvarnoj stranici, uključujući zaduženja i zahteve.
- URL čuva filtere i stranicu. Lista ima po osam poruka, paginaciju, učitavanje, prazan rezultat, oporavak greške i oporavak prazne poslednje stranice. Prethodni odgovor za drugi filter ne prikazuje se kao novi rezultat. Postojeći događaji osvežavaju istoriju posle odgovora/rešavanja.

## API i kompatibilnost

Novi read-only `GET /api/comments/mine/president` dostupan je samo predsedniku. Autor se uvek uzima iz sesije; query `author` ili `userId` ne bira drugog korisnika. Parametri su `status=all/open/answered/resolved/unavailable`, `targetType=all/sector/project/activity/idea/assignment/request` i `page`, sa fiksnim `limit=8`.

Odgovor sadrži `items`, `total`, `page`, `limit`, `stats` i potvrđene `filters`. Kartica nosi `_id`, `kind`, `status`, `createdAt`, `targetType`, javni kontekst cilja, link, skraćenu poruku i skraćeni poslednji odgovor. Autor odgovora sadrži samo ID, ime, prezime i ulogu. Ne vraćaju se mejl, pristupni podaci, interni audit ili prilozi.

Metapodaci se čitaju u grupama radi istih filtera i brojača; puni tekstovi i imena učitavaju se samo za izabranu stranicu. Postojeći `/comments/mine/instructions` zadržava ugovor. MongoDB šeme, poslovni statusi, autentifikacija, odluke i dozvole uređivanja nisu menjani. Nema migracije ili izmene demo poslovnih podataka.

## Stvarno izvršene provere

- `npm run test:server`: **138/138**. Nova grupa pokriva sopstvenog autora, sve nivoe, kombinovane filtere, globalne brojače, prave odgovore, sopstvene dopune, lažni kontekst, rešene/nedostupne ciljeve, privatne ideje, nevažeće upite i zabrane za employee/manager/admin. Tri dodatna testa proveravaju strogo ograničeno čišćenje sopstvene live testne sesije.
- `npm run test:client`: **57/57**. Dodate provere obuhvataju datume i DST, validaciju filtera, stvarni deep link, pristupačnu karticu sa odgovorom i nedostupan cilj bez lažne akcije/odgovora.
- `president-wave05-check.mjs`: **73 povezane HTTP provere** na izolovanom memorijskom fixture-u: sve stranice, tipovi/statusi, zabrane uloga, odredišta, fokus na trećoj stranici aktivnosti, odgovor rukovodioca → pregled/brojači → rešavanje, stara ruta, greška/oporavak i prazan feed. Sopstvene sesije odjavljene.
- `president-isolated-db.mjs`: **37 provera** sa pravim MongoDB-om u novoj zasebnoj privremenoj bazi, uključujući ObjectId roditelja/autora, populisano ime odgovora, kasniju predsedničku dopunu, kontekst aktivnosti i privatne/nedostupne ciljeve. Obrisana je samo tačno identifikovana testna baza.
- `npm run check:server`: **85 JS fajlova**. Frontend/PWA production build i `git diff --check` prolaze.
- Novi pokušaj `president-read-check.mjs` nad postojećim demo API-jem **nije završen**: API na portu 4000 prestao je da odgovara posle prijave. Naknadno je identifikovana i opozvana samo sesija tog konkretnog prekinutog testa. Test sada koristi jedinstven device marker i rezervno čišćenje samo svog token hash-a/korisnika/markera, isključivo u potvrđenoj lokalnoj demo bazi. Ranijih 70 live provera četvrtog talasa nisu proglašene ponovljenim.

Browser je u ovoj sesiji vratio `Local browser use is disabled in Work settings`. Zato **vizuelna/E2E browser provera novog ekrana na 320/390/820/1440 px nije potvrđena**, uključujući resize, povratak i prikaz greške. HTTP i SSR provere ne predstavljaju tu vizuelnu potvrdu. Ranije otvorene provere četvrtog talasa ostaju otvorene. Realni telefon/PWA instalacija i fizička push dostava nisu provereni ovim talasom.

## Ponavljanje

Iz `server/` pokrenuti svež memorijski fixture sa `ZEPTER_UI_FIXTURE=1`, `ZEPTER_UI_ROLE=president`, `ZEPTER_UI_QA=1`, `ZEPTER_UI_WAVE02=1`, `ZEPTER_UI_WAVE05=1`, bez `ZEPTER_UI_WAVE04`, pa `node tests/fixtures/employee-ui-server.mjs`. U drugom terminalu: `ZEPTER_UI_FIXTURE=1 node tests/fixtures/president-wave05-check.mjs`. Scenario menja samo sintetičke podatke; za novo ponavljanje koristiti svež fixture.

QA helper `president-ui-qa.mjs` dodaje `history-error`, `history-empty` i `history-normal`. Fixture ne koristi MongoDB. Zaustaviti ga komandom `stop` i time očistiti njegove privremene priloge. Prava izolovana baza koristi `ZEPTER_ISOLATED_DB_TEST=1 node tests/integration/president-isolated-db.mjs`; živo čitanje zahteva već pokrenut lokalni API i eksplicitni `ZEPTER_PRESIDENT_READ_CHECK=1`.
