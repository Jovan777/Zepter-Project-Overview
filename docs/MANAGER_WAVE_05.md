# Rukovodilac — peti talas: odluka o ideji i obaveštenja

Datum: 8. novembar 2026. Grana `develop`; bez commit-a ili push-a. Prethodne nezavršene Git izmene četvrtog talasa sačuvane su.

## Ekrani i reference

| Ekran | Ruta | Referenca |
|---|---|---|
| 9. Detalji ideje — pregled i odluka | `/ideas/:id` | [Mobilna referenca](design/manager/09-idea-review.png) |
| 10. Obaveštenja | `/notifications` | [Mobilna referenca](design/manager/10-notifications.png) |

Rukovodilac dobija posebne React ekrane u postojećem workspace-u. Zaposleni zadržava svoje ekrane, predsednik i administrator prethodne prikaze. Bela/zlatna osnova i mobilni redosled prate reference; stvarni podaci dolaze iz API-ja. Model ne sadrži fotografije autora pa se prikazuju inicijali, bez izmišljenih avatara.

## Ideja i odluka

- Prikazuju se pun opis i korist za kompaniju, autor, radno mesto, datum, postojeći status, privatni prilozi i razgovor.
- Komentar ili odgovor ostaje u kontekstu ideje. Sačuvana je mogućnost rukovodioca da pošalje instrukciju. Obrazloženje odluke odvojeno je od komentara; za doradu je obavezno, a za prosleđivanje opciono.
- „Vrati na doradu“ i „Prosledi predsedniku“ prvo prikazuju kratku potvrdu, zatim „Potvrdi odluku“ šalje zahtev. Prosleđivanje eksplicitno ne znači odobrenje za realizaciju.
- Odluka je moguća samo za `submitted` ili `in_review`, u sektoru prijavljenog rukovodioca. Posle odluke akcije se uklanjaju. Dorada čeka dopunu/ponovno slanje autora; prosleđen predlog čeka predsednika.
- Greška ne briše obrazloženje. Kod konflikta ili nejasnog ishoda ponovljena odluka je blokirana. „Proveri aktuelni predlog“ prikazuje sačuvanu verziju radi poređenja; njen unos zamenjuje lokalni tekst tek posle izričitog izbora.
- Nesačuvan komentar i obrazloženje štite se pri navigaciji. Promena širine ne menja instancu forme ili razgovora. Povratak na listu čuva prethodni filter/stranicu kada je ideja otvorena sa liste.
- Sačuvan je postojeći autorski tok rukovodioca: svojoj ideji može dodavati priloge; sopstvenu vraćenu ideju dopunjava kroz „Dopuni svoju ideju“ (`?edit=1`), koristeći istu verzionisanu autorsku formu kao zaposleni. Prelaz između pregleda i autorske dopune ponovo čita server; resize ne remount-uje formu. Tuđ predlog ostaje samo za pregled i odluku.

## Obaveštenja

Filteri su Sva, Komentari predsednika, Odgovori zaposlenih, Projekti i Ideje. Nove stavke imaju zlatni indikator i odvojene su od ranijih. Postojeće grupisanje/paginacija, označavanje kao pročitano i grupno označavanje ostaju zajednički sa ekranom zaposlenog.

Klik prvo označava lično obaveštenje kao pročitano, zatim otvara odgovarajući lokalni resurs. Ako označavanje ne uspe, UI nudi otvaranje sadržaja bez označavanja. Pri otvaranju resursa backend ponovo proverava ovlašćenja. Nepodržani/spoljni URL-ovi se odbijaju postojećom dozvoljenom listom putanja.

Kategorije koriste postojeće zapise, bez migracije:

| Filter | Pravilo |
|---|---|
| Sva | `user` iz sesije |
| Komentari predsednika | Akter sa aktuelnom ulogom `president`, tip `comment` ili `instruction` |
| Odgovori zaposlenih | Akter sa aktuelnom ulogom `employee`, tip `comment` ili `instruction` |
| Projekti | Link na projekat/aktivnost, tip različit od komentara/instrukcije |
| Ideje | Link na ideju, uključujući pristigle/dopunjene predloge i komentare |

Postojeći Notification nema ID roditeljskog komentara ni istorijsku kopiju uloge aktera. Zato „Odgovori zaposlenih“ uključuju i njihove nove komentare; kategorije po akteru koriste njegovu današnju ulogu. Obrisani akter ne može biti istorijski klasifikovan. Filteri mogu da se preklapaju; nisu nove vrste poslovnih događaja. Ekran ne proizvodi sintetička obaveštenja: za kašnjenja prikazuje već pristigle zapise. Automatsko periodično generisanje podsetnika za kašnjenje nije uvedeno ovim talasom.

## API i kompatibilnost

Modeli, statusi, tela zahteva i demo nalozi nisu menjani. Migracija nije potrebna.

- `POST /api/ideas/:id/review` prihvata postojeće `{action:'forward'|'request_revision', note?}` i opcioni `If-Match: "<updatedAt ISO>"`. Nova forma uvek šalje verziju. Zastarela verzija vraća 409.
- Atomski upis proverava sektor i dozvoljeni početni status, kao i `updatedAt` kada je zaglavlje dato. Konkurentni ili ponovljeni zahtev vraća 409 i ne šalje dodatna obaveštenja. I stari pozivi bez zaglavlja mogu izvršiti samo jedan prelaz statusa. Prazno obrazloženje dorade vraća 422.
- Samo pobednički prelaz pravi postojeći audit/obaveštenje autoru i, pri prosleđivanju, predsedniku. Promena ideje i slanje događaja nisu Mongo transakcija; posle delimičnog serverskog neuspeha proverava se stanje, bez slepog ponavljanja. Distribuirana garantovana dostava nije deo ovog talasa.
- `GET /api/notifications?view=manager&category=...&grouped=true&page=1&limit=12` uključuje rukovodiočeve kategorije i ulogu aktera; samo manager sa sektorom. Svi upiti ostaju vezani za primaoca iz sesije, uz `Cache-Control:no-store`. Query parametri ne mogu promeniti primaoca.
- Pozivi bez `view=manager` zadržavaju ranije kategorije. `/read` i `/read-all` ostaju vezani isključivo za korisnika sesije.

## Raspored i provere

Mobilni redosled je predlog → prilozi → komentari → odluka. Tablet koristi širi prostor, postojeća bočna navigacija počinje od 1024 px. Od 1200 px predlog i odluka su levo, razgovor desno; obaveštenja grupišu nove i ranije stavke u kolone. Sve su iste React instance, bez paralelnih mobilnih/desktop formi.

| Provera | Rezultat |
|---|---|
| `npm run test:client` | 26/26 |
| `npm run test:server` | 73/73; uključuje odluke, trke, verzije, uloge/sektore i primaoce obaveštenja |
| `npm run test:rbac` | 40/40 live podprovera, 41 sa roditeljskim testom; nove kategorije i postojeće granice svih uloga; testne sesije odjavljene |
| `npm run check:server` | Sintaksa 55 JS/MJS fajlova prolazi |
| `npm run build:client` | React i PWA build prolaze |
| Izolovani API tok | `manager-wave05-check.mjs` prolazi: prilozi/odgovor, dorada i prosleđivanje, stale/repeated 409, strani sektor, sopstvena ideja/dopuna/ponovno slanje, kategorije/grupisana paginacija i čitanje samo svog primaoca |
| `npm run smoke:demo` | 15/19; ista četiri poznata neuspeha: dve pretpostavke o već odobrenom kandidatu i dva današnja pregleda bez demo dnevnih unosa. Baza nije menjana radi testova. |

Chrome, izolovani fixture, bez MongoDB veze:

- Vizuelno pregledani oba ekrana na 320/390, 820 i 1440 px, donja/bočna navigacija, predlog, status, privatni prilog i razgovor.
- Komentar i obrazloženje ostali sačuvani pri prelasku mobilni → tablet → desktop → 320 px. Dijalog pri pokušaju napuštanja zadržao je oba unosa.
- Poslat komentar, zatim potvrđena dorada. Simuliran izgubljen odgovor posle stvarne odluke: UI sačuvao tekst i blokirao ponavljanje; provera je prikazala stvarni status „Na doradi“, a izričito preuzimanje uskladilo prikaz.
- Druga ideja prosleđena kroz mobilni UI; prikazani uspeh/status i uklonjene akcije za ponovljenu odluku.
- Provereni filteri predsednika/zaposlenih/projekata/ideja, nove i ranije stavke, otvaranje tačnog projekta i ideje. HTTP 503 pri učitavanju prikazuje grešku i uspešan retry; neuspešno označavanje nudi bezbedan link do sadržaja.
- Prazni prilozi i razgovor pregledani su u browseru. Paginacija i grupno označavanje provereni su izolovanim API runner-om.

Razvojni fixture koristi Vite proxy i prijavljuje WebSocket fallback; build prolazi. Tokom restarta fixture-a otvorena stranica izgubila je razvojni modul/sesiju; naknadna HTTP provera oba React modula i dummy refresh rute vratila je 200. Završna browser dopuna prekinuta je tokom aktivnog korisnikovog rada u istom Chrome prozoru. Zato zasebni UI tok dopune sopstvenog predloga rukovodioca, novo sačuvano dugme za instrukciju i prazna lista rukovodiočevih obaveštenja nisu ponovo vizuelno provereni; API dopuna/ponovno slanje prolaze, a autorska forma i razgovor koriste postojeće komponente. Grupno označavanje provereno je API runner-om, bez potvrđenog završnog browser klika. Ovo su granice provere, ne neuspešni funkcionalni testovi. Pravi telefon, instalacija PWA, mobilna tastatura, stvarni Web Push i pun pregled pristupačnosti ostaju zasebne provere. Ranija ograničenja ostalih talasa nisu zatvorena ovim pregledom.

Testni fixture ugašen je komandom `stop`, uz automatsko uklanjanje privremenih priloga. Korisnikov Vite 5173 i demo API 4000 nisu gašeni. Live provere nisu menjale poslovne podatke, naloge ili lozinke.

## Ponavljanje izolovanog testa

Iz `server/`, u prvom terminalu:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
$env:ZEPTER_UI_ROLE = 'manager'
node tests/fixtures/employee-ui-server.mjs
```

U drugom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/manager-wave05-check.mjs
```

Runner zahteva fiksni loopback `127.0.0.1:4002` i eksplicitno proverava dummy sesiju pre upisa. Ne koristi `.env`, prave naloge ili MongoDB. Za browser probe potreban je Vite 5173; otvoriti fixture URL. Opcioni `ZEPTER_UI_QA=1` omogućava komande `review-error`, `review-lost`, `notifications-error`, `notifications-empty`, `notifications-normal` i `read-error` kroz `manager-ui-qa.mjs`. Kontrole su samo u fixture-u. Posle rada ukucati `stop` u fixture terminalu da se očiste privremeni fajlovi; agentski terminal koristi `tty:true`. Korisnikov postojeći Vite i demo API ne gase se.
