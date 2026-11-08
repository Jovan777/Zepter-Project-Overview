# Rukovodilac — drugi talas: projekat i obrazac

Datum: 8. novembar 2026. Grana `develop`; bez commit-a ili push-a.

## Ekrani i reference

| Ekran | Ruta | Referenca |
|---|---|---|
| Detalji projekta | `/projects/:id` | [Mobilna referenca](design/manager/03-project-detail.png) |
| Kreiranje projekta | `/projects/new` | [Mobilna referenca](design/manager/04-project-form.png) |
| Uređivanje projekta | `/projects/:id/edit` | Isti obrazac, učitan postojeći projekat |
| Pomoćni obrazac dodavanja aktivnosti | `/projects/:id/new-activity` | Povezana akcija sa detalja projekta |

Mobilni raspored napravljen je prvo, prema dostavljenim slikama, uz postojeće belo/zlatne stilove i zajedničku donju navigaciju. Desktop koristi isti shell i istu instancu forme: od 1200 px projektni sadržaj je levo, razgovor desno; osnovna polja forme i izbor tima imaju odvojene kolone. Tablet koristi punu širinu i jedan glavni tok. Nisu dodate biblioteke ili menjane zavisnosti.

`App.jsx` usmerava samo rukovodioca na nove komponente koje se učitavaju po potrebi. Zaposleni, predsednik i administrator zadržavaju prethodne komponente. Redizajn rukovodiočevih detalja aktivnosti i izveštaja pripada sledećim talasima.

## Detalji projekta

Sažetak prikazuje stvarni naziv i sektor, opis, status, ukupni napredak, rok sa godinom, prioritet i tim. Procenat ostaje serverski prosek aktivnosti. Četiri prikaza su aktivnosti, tim, komentari i detalji.

- Aktivnosti prikazuju naziv, odgovorne osobe, status, procenat i rok, sa vezom ka postojećim detaljima aktivnosti.
- Tim prikazuje odgovornu osobu i stvarne članove, sa brojem njihovih projektnih zaduženja i ulazom u uređivanje tima.
- Najnoviji komentar vodi do punog razgovora. Rukovodilac može odgovoriti na konkretan komentar predsednika ili drugog učesnika, poslati komentar/instrukciju timu i označiti sopstvenu instrukciju rešenom. Backend proverava autora, cilj i ovlašćenja.
- Detalji sadrže odgovornu osobu, početak, rok, sektor i postojeće privatne priloge. Prilozi ostaju iza autorizovanih ruta.
- Povezane akcije vode na dodavanje aktivnosti, projektni razgovor i postojeći dnevni izveštaj projekta.

Promena prikaza ili širine ne stvara novu instancu razgovora, pa započet odgovor ostaje u unosu. U mobilnom rasporedu prelazak na prikaz pomera sadržaj do izabranog panela. Tabovi koriste URL parametar `view`; ne otkrivaju sadržaj nedostupnog projekta.

## Jednostavniji obrazac

Obrazac koristi srpske nazive prioriteta i postojeće statuse. Naziv, opis i odgovorna osoba su obavezni; rok je obavezan pri kreiranju, dok se postojeći rok može ukloniti. Datum početka je opciona sklopiva stavka. Sektor dolazi sa rukovodiočevog naloga, bez nepotrebnog izbora drugog sektora.

Izbor tima koristi pretragu i kućice za označavanje, umesto mobilno nepraktičnog višestrukog select-a. Odgovorna osoba je uključena u tim. Član sa postojećim dodelama ne može da se ukloni pre preraspodele svojih aktivnosti. Nema izmišljenih fotografija ili naziva timova; inicijali se izvode iz stvarnih imena. Deaktivirani postojeći član može biti uklonjen kada nema zaduženja, ali nije ponuđen za novu dodelu.

Početne aktivnosti su opcione. Svaka ima naziv, opcioni opis i rok, prioritet i odgovorne članove iz projektnog tima. Mogu se sklopiti ili ukloniti dok nisu sačuvane. Prazan naziv ostaje otvoren radi validacije. Postojeće aktivnosti se ne dupliraju u formi uređivanja; prikazana je veza ka njihovom pregledu i mogućnost dodavanja novih.

Nesačuvan projekat ili aktivnost imaju dijalog pri izlasku i browser `beforeunload` zaštitu. Unos se ne resetuje na Socket.IO događaj ili promenu širine.

Kreiranje projekta i početnih aktivnosti koristi postojeće odvojene POST rute, bez izmene šeme ili uvođenja transakcione zavisnosti:

1. Sačuva se projekat i njegov ID ostaje u trenutnoj formi.
2. Početne aktivnosti se dodaju redom; pamte se potvrđeni ID-jevi.
3. Kod potvrđenog odbijanja aktivnosti forma prikazuje grešku i dozvoljava dodavanje preostalih. Već sačuvani projekat i aktivnosti ne šalju se ponovo.
4. Ako odgovor nije potvrđen zbog prekida mreže ili 5xx, automatsko ponovno slanje se blokira i korisnik dobija uputstvo da pregleda sačuvane projekte/aktivnosti. Backend nema idempotency ključ; zato ne obećavamo bezuslovno bezbedan retry posle nejasnog ishoda.

## Kompatibilne serverske dopune

MongoDB modeli, polja i nazivi statusa ostaju isti; migracija nije potrebna. Nove API rute nisu uvedene.

- `PATCH /projects/:id` prihvata opcioni `If-Match` sa `updatedAt` ISO vremenom u navodnicima, kao postojeće aktivnosti i ideje. Sa zaglavljem upis koristi atomski filter na `_id` i `updatedAt`; zastarela verzija vraća 409. Zahtevi bez zaglavlja ostaju podržani. Nova forma šalje samo promenjena polja i koristi postojeće `null` datume za uklanjanje roka/početka.
- Pri promeni tima ili odgovorne osobe server zadržava vlasnika u efektivnom timu i odbija uklanjanje osobe koja je i dalje dodeljena bilo kojoj projektnoj aktivnosti. UI ograničenje nije bezbednosna granica.
- `POST /activities/project/:projectId` odbija dodavanje aktivnosti zatvorenom ili arhiviranom projektu dok se projekat ponovo ne aktivira. Provera sektora i članstva odgovornih ostaje na serveru.
- Postojeća zabrana završavanja projekta sa nezavršenim aktivnostima ostaje.

Optimizam verzije štiti projektni dokument od prepisivanja novije verzije. Provera tima i upis aktivnosti nisu jedna višedokumentna transakcija; potpuno istovremena izmena tima i kreiranje dodele ostaje oblast za buduće transakciono učvršćivanje. Stari klijenti koji ne šalju `If-Match` nemaju zaštitu od konkurentnog uređivanja.

## Rezultati provera

| Provera | Rezultat |
|---|---|
| `npm run test:client` | 18/18; promenjena polja, `null` datumi, normalizovan tim, nastavak delimičnog slanja, verzionisano uređivanje i blokada nejasnog retry-ja |
| `npm run test:server` | 51/51; pozitivno kreiranje/uređivanje/dodela, zabrane employee/stranog sektora, strani član, zaštita članova sa dodelama, stale/atomic konflikt i zatvoren projekat |
| `npm run check:server` | Prošla sintaksa 48 JS/MJS fajlova |
| `npm run build:client` | Prošao React i PWA produkcioni build |
| `npm run test:rbac` | 35/35 live podprovera, 36 sa roditeljskim testom; sesije odjavljene |
| `npm run smoke:demo` | 15/19; ista četiri postojeća neuspeha: već odobren kandidat i izostanak dnevnih evidencija kompanije/sektora za aktuelni dan |
| Izolovani API tok | Prošao `manager-wave02-check.mjs`: kreiranje, ljudi sektora, dodela aktivnosti, zaštita tima, datumi, konflikt, instrukcija/odgovor/rešavanje, zatvoren projekat i strani sektor |

Browser provere pre prekida automatizacije obuhvatile su mobilni prikaz na 390 px, obrazac sa aktivnostima na 320 px i desktop na 1440 px. Provereni su stvarni UI tokovi sa modelima u memoriji: uređivanje naziva/prioriteta, promena i uklanjanje roka, čuvanje datuma početka, izbor članova, dve početne aktivnosti sa namerno odbijenom drugom aktivnošću i uspešnim nastavkom bez dupliranja, dodatna aktivnost sa rokom, dijalog izlaska, konflikt dva prozora sa očuvanim nacrtom i preuzimanjem aktuelnog projekta, komentari/instrukcije, očuvanje komentara pri promeni taba/širine i rešavanje sopstvene instrukcije. Prazni komentari/prilozi i stanje učitavanja takođe su viđeni. Provereni mobilni prikazi i desktop forma nisu imali horizontalno prelivanje.

Vizuelni pregled zasebne tablet širine i završni screenshot prolaz nisu izvršeni: browser alat je postao nedostupan tokom rada, a naknadni Windows Computer Use je prekinut jer nije mogao pouzdano da utvrdi trenutni URL. Nisu sačuvani finalni screenshot fajlovi ovog talasa. Naknadna mala dopuna ograničenja neaktivnih članova prošla je build, ali nije ponovo pregledana u browseru. Instalacija PWA na Android/iOS, Web Push i puna provera svih kombinacija grešaka ostaju zasebni koraci. Build i unit testovi nisu zamena za te provere.

Svi upisi su izvršeni samo u memoriji izolovanog fixture-a bez dotenv/MongoDB veze. Demo poslovni podaci, nalozi, lozinke i lokalni `.env` nisu menjani. Live prijave standardno menjaju `lastLoginAt` i prave auth sesije. Završni fixture server ugašen je sa `stop`, uz čišćenje svojih privremenih priloga; na 4002 nije ostao testni proces.

## Ponovljiv izolovani API test

U prvom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
$env:ZEPTER_UI_ROLE = 'manager'
node tests/fixtures/employee-ui-server.mjs
```

U drugom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/manager-wave02-check.mjs
```

Runner proverava dummy fixture token i ulogu pre poslovnog upisa. Vite nije potreban za ovaj API runner; za browser proveru treba da radi na 5173. `stop` u prvom terminalu gasi fixture i čisti njegov sopstveni temp direktorijum. Za ponavljanje browser scenarija delimičnog neuspeha, pre starta postaviti `ZEPTER_UI_FAIL_ACTIVITY_AT=2`; taj flag namerno odbija drugo kreiranje aktivnosti samo u fixture-u i nije produkciona opcija. Ne koristiti ga pri standardnom API runner-u.
