# Zepter Management Overview — funkcionalna specifikacija backend-a

**Optimizacija probnog hostinga:** [PERFORMANCE_FREE_HOSTING.md](docs/PERFORMANCE_FREE_HOSTING.md). Javni `GET /api/ready` vraća readiness bez poslovnih podataka; ne ponavljaju se upisi tokom buđenja. Predsednikovi brojači dele iste upite unutar zahteva, bez trajnog privatnog cache-a. Produkcija ima bounded pool i zasebnu komandu za indekse. Opciono Attachment.storage uvodi privatni GridFS za Render; lokalni dokumenti ostaju kompatibilni, a postojeći fajlovi zahtevaju eksplicitni provereni prenos pre objavljivanja. Modeli drugih poslovnih podataka i API ugovori nisu menjani.

**Administracija naloga i sektora:** [ADMIN_PANEL.md](docs/ADMIN_PANEL.md) opisuje novi pregled, filtere/detalje naloga, PATCH postojećeg korisnika i reaktiviranje. Zaštićeni nalozi ostaju van tih izmena; poslovne dodele blokiraju nedosledan prenos sektora. Promene prava opozivaju sesije, a novo opciono polje Session.sessionVersion i socket revalidacija sprečavaju nastavak starog pristupa. Nije potrebna migracija poslovnih podataka.

**Sektori i inicijalni planovi:** [katalog i lokalno usklađivanje](docs/COMPANY_SEED.md) čuvaju postojeće ID-jeve, uloge, lozinke, napredak i predsednički pristup; nije menjana šema. `POST /api/admin/sectors` ostaje samo za administratora, normalizuje naziv/šifru i vraća 409 za duplikate. Stare rezervisane lokalne mejl adrese imaju alias samo van produkcije, uz postojeću proveru lozinke i odobrenja. CLI podrazumevano samo prikazuje plan; `--apply` pravi privatnu kopiju pre upisa i proverava verziju postojećih zapisa.

**Naknadna dopuna predsedničkog ulaza:** novi `/president/zp/002/<12-karaktera>` URL koristi isti auth ugovor i hash. Eksplicitni lokalni `setup:president` inicijalizuje nedostajući predsednički nalog i link bez isteka; ponavljanje ne menja aktivni link, generaciju ni sesije. Nije deo API starta ili instalacije. Uspešni ulasci ne troše limiter neuspešnih pokušaja. CLI `format` menja samo privatni fajl; stari URL-ovi ostaju podržani. [Podešavanje, provere i granice](docs/PRESIDENT_PERSONAL_URL.md).

## Peti predsednički talas

Read-only `GET /api/comments/mine/president` vraća paginiranu sopstvenu istoriju, javni kontekst, poslednji stvarni odgovor i globalne brojače/filtere. Autor se uzima isključivo iz sesije, druge uloge nemaju pristup, neprosleđene ideje su isključene. Sopstvena dopuna nije tuđi odgovor; resolved i nedostupan cilj su odvojena stanja. Deep link koristi postojeći fokus konkretne poruke. Stara ruta, šeme i statusi ostaju kompatibilni, bez migracije. [Ugovor, provere i ograničenja](docs/PRESIDENT_WAVE_05.md).

## Četvrti predsednički talas

Read-only `/api/reports/president` i `/president/options` iza president ovlašćenja podržavaju objavljeni snimak ili automatsku evidenciju odgovarajućeg cilja/perioda. Generator aditivno čuva `activitySnapshot` i ID-jeve evidencije u postojećem Mixed polju, uz beogradski početak dana i isključivanje kašnjenja zatvorenih projekata. `/dashboard/president/attention` dodaje kategorije/statistiku i predsednikove answered instrukcije do resolved, a kompanija/sektori koriste iste izvore. Opcioni `focus` komentara računa stvarnu stranicu samo unutar autorizovanog razgovora. Nema izmene šema ni migracije. [Ugovori, provere i ograničenja](docs/PRESIDENT_WAVE_04.md).

## Treći predsednički talas

Attachment dobija opcioni komentar i UUID operacije, uz parcijalni jedinstveni owner/uploadId indeks. POST priloga proverava isti cilj i autora komentara pre prihvata fajla; predsednik može dodati dokument prosleđenoj/završenoj ideji samo uz svoj komentar. Idempotentni retry vraća postojeći fajl. GET komentara opciono dodaje javne metapodatke priloga preko includeAttachments=1. Stari ugovori i dokumenti ostaju kompatibilni, bez migracije. [Ugovori, provere i ograničenja](docs/PRESIDENT_WAVE_03.md).

## Drugi predsednički talas

Idea dobija aditivne approved/rejected statuse i opcione podatke odluke/isporuke; IdeaRead čuva korisničko čitanje. Novi president feed i read/decision/deliver endpointi zadržavaju granice uloga. Odobrenje zahteva neprazne naredne korake, If-Match i jedinstveni requestId; odluka je atomska, a komentar/obaveštenja se isporučuju idempotentno uz trajni nastavak posle greške. Rukovodilac dobija instrukciju, autor status; završeni predlozi ostaju u istoriji. [Ugovori, kompatibilnost i provere](docs/PRESIDENT_WAVE_02.md).

## Prvi predsednički talas

Dodati su read-only feed-ovi kompanije, pitanja za pažnju i sektora/projekata; iste definicije služe brojačima i paginiranim listama. Projects feed prihvata opcioni activeOnly=1. Višekratni lični link uspostavlja sesiju preko POST /api/auth/president-link, bez formulara i odjave u predsedničkom UI-ju. Posebna PresidentAccessLink kolekcija i opciona polja sesije omogućavaju zamenu/opoziv bez promene poslovnih šema, naloga i lozinki. Autentifikacija ličnog pristupa proverava se i pre socket dostave. [Ugovori, komande, kompatibilnost i provere](docs/PRESIDENT_WAVE_01.md).

Naknadni [pregled zaposlenog i rukovodioca](docs/REVIEW_EMPLOYEE_MANAGER.md) uvodi ranu proveru nedodeljenog sektora, granicu sektora uz članstvo u projektu, validaciju redosleda datuma i konteksta dnevnog unosa, konzistentnost zatvorenog projekta, privatnost komentara neprosleđene ideje, ispravne linkove prepreka i serijalizaciju napretka unutar jedne API instance. Modeli i statusi ostaju isti, bez migracije; svi API odgovori koriste `no-store`. Povezani test prati zaposlenog do stvarno pročitanog objavljenog izveštaja predsedničkom ulogom.

## Peti talas rukovodiočevih ekrana

`POST /api/ideas/:id/review` zadržava postojeće telo zahteva, prihvata opcioni `If-Match` i atomski proverava sektor i status `submitted`/`in_review`. Dorada zahteva obrazloženje; konkurentna ili ponovljena odluka vraća 409 bez duplih događaja. `GET /api/notifications?view=manager` dodaje kategorije `all`, `president`, `employees`, `projects`, `ideas`, ulogu aktera i `no-store`; primalac je uvek korisnik sesije. Stari feed ostaje kompatibilan. Modeli i statusi nisu menjani. [Detalji, granice klasifikacije i provere](docs/MANAGER_WAVE_05.md).

## Četvrti talas rukovodiočevih ekrana

Novi read-only `GET /api/reports/prepare` nastavlja nacrt ili priprema novi period bez upisa, samo za manager sektor sa sesije. POST nacrta prihvata opcioni `If-None-Match: *`, a POST/PATCH i objava opcioni `If-Match` sa `updatedAt`. Atomski uslovi sprečavaju prepisivanje objavljenog izveštaja i duplu objavu. Novi `GET /api/ideas/sector` daje sektorsku listu, grupisane statusne filtere, paginaciju i globalne brojače. Modeli, statusi i tela zahteva nisu menjani; stari pozivi bez zaglavlja ostaju podržani. [Ugovori, kompatibilnost i provere](docs/MANAGER_WAVE_04.md).

## Treći talas rukovodiočevih ekrana

Upravljanje aktivnošću koristi postojeći verzionisani PATCH i privatne priloge/komentare. Nova read-only `GET /api/activities/:id/history` ruta namenjena je rukovodiocu njegovog sektora; odvojeno paginira stvarne dnevne unose aktivnosti i sanitizovane audit događaje, bez IP/kontakt podataka i sa `no-store` odgovorom. Izveštaji koriste postojeće filtriranje dnevnih/nedeljnih lista; manager bez sektora se odbija pre upita. Nema promene modela, statusa ili migracije. [Detalji i testovi](docs/MANAGER_WAVE_03.md).

## Drugi talas rukovodiočevih ekrana

Detalji, tim i obrazac koriste postojeće projektne, aktivnosne i komentarske rute. `PATCH /api/projects/:id` dodatno podržava opcioni `If-Match` sa `updatedAt` vremenom u navodnicima i atomsku proveru verzije; zastareo zahtev vraća 409. Promena tima zadržava odgovornu osobu i odbija uklanjanje člana sa postojećim dodelama. Dodavanje aktivnosti zatvorenom/arhiviranom projektu traži prethodno ponovno aktiviranje. MongoDB šema i nazivi statusa ostaju isti, bez migracije; zahtevi bez `If-Match` ostaju podržani. Detalji, kompatibilnost i testovi su u [drugom talasu rukovodioca](docs/MANAGER_WAVE_02.md).

## Prvi talas rukovodiočevih ekrana

Dodati su autentifikovani, read-only `GET /api/dashboard/manager` i `GET /api/projects/sector`, samo za manager nalog sa sektorom. Pregled i globalni brojači su sektorski; podržani su pažnja, predsednikovi komentari, kašnjenja po beogradskom danu, ideje na pregledu, statusni/pretraživački filteri i paginacija. Modeli i stari ugovori ostaju isti. Semantika izvedenih oznaka i testovi su u [prvom talasu rukovodioca](docs/MANAGER_WAVE_01.md).

## Četvrti talas zaposlenih ekrana

Detalji ideje koriste postojeće rute. `PATCH /api/ideas/:id` i `POST /api/ideas/:id/resubmit` prihvataju opcioni `If-Match` sa `updatedAt` vremenom u navodnicima; zastarela verzija vraća 409. Ponovno slanje ima atomski uslov `revision_requested`, pa samo jedan zahtev može promeniti status. `GET /api/notifications` ima opcione `category` i `grouped=true`, sa nepročitanim stavkama pre ranijih i dodatnim `filteredUnread` brojačem. Podrazumevani ugovor, modeli i autorizacija ostaju kompatibilni. Detalji i ograničenje vizuelne provere su u [četvrtom talasu](docs/EMPLOYEE_WAVE_04.md).

## Treći talas zaposlenih ekrana

`GET /api/ideas/mine` je novi autentifikovani pregled samo za zaposlenog: lične ideje, tabovi `all/review/revision/forwarded`, paginacija, globalni brojači i reference autorizovanih minijatura. `review` obuhvata `submitted` i `in_review`. Kreiranje i upload koriste postojeće rute, sektor i autor dolaze sa sesije. Modeli i postojeći ugovori nisu menjani. Detalji su u [trećem talasu](docs/EMPLOYEE_WAVE_03.md).

## Drugi talas zaposlenih ekrana

Detalji projekta/aktivnosti, komentari, odgovori, upload/download i dnevna evidencija koriste postojeće ugovore. `PATCH /api/activities/:id` dodatno podržava opcioni `If-Match` sa navedenim `updatedAt` ISO vremenom u navodnicima i atomsku proveru verzije; zastareli upis vraća 409. `GET /api/attachments/config` iza autentifikacije vraća formate i ograničenje veličine. Dnevni unos na 100% više ne vraća `completed` u `review`. Modeli nisu menjani. Detalji i testovi su u [drugom talasu](docs/EMPLOYEE_WAVE_02.md).

## Prvi talas zaposlenih ekrana

Dodate su autentifikovane rute samo za ulogu `employee`: `GET /api/dashboard/employee` (lični pregled, aktivnosti, pažnja i poslednji komentari) i `GET /api/projects/mine` (lični projekti, filteri/pretraga/redosled i paginacija). Identitet i sektor dolaze sa serverske sesije, bez mogućnosti proširenja kroz query parametre. Modeli i postojeći API ugovori nisu menjani. Detaljan odgovor i semantika statusa opisani su u [dokumentaciji ekrana](docs/EMPLOYEE_WAVE_01.md#dopune-api-ja).

## Povezanost sa usvojenim ekranima predsednika

| Predsednički ekran | Backend funkcionalnosti |
|---|---|
| 1. Početni pregled kompanije | Dashboard ukupnih projekata, pažnja, lista sektora, pregled dnevnih/nedeljnih izveštaja |
| 2. Pregled sektora | Sektori, projekti sektora, komentari na sektoru, sektorski izveštaji |
| 3. Detalji projekta | Projekat + aktivnosti + tim + status/progress + komentari i prilozi |
| 4. Ideje zaposlenih | Prosleđene ideje iz svih sektora, filteri po sektoru i datumu |
| 5. Detalji ideje | Sadržaj ideje, autor, prilozi, komentari predsednika i odgovori |
| 6. Detalji aktivnosti | Odgovorni, rok, procenat, urađeno, sledeći koraci, prilozi i komentari/instrukcije |
| 7. Dnevni/nedeljni izveštaj | Automatski pregled kompanije/sektora/projekta/zaposlenog; objavljeni sektorski izveštaji |
| 8. Potrebna moja pažnja | Zahtevi rukovodilaca, ugroženi rokovi, blokirane aktivnosti, predsednikova otvorena zaduženja |
| 9. Moji komentari i instrukcije | Svi predsednikovi komentari i instrukcije, stanje odgovora, direktan link na sadržaj |

## Službeni zahtevi project managera

- Zaposleni svakog radnog dana evidentira šta je urađeno, šta sledi i eventualne prepreke; `/worklogs` i `/worklogs/compliance` podržavaju praćenje ispunjenosti obaveze.
- Rukovodilac vidi projekte i aktivnosti sektora, kreira projekte i zaduženja, priprema i objavljuje sektorske izveštaje.
- Predsednik vidi sve nivoe i izveštaje, dodeljuje zadatke rukovodiocima, komentariše i odgovara na zahteve.
- Ideje: zaposleni → rukovodilac (prosleđivanje ili povratak na doradu) → predsednik (pregled i komentar).
- Promene se čuvaju odmah; Socket.IO signalizira klijentu da preuzme novi sadržaj.
- Admin odobrava registracije i role; predsednik se inicijalizuje posebno, mimo registracije.
- PWA koristi HTTPS i web manifest za instaliranje na telefonu; privatni API se ne kešira.

## Kolekcije MongoDB

`users`, `sectors`, `projects`, `activities`, `worklogs`, `comments`, `ideas`, `reports`, `assignments`, `decisionrequests`, `notifications`, `attachments`, `audits`, `sessions`, `pushsubscriptions`.

## Pravila modela

- `User` ima `role` i `approval` — uloga se dodeljuje isključivo na backend-u.
- `Project` pripada tačno jednom sektoru; `members` i `owner` su aktivni korisnici tog sektora.
- `Activity` pripada jednom projektu; `assignees` moraju biti članovi projektnog tima.
- `WorkLog` je nezavisan dnevni unos zaposlenog, opcionalno vezan za projekat/aktivnost.
- `Comment` može biti uz sektor/projekat/aktivnost/ideju/zaduženje/zahtev. Ima autora, vreme, vrstu i status odgovora.
- `Idea` prati tok `submitted` → (`revision_requested` → ponovno slanje) ili `forwarded`. Prosleđivanje nije odobrenje za realizaciju.
- `Report` sektora ima nacrt i objavljeno stanje; objavljen izveštaj je zaključan. Automatski pregled u drugim nivoima generiše se iz evidencije rada.
- `Attachment` ima privatni fizički fajl i autorizovanu baznu referencu.
- `Audit` čuva promene sa akterom i vremenom.

## V1 prioriteti

1. Potvrditi organizacionu strukturu, sektore, korisnike i pravo uređivanja.
2. Isprobati tok: admin → rukovodilac → projekat → aktivnost → zaposleni → dnevni unos.
3. Isprobati tok komentara predsednika: sektor, projekat, aktivnost, ideja.
4. Isprobati tok ideja i vraćanja na doradu.
5. Isprobati sektor → kompanija izveštavanje.
6. Povezati finalni React dizajn i PWA instalaciju na telefonu.

## Plan pre produkcije

MFA/recovery za standardne naloge, operatersko izdavanje i opoziv predsedničkog ličnog linka, skeniranje dokumenata, distribucija rate limita, backup/restore, bezbednosni audit, testovi svih dozvola, automatski reminder posle radnog dana i produkcioni SSL/reverse proxy. Za slučaj međusektorskih timova mora se proširiti postojeća pretpostavka da svi članovi projekta pripadaju istom sektoru.
