# Analiza postojećeg projekta

Peti rukovodiočev talas završava [odluku o ideji i obaveštenja](MANAGER_WAVE_05.md). Odluka ima potvrdu, opcioni API uslov verzije i obavezni atomski prelaz statusa; UI čuva unos kod konflikta/nejasnog ishoda. Obaveštenja koriste stvarnog primaoca i ulogu aktera. Sačuvana je autorska dopuna sopstvene ideje rukovodioca. Prolaze 73 serverska, 26 klijentskih i 40 live RBAC podprovera, sintaksa i build; smoke je 15/19 zbog poznatih demo pretpostavki. Mobilni/tablet/desktop pregled i preostale granice navedeni su u dokumentaciji talasa. Notification nema istorijsku ulogu aktera/roditeljski komentar; filter zaposlenih obuhvata komentare i odgovore, a automatski scheduler kašnjenja ostaje poseban zadatak.

Četvrti rukovodiočev talas uvodi [pripremu/objavu izveštaja i sektorske ideje](MANAGER_WAVE_04.md). Forma nastavlja postojeći nacrt i koristi uslovne upise, dok atomska objava i provera draft statusa sprečavaju promene objavljenog izveštaja. Ideje dobijaju globalne sektorske brojače i paginaciju. Modeli i statusi nisu menjani. API/unit/RBAC provere prolaze; naknadna Chrome provera potvrdila je rasporede 320/390/820/1440 px, očuvanje unosa, čuvanje/objavu i osnovni tok ideja, uz granice navedene u dokumentaciji talasa.

Treći rukovodiočev talas dodaje [upravljanje aktivnošću i pregled izveštaja](MANAGER_WAVE_03.md), sa read-only istorijom rada i sanitizovanim audit događajima. Lista izveštaja sada ima tip/status/paginaciju u UI-ju i zadržava automatski pregled bez duplog unosa. Rukovodiočevo pravo uređivanja svih podataka aktivnosti više nije ograničeno starim osnovnim formularom. Prethodne tabele ispod predstavljaju početnu analizu; vizuelna provera novog talasa ostaje otvorena.

Drugi rukovodiočev talas dodaje [detalje i obrazac projekta](MANAGER_WAVE_02.md), pretraživ izbor tima, početne aktivnosti i opcioni verzionisani upis projekta. Rešeni su raniji problemi mobilnog višestrukog izbora, izostavljenog `startDate`, brisanja datuma i uklanjanja članova sa postojećim dodelama. Modeli nisu menjani. Tabele početne analize ispod čuvaju istorijsko stanje; aktuelne rezultate i preostala ograničenja videti u dokumentaciji talasa.

Naknadna dopuna, 8. novembar 2026: završeni zaposleni i prva dva rukovodiočeva ekrana imaju zajednički mobilni/tablet/desktop raspored. Browser pristup je dostupan; vizuelne i funkcionalne provere opisane su u [responsive dopuni](RESPONSIVE_LAYOUTS.md). Backend, modeli i API nisu menjani tom dopunom.

Ovaj dokument beleži početnu analizu. Pregled i projekti rukovodiočevog sektora naknadno su uređeni u [prvom talasu rukovodioca](MANAGER_WAVE_01.md); naziv sektora više nije hardkodovan u rukovodiočevom novom početnom ekranu. Naknadno je implementirano svih osam ekrana zaposlenog ([ideje i nova ideja](EMPLOYEE_WAVE_03.md), [detalji ideje i obaveštenja](EMPLOYEE_WAVE_04.md)) na `develop`; dopune i aktuelne provere su u [prvom talasu](EMPLOYEE_WAVE_01.md) i [drugom talasu](EMPLOYEE_WAVE_02.md). Drugi talas rešava i ranije evidentirani povratak completed aktivnosti u review pri dnevnom unosu na 100%.

Datum: 7. novembar 2026. Analizirana je lokalna Git radna kopija; nije rađen commit/push. Nisu implementirani novi ekrani. MongoDB modeli i formati API odgovora nisu menjani.

## Struktura i npm organizacija

Prethodno je root definisao `workspaces: [server, client]`. npm je većinu zajednički rešivih paketa smeštao u root `node_modules` (hoisting), sa jednim root lock fajlom i vezama na oba projekta. To je očekivano ponašanje workspaces instalacije, a ne duplikacija izvornog koda.

Sada svaki deo ima nezavisnu instalaciju:

```text
/
├── AGENTS.md
├── README.md
├── BACKEND_FUNKCIONALNOSTI.md
├── package.json                 # samo pomoćne komande, bez workspaces/zavisnosti
├── docker-compose.dev.yml       # MongoDB 8, named volume, loopback port
├── docs/
│   ├── ANALIZA_PROJEKTA.md
│   └── PLAN_FRONTEND.md
├── client/
│   ├── package.json / package-lock.json / node_modules/
│   ├── vite.config.js / index.html
│   ├── public/icons/
│   └── src/                     # App, api, main, styles, service worker
└── server/
    ├── package.json / package-lock.json / node_modules/
    ├── .env.example / .env       # .env je isključen iz Gita
    ├── private-uploads/          # privatni, ignorisani fajlovi
    ├── scripts/check.mjs
    ├── tests/                   # unit/regresija + posebna integration grupa
    └── src/
        ├── index.js
        ├── models/index.js      # 15 modela
        ├── lib/                 # auth, access, validation, utils, errors
        ├── routes/              # 16 API modula
        ├── services/            # izveštaji, napredak, audit/obaveštenja
        └── scripts/             # bootstrap, demo seed/reset/smoke
```

Root `node_modules` i `package-lock.json` su uklonjeni tek nakon uspešne instalacije oba dela i build-a. Lock fajlovi su izvedeni iz postojećeg zaključanog stabla i normalizovani: **nijedna verzija paketa nije promenjena**. Server ima 181 zaključan paket; client 425, uključujući opcione pakete za druge platforme (na ovoj Windows mašini instalirano 375). Oba prolaze `npm ls --depth=0` bez nedostajućih zavisnosti.

Root koristi `npm --prefix ...` za development/start/build/test i `npm ci --prefix ...` za instalaciju. Zasebni `npm ci` iz oba direktorijuma i root `npm run install:all` potvrđeni su iz lokalnog npm cache-a. Root se ne instalira sa `npm install`; koristi se `npm run install:all`. Pre reinstalacije zaustaviti razvojne procese: Windows je tokom provere odbio uklanjanje `esbuild.exe` dok ga je Vite koristio; posle zaustavljanja procesâ instalacija je ponovljena. Razvojni i preview frontend sada se podrazumevano vezuju samo za `localhost`.

## Postojeća implementacija

| Oblast | Šta postoji |
|---|---|
| Autentifikacija | Registracija na čekanju, bcrypt, JWT od 15 min, refresh rotacija, hash refresh tokena, logout, promena lozinke i opoziv sesija |
| Administracija | Lista/prijave, odobravanje employee/manager i sektora, odbijanje, deaktiviranje, sektori, audit |
| Projekti i aktivnosti | Liste/detalji, kreiranje/uređivanje, članovi i odgovorni, rok/prioritet/status/procenat; procenat projekta je prost prosek aktivnosti |
| Dnevni rad | Samostalni ili projektni unos, opciona aktivnost i promena procenta, lični i timski pregled, compliance |
| Komentari | Ciljani razgovori, parent odgovor, instrukcije, addressedTo, status open/answered/resolved, predsednikova istorija |
| Ideje | Slanje, pregled rukovodioca, dorada i ponovno slanje, prosleđivanje predsedniku |
| Izveštaji | Dinamički daily/weekly company/sector/project/employee pregled; sektorski nacrt, dopuna, objava i zaključavanje |
| Zaduženja i zahtevi | Predsednik dodeljuje rukovodiocu; rukovodilac traži odluku, predsednik odgovara |
| Dashboard | Statistika prema ulozi i lista pitanja/rokova/blokada |
| Obaveštenja | Trajna lična lista, read/read-all, Socket.IO signalizacija, opcioni VAPID Web Push |
| Prilozi | Privatno skladište, provera ekstenzije/MIME/sadržaja/veličine, autorizovan upload/list/download/delete |
| PWA | Manifest, dve ikone, injectManifest service worker, precache javnih statičkih resursa; privatni API nije keširan |

Modeli: `User`, `Sector`, `Project`, `Activity`, `WorkLog`, `Comment`, `Idea`, `Report`, `DecisionRequest`, `Assignment`, `Notification`, `Attachment`, `Audit`, `Session`, `PushSubscription`. Validacija je u Zod-u, a ograničenja i indeksi u Mongoose-u. Nije pokretana migracija, seed ili reset.

React nije prazan projekat: postoje prijava/registracija, prikazi po ulozi, sektori, projekti i forme, aktivnosti, dnevni unos, ideje, izveštaji, obaveštenja, pažnja, instrukcije, zaduženja, zahtevi i početna administracija. Gotovo sav UI je u jednom `App.jsx`. Postoji API klijent sa tokenom u memoriji, objedinjavanjem refresh poziva, Socket.IO signalima, upload/download i push pretplatom. Usvojene referentne slike ekrana nisu pronađene u repozitorijumu; postoje samo PWA ikone. Postojeći UI ne može se označiti kao veran usvojenom dizajnu.

## Pregled ovlašćenja

| Uloga | Stvarno ograničenje na backend-u |
|---|---|
| Administrator | Jedini pristupa `/admin`; vidi sve sektore i poslovne podatke kroz zajednički pristup; ima šira administrativna prava uređivanja. Dodela zaduženja/odluka je rezervisana predsedniku, pregled ideja rukovodiocu. |
| Zaposleni | Projekti u kojima je član/vlasnik, pregled projektnih aktivnosti i izmena sopstvenih zaduženja. Lični worklogs i lični report preview; nema team/company/sector/tuđi employee report. Ideje samo svoje. Osnovni imenik svog sektora je dostupan, bez tuđih ličnih evidencija. |
| Rukovodilac | Projekti, aktivnosti, dnevni unosi i ljudi svog sektora; sektorski izveštaji i ideje. Zaduženja samo dodeljena njemu; zahtevi svog sektora. Tuđi sektor nije dostupan. |
| Predsednik | Sve kompanijske oblasti i lični izveštaji zaposlenih; samo prosleđene ideje i objavljeni sektorski izveštaji. Kreiranje projekata/izmena aktivnosti su trenutno takođe dozvoljeni kroz `managing`; javna registracija i `/admin` mu ne daju administratorska prava. |

Svaki privatni REST zahtev proverava trenutni nalog i `approval/sessionVersion`; URL `/president` ne zamenjuje autentifikaciju. Komentari i prilozi proveravaju pristup ciljnom resursu. Integracionim testom potvrđene su osnovne granice svih četiri uloge; ovo nije iscrpan dokaz za sve kombinacije ruta i promena podataka.

## Ispravke u ovom zadatku

1. Razdvojene npm instalacije i lock fajlovi, uz zadržane verzije i root pomoćne komande.
2. `server` syntax check zamenjen prenosivom Node skriptom; stara `find ... -exec` komanda nije bila pogodna za Windows.
3. Dodat nedostajući `src/scripts/bootstrap.js`, na koji su skripta i README već upućivali. Eksplicitno kreira samo prvi admin/president nalog, odbija postojeću ulogu/mejl i traži lozinku od najmanje 16 znakova. **Nije izvršen** nad bazom. Ne pokretati ga konkurentno iz više procesa; provera jedinstvenosti privilegovane uloge nije jedinstveni MongoDB indeks.
4. Uklonjena konkretna JWT vrednost iz verzionisanog `.env.example`; polje je prazno i traži lokalno generisanu vrednost od najmanje 64 znaka. Lokalni `.env` nije menjan.
5. `.gitignore` proširen na privatne upload direktorijume na bilo kom nivou, build/logove, dump/backup fajlove i privatne ključeve. Proveren tracked-file spisak: nisu verzionisani `.env`, zavisnosti ni privatni prilozi. Ranije verzionisan primer tajne ostaje u Git istoriji; ne sme se smatrati privatnom tajnom.
6. `GET /users/:id` za kolegu više ne pokušava `p.members.some(...)` nad projekcijom koja ne sadrži `members`. Ograničenje na zajedničke projekte sada je u samom MongoDB filteru; rukovodilac je dodatno ograničen svojim sektorom. Polja odgovora ostaju ista.
7. Predsednik više ne može direktnim `PATCH /reports/:id` ili `POST /reports/:id/publish` da menja/objavi nacrt koji ne može ni da pročita. Pisanje je ograničeno na manager/admin; zaključavanje objavljenih izveštaja ostaje.
8. Dodati regresioni testovi ovih grešaka i eksplicitna integraciona RBAC grupa bez upisa poslovnih podataka.

## Otvoreni problemi i prioriteti

| Prioritet | Nalaz / sledeći korak |
|---|---|
| P1 | Admin API nema reaktiviranje `disabled` naloga ni promenu uloge/sektora već odobrenog korisnika. UI ima samo prijave i dodavanje sektora; puna administracija tek predstoji. |
| P1 | Socket.IO proverava autorizaciju pri povezivanju; otvorena konekcija se ne opoziva automatski kada token istekne ili nalog bude deaktiviran. Potrebna revalidacija i odspajanje pri opozivu. |
| P1 | MFA, oporavak naloga, antivirus, produkciono skladište i backup/restore nisu implementirani. Pre stvarnih kompanijskih podataka potrebni su bezbednosni/E2E pregled i HTTPS okruženje. |
| P1 | Aktivnost ima `actualWork/nextStep/blockers`, a izveštaji čitaju `WorkLog`. Izmena aktivnosti sama ne pravi dnevni unos. Postojeći Daily UI ne bira projekat/aktivnost i može navesti na dupli unos. Pre novih formi precizirati jedinstven tok evidencije. |
| P1 | `POST /worklogs` sa `updatedProgress=100` postavlja `review` i za već završenu aktivnost. Potrebna zasebna ispravka i test očuvanja completed statusa. |
| P2 | Svi ekrani su u jednom `App.jsx`; nema centralnih zaštita ruta po ulozi, granice grešaka, E2E testova i potpune obrade grešaka. Backend ostaje granica zaštite podataka. |
| P2 | Početna rukovodiočeva poruka hardkoduje „Marketing“. Datumi u delu React-a koriste vremensku zonu uređaja umesto eksplicitnog `Europe/Belgrade`. |
| P2 | Forme imaju ograničenja: mobilni višestruki izbor tima koristi Ctrl/⌘; nema punog upravljanja postojećim dodelama/rokovima; pri editovanju projekta `startDate` se izbacuje iz zahteva i prazni datumi se ne brišu preko podržanog `null`. |
| P2 | Izveštaji: menadžeru nije ponuđen employee scope, zaposlenom nema ličnog report UI-ja iako API postoji; datum/filteri nisu kompletno sinhronizovani sa URL-om. `ReportPreview` prikazuje samo deo zapisa. |
| P2 | Ideas API/UI nema planirane filtere po sektoru i datumu. Predsedniku UI nudi i statuse koje backend pravilno odbija. |
| P2 | Dashboard broj pažnje i lista nisu istog sastava: broj uključuje otvorene instrukcije, lista ih ne vraća, a uključuje i zakašnjele aktivnosti. Uskladiti značenje. `MyComments` link za request ide pogrešno na projects. |
| P2 | Promena projektnog tima ne proverava postojeće dodele aktivnosti; nullable owner i uklanjanje članova mogu narušiti očekivane veze. Ne širiti međusektorske timove bez posebnog plana. |
| P2 | Agregacije izveštaja čitaju sve relevantne worklogs bez ograničenja; veće baze traže merenje, agregacije/paginaciju i proveru indeksa. Compliance nema scheduler/praznike/podsetnike. |
| P2 | Nije obezbeđen produkcioni frontend hosting/reverse proxy: Express ne servira React build. Potrebni su SPA fallback za duboke URL-ove i `/api` + `/socket.io` proxy. `vite preview` sam nije takav produkcioni server. |
| P2 | Prava predsednika da uređuje projekte/aktivnosti šira su od obaveznog pregleda/instrukcija. Potvrditi poslovno pravilo pre njihovog prikazivanja u finalnom UI-ju. |
| P2 | npm audit: client ima 6 prijavljenih zahvaćenih paketa u alatima za build (2 low, 4 moderate), bez high/critical; server 0. Razdvajanje instalacije nije menjalo verzije. Uraditi kontrolisano zasebno ažuriranje sa PWA build proverom. |

Audit lanci: `vite-plugin-pwa → workbox-build → glob/minimatch` i `@rollup/plugin-node-resolve → deepmerge`. Izvori prijava: [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249). Broj 6 predstavlja zahvaćene pakete u stablu, ne šest nezavisnih osnovnih propusta. Nije pokrenut automatski `audit fix`.

## Rezultati verifikacije

| Provera | Rezultat |
|---|---|
| Početni unit testovi pre izmena | 6/6 prošlo |
| Unit + regresije posle izmena | 11/11 prošlo; pravi HTTP Express ruta, modeli u memoriji, bez MongoDB upisa; potvrđena zabrana prijave za pending/rejected/disabled |
| Serverska sintaksa | Prošla prenosivom `check` skriptom |
| Frontend/PWA production build | Prošao pre i posle razdvajanja; generisani manifest i service worker |
| Nezavisna instalacija | `npm ci` uspeo za server i client; verzije identične starom root lock-u; root zavisnosti uklonjene |
| Lokalni runtime | `/health` na 4000 vraća `ok:true`; frontend 5173 vraća HTML i transformisani React; Vite `/api/public/sectors` proxy vraća JSON |
| Integraciona RBAC grupa | 20/20 podprovera prošlo (Node prikazuje 21 test zajedno sa roditeljskim testom), sve četiri uloge, odjava testnih sesija |
| Postojeći smoke test | **17/19 i pre i posle izmena**. Dve provere očekuju da `registracija.na.cekanju@demo.zepter.test` bude pending, ali je u postojećoj bazi već `approved/employee`. Nalog nije menjan da bi test prošao. |
| npm audit | Server: 0; client: 2 low + 4 moderate, 0 high/critical |

Smoke test dodatno pretpostavlja tačne demo količine, današnje evidencije i nepročitana obaveštenja; nije nezavisan od stanja baze. Njegov komentar „bez izmene baze“ odnosi se na poslovne zapise: login ipak ažurira `lastLoginAt` i pravi sesije. Izvorni smoke nije menjan niti su neuspesi sakriveni.

U ovom Codex okruženju sandbox blokira i localhost HTTP/MongoDB: mrežne testove bilo je potrebno pokrenuti van tog ograničenja. To nije zahtev za uobičajeno lokalno pokretanje projekta. Novi regresioni testovi koriste privremene HTTP portove i takođe zahtevaju dozvoljen loopback. Privremeni testni API na 4001 koristi se radi odvojenog rate limita; standardni razvoj ostaje na 4000/5173.

Nisu izvršeni: bootstrap/seed/reset, testovi pisanja nad demo bazom, browser E2E, vizuelno poređenje sa dizajnom, instaliranje na Android/iOS, stvarna push dostava, produkcioni load/backup/restore i kompletan bezbednosni audit. Razlog: obuhvat ovog zadatka, nedostajuće dizajn reference i potreba za izolovanim/propisno konfigurisanim okruženjem.
