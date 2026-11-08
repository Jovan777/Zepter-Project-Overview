# ZEPTER | Management Overview

**Predsednik — treći talas:** [detalji ideje i aktivnosti](docs/PRESIDENT_WAVE_03.md) prate nove mobilne reference i imaju tablet/desktop raspored. Predsednik komentariše, šalje instrukcije i prilaže dokumente uz konkretnu poruku; zaposleni vidi prilog i odgovara u istom razgovoru. Sačuvane su odluke o idejama i zaštita od duplih komentara/priloga pri nejasnoj potvrdi.

**Predsednik — drugi talas:** [projekat, aktivnosti i ideje](docs/PRESIDENT_WAVE_02.md) imaju mobilni/tablet/desktop prikaz. Odobrenje ideje zahteva komentar sa narednim koracima za rukovodioca koji ju je prosledio; odbijanje je završno. Dodati su stvarni završni statusi, lične oznake novih ideja i bezbedan nastavak isporuke odluke. Postojeće ideje ne zahtevaju migraciju.

**Predsednik — prvi talas:** početni pregled kompanije i detaljan sektor prilagođeni su telefonu, tabletu i desktopu. Predsednik ulazi direktno preko istog ličnog linka na svakom uređaju, bez login formulara, menija naloga i odjave. Lokalni link je u ignorisanom server/private-access/predsednik-link.txt; ne objavljivati sadržaj. [Pristup, komande, API i stvarne provere](docs/PRESIDENT_WAVE_01.md).

**Pregled pre predsedničkog interfejsa:** ispravke ovlašćenja, evidencije, komentara/priloga, prijave i konkurentnog računanja napretka opisane su u [pregledu zaposlenog i rukovodioca](docs/REVIEW_EMPLOYEE_MANAGER.md). Naknadna browser provera obuhvatila je obe uloge, 76 merenja rasporeda, tokove pisanja u izolovanom fixture-u i ispravku ulaska u novi nedeljni izveštaj. Dokument razlikuje potvrđene rezultate, preostale realne uređaje/produkcione provere i ograničenja demo smoke testa.

**MERN + PWA — početna integrisana implementacija (v0.1)**  
Jezik interfejsa: srpski (latinica). Vremenska zona izveštavanja: `Europe/Belgrade`.

## Šta je napravljeno

- `server/`: Express API, MongoDB/Mongoose modeli, JWT i rotirajuće refresh sesije, administracija, projekti, aktivnosti, dnevni rad, komentari, predsedničke instrukcije, nova zaduženja, zahtevi za odluku, ideje, izveštaji, obaveštenja, privatni prilozi i evidencija promena.
- `client/`: React/Vite **povezana početna aplikacija** sa prijavom, osnovnim ekranima za tri uloge, API pozivima, PWA manifestom i service worker-om. Klijent nije finalni pixel-perfect prenos svih ranije usvojenih mockupova. Za to je potreban poseban UI prolaz.
- `docker-compose.dev.yml`: lokalni MongoDB za razvoj.

Pravila daljeg rada su u [AGENTS.md](AGENTS.md). Pregled koda, ovlašćenja, ispravki i otvorenih problema je u [analizi projekta](docs/ANALIZA_PROJEKTA.md), a predlog implementacije 27 odobrenih ekrana u [planu frontend-a](docs/PLAN_FRONTEND.md).

**Aktuelni razvoj na `develop`:** uređeno je osam ekrana zaposlenog: „Moj pregled“, „Moji projekti“, „Detalji projekta“, „Detalji aktivnosti — uređivanje“, „Moje ideje“, „Nova ideja“, „Detalji ideje“ i „Obaveštenja“. Dorada, ponovno slanje, odgovori i kategorije obaveštenja opisani su u [četvrtom talasu](docs/EMPLOYEE_WAVE_04.md). Ideje su dostupne na `/ideas` i `/ideas/new`; brojači, filteri, slanje rukovodiocu i privatni prilozi opisani su u [trećem talasu](docs/EMPLOYEE_WAVE_03.md). Prijaviti se postojećim zaposlenim, otvoriti `/projects`, projekat i sopstvenu aktivnost. Detalji su u [prvom talasu](docs/EMPLOYEE_WAVE_01.md) i [drugom talasu](docs/EMPLOYEE_WAVE_02.md). Forma aktivnosti ima zaštitu nesačuvanog unosa i konkurentnih izmena, komentare, privatne priloge i preuzimanje teksta za dnevni izveštaj.

**Rukovodilac — prvi talas:** novi pregled sektora na `/` i lista na `/projects`, sa brojačima, izveštajima, odgovorom predsedniku, idejama, filterima, pretragom i paginacijom. Prijaviti se postojećim rukovodiocem bilo kog sektora. Detalji i testovi su u [prvom rukovodiočevom talasu](docs/MANAGER_WAVE_01.md).

**Rukovodilac — drugi talas:** [detalji projekta i kreiranje/uređivanje](docs/MANAGER_WAVE_02.md) na `/projects/:id`, `/projects/new` i `/projects/:id/edit`. Mobilni prikaz prati dostavljene reference; forma ima pretraživ izbor tima, opcione početne aktivnosti, zaštitu nacrta i konkurentnih izmena. Povezana ruta `/projects/:id/new-activity` dodaje aktivnost sa odgovornim članovima. Implementiran je i desktop raspored; obim browser provera i preostala tablet provera opisani su u dokumentaciji talasa.

**Rukovodilac — treći talas:** [upravljanje aktivnošću i izveštaji sektora](docs/MANAGER_WAVE_03.md) na `/activities/:id` i `/reports`. Aktivnost ima uređivanje podataka/dodele/roka/statusa, privatne priloge, instrukcije i stvarnu istoriju dnevnog rada/izmena. Lista izveštaja filtrira dnevne/nedeljne, razlikuje nacrte i objavljene, paginira i otvara postojeće detalje/formu sa izabranim tipom. Mobilni i desktop rasporedi su implementirani; završna browser vizuelna provera nije izvršena zbog prekida browser alata.

**Rukovodilac — četvrti talas:** [priprema/objava izveštaja i ideje sektora](docs/MANAGER_WAVE_04.md) na `/reports/new`, `/reports/:id` i `/ideas`. Forma nastavlja postojeći nacrt, čuva sažetak uz automatske podatke i objavljuje predsedniku, uz zaštitu verzije i dvostruke objave. Ideje imaju sektorske brojače, filtere i paginaciju. Mobilni/tablet/desktop rasporedi naknadno su provereni u Chrome-u, uključujući očuvanje unosa pri resize-u, mobilno čuvanje/objavu i filtere ideja; obim i ograničenja su u dokumentaciji talasa.

**Rukovodilac — peti talas:** [detalji/odluka o ideji i obaveštenja](docs/MANAGER_WAVE_05.md) završavaju deset planiranih rukovodiočevih ekrana. Privatni prilozi, razgovor, obrazložena dorada i prosleđivanje povezani su sa postojećim API-jem; odluka ima potvrdu i zaštitu od konkurentnog/ponovljenog slanja. Obaveštenja imaju rukovodiočeve kategorije i direktne linkove. Mobilni, tablet i desktop rasporedi pregledani su u Chrome-u. Prolaze 73 serverska, 26 klijentskih i 40 live RBAC podprovera, sintaksa i build; smoke ostaje 15/19 zbog poznatih demo pretpostavki. Detaljan obim i preostale provere navedeni su u dokumentaciji talasa.

**Telefon, tablet i desktop:** svih osam zaposlenih i prva dva rukovodiočeva ekrana dobili su prilagodljiv raspored u [responsive dopuni](docs/RESPONSIVE_LAYOUTS.md). Na telefonu ostaje donja navigacija; od 1024 px bočna, a veće širine koriste kolone i široke projektne redove. Ista aplikacija radi u browseru i kao PWA, bez dupliranja formi. Provere i ograničenja narednih ekrana opisani su u dokumentaciji svakog talasa. Svaki talas prvo prati mobilne reference, a zatim dobija tablet/desktop raspored.

`client` i `server` sada imaju zasebne `package-lock.json` i `node_modules` direktorijume. Root nema npm workspaces ni svoje zavisnosti; `package.json` služi za pomoćne komande. Stari root `node_modules` nastajao je zbog npm workspaces hoisting-a. Verzije paketa pri razdvajanju nisu menjane.

**Važno:** Ovo je razvojna v0.1 osnova, ne sertifikovana gotova produkciona aplikacija. Završno integraciono, mobilno, sigurnosno i PWA testiranje obavezno je pre pristupa stvarnim podacima kompanije.

## 1. Tehnički zahtevi

- Node.js **22 ili noviji**, npm (Mongoose 9 zahteva najmanje Node 20.19).
- MongoDB 8 (lokalno preko Dockera ili MongoDB Atlas sa ograničenim pristupom).
- Za produkciju: HTTPS, domen npr. `overview.example.company`, privatno skladište dokumenata, backup i nadzor.
- Za iOS PWA instalaciju koristiti Safari i „Add to Home Screen”; za Android instalaciju u podržanom browseru. Podrška za Web Push na iOS-u zavisi od verzije sistema i načina instalacije.

## 2. Pokretanje lokalno

**PowerShell / Windows** — u glavnom folderu projekta:

```powershell
# Ako imate Docker Desktop:
docker compose -f docker-compose.dev.yml up -d

# Nezavisna instalacija oba dela iz njihovih lock fajlova:
# Pre reinstalacije zaustaviti razvojne procese (Windows zaključava esbuild.exe).
npm run install:all

# Kreiranje konfiguracije servera:
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
```

U `server/.env` podesiti:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/zepter_management_demo
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=OVDE_UPISATI_NOVU_DUGACKU_NASUMICNU_VREDNOST
COOKIE_SECURE=false
```

Siguran JWT secret može da se generiše lokalno, **bez slanja u razgovor**:

```powershell
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

**Pokretanje dva procesa u odvojenim terminalima:**

```powershell
npm run dev:server
```

```powershell
npm run dev:client
```

Zasebno je moguće pokrenuti `npm ci`, `npm run dev` i ostale komande iz odgovarajućeg `client/` ili `server/` direktorijuma. Ne treba pokretati `npm install` u root-u. Za deployment server zavisnosti mogu se instalirati komandom `npm ci --omit=dev` iz `server/`, dok frontend build zahteva i njegove dev zavisnosti.

- React PWA u razvoju: `http://localhost:5173`
- API: `http://localhost:4000`
- Provera API-ja: `http://localhost:4000/health`
- U Vite-u se `/api` i `/socket.io` prosleđuju Express serveru.
- Vite development/preview je podrazumevano dostupan samo na `localhost`. Za testiranje PWA na telefonu pripremiti odgovarajuće HTTPS okruženje.
- Production frontend je `client/dist`; potrebno je posebno podesiti hosting sa SPA fallback-om, `/api` i `/socket.io` proxy-jem. Express trenutno ne servira frontend build.

### Prvi admin i predsednik

Ne postoji javni formular za registraciju predsednika. **Admin i predsednik inicijalizuju se jednom kroz CLI**, sa različitim lozinkama.

U `server/.env` privremeno postaviti:

```dotenv
BOOTSTRAP_ROLE=admin
BOOTSTRAP_EMAIL=<korporativna_admin_adresa>
BOOTSTRAP_PASSWORD=<jaka_jedinstvena_lozinka_min_16_znakova>
BOOTSTRAP_FIRST_NAME=Admin
BOOTSTRAP_LAST_NAME=Zepter
```

Zatim pokrenuti:

```powershell
npm run bootstrap
```

Promeniti `BOOTSTRAP_ROLE=president` i postaviti drugi mejl i drugu, jaku lozinku, pa ponovo izvršiti komandu. Sistem neće napraviti drugi nalog iste privilegovane uloge. **Izbrisati `BOOTSTRAP_*` podatke iz `.env` odmah posle inicijalizacije.** Nalog predsednika je odobren automatski.

Prijaviti se kao admin; u administratorskom pregledu napraviti sektore; zaposleni se zatim registruju, a administrator ih odobrava i dodeljuje ulogu (zaposleni/rukovodilac).

## 3. Uloge i kontrola pristupa (server-side)

| Akcija | Zaposleni | Rukovodilac | Predsednik | Admin |
|---|---|---|---|---|
| Pristup projektima | Samo projekti čiji je član | Svi projekti svog sektora | Svi projekti | Administrativni pristup |
| Kreiranje projekata | Ne | Svoj sektor | Da, uz dozvolu backend-a | Da |
| Ažuriranje aktivnosti | Svoja zaduženja | Aktivnosti svog sektora | Ovlašćen pregled/uređivanje | Da |
| Dnevni unos | Samostalno | Samostalno | Pregled | Audit |
| Komentari | Dostupan projekat / aktivnost / ideja | U svom sektoru | Na svim nivoima | Administrativni pristup |
| Ideje | Podnosi, dopunjava, komentariše svoju | Vraća na doradu / prosleđuje | Pregleda prosleđene i komentariše | Audit |
| Izveštaji | Lični automatski pregled | Priprema i objavljuje sektorski | Kompanija, sektor, projekat, zaposleni | Audit |
| Nove odluke / zaduženja | Ne | Traži odluku, izvršava zaduženje | Donosi odluku, dodeljuje zaduženja | Audit |
| Odobravanje registracije | Ne | Ne | Ne | Da |

**Napomena:** Rukovodilac jednog sektora nema automatski pristup drugim sektorima. Zaposleni ne mogu dobiti lične dnevne preglede svojih kolega. U ovoj v0.1 članovi projekta pripadaju jednom sektoru; međusektorski timovi su sledeće proširenje.

## 4. Hijerarhija i tok podataka

```text
Kompanija
 └── Sektor
      ├── Rukovodilac i zaposleni
      ├── Projekti
      │     ├── Članovi / vlasnik
      │     ├── Aktivnosti + odgovorni + rok + napredak
      │     └── Komentari i prilozi
      ├── Dnevni unosi zaposlenih
      ├── Dnevni / nedeljni izveštaj sektora
      └── Ideje zaposlenih → pregled rukovodioca → predsednik
```

U ovoj verziji **napredak projekta je aritmetička sredina procenata njegovih aktivnosti**. Bez aktivnosti napredak je 0%. Za organizacije koje žele težinske faze potrebno je definisati merila po projektu pre puštanja u rad. Rukovodioci mogu menjati glavne podatke; zaposleni ažuriraju svoje aktivnosti i dnevne unose.

Dnevni i nedeljni izveštaji mogu se otvoriti po nivou kompanije, sektora, projekta ili pojedinačnog zaposlenog putem API-ja za automatski pregled. Rukovodilac uređuje i objavljuje **sektorski** izveštaj; objavljeni sektorski izveštaji se uključuju u objedinjeni pregled. Nedelja: ponedeljak–nedelja, sa datumima u formatu `YYYY-MM-DD`.

## 5. Pregled backend API-ja

Sve rute osim `/health`, `/api/public/sectors` i javnih auth akcija zahtevaju **Bearer access token**. Vite API proxy u razvoju koristi isti origin; refresh token je HttpOnly cookie.

| Modul | Metod / ruta | Funkcija |
|---|---|---|
| Auth | `POST /api/auth/register` | Registracija na čekanju |
| Auth | `POST /api/auth/login` | Prijava i sesija |
| Auth | `POST /api/auth/refresh` | Rotacija refresh tokena |
| Auth | `POST /api/auth/logout` | Odjava i opoziv sesije |
| Auth | `GET /api/auth/me` | Moj nalog |
| Auth | `POST /api/auth/change-password` | Promena lozinke |
| Admin | `GET /api/admin/registrations` | Prijave na čekanju |
| Admin | `PATCH /api/admin/users/:id/approve` | Odobravanje/uloga |
| Admin | `PATCH /api/admin/users/:id/reject` | Odbijanje |
| Admin | `PATCH /api/admin/users/:id/disable` | Deaktiviranje |
| Admin | `GET /api/admin/users` | Lista korisnika |
| Admin | `POST /api/admin/sectors` | Novi sektor |
| Admin | `PATCH /api/admin/sectors/:id` | Uređivanje sektora |
| Admin | `GET /api/admin/audit` | Evidencija promena |
| Sektori | `GET /api/sectors` | Dostupni sektori |
| Sektori | `GET /api/sectors/:id` | Pregled sektora + projekti |
| Sektori | `GET /api/sectors/:id/people` | Zaposleni u sektoru |
| Korisnici | `GET /api/users`, `GET /api/users/:id` | Dostupni korisnici i profil |
| Projekti | `GET /api/projects`, `GET /api/projects/:id` | Spisak / detalji |
| Projekti | `POST /api/projects`, `PATCH /api/projects/:id` | Kreiranje / ažuriranje |
| Aktivnosti | `GET /api/activities/project/:projectId` | Aktivnosti projekta |
| Aktivnosti | `GET /api/activities/:id` | Detalji aktivnosti |
| Aktivnosti | `POST /api/activities/project/:projectId` | Dodela nove aktivnosti |
| Aktivnosti | `PATCH /api/activities/:id` | Napredak, status, sadržaj |
| Dnevni rad | `POST /api/worklogs` | Novi dnevni unos |
| Dnevni rad | `GET /api/worklogs/mine` | Moji unosi |
| Dnevni rad | `GET /api/worklogs/team` | Unosi sektora/predsednika |
| Dnevni rad | `GET /api/worklogs/compliance?day=...` | Ko nije uneo rad |
| Komentari | `GET /api/comments?targetType=...&targetId=...` | Komentari po sadržaju |
| Komentari | `POST /api/comments` | Komentar ili instrukcija |
| Komentari | `PATCH /api/comments/:id/resolve` | Označi instrukciju rešenom |
| Komentari | `GET /api/comments/mine/instructions` | Predsednikove instrukcije |
| Ideje | `GET /api/ideas`, `POST /api/ideas` | Lista / slanje ideje |
| Ideje | `GET /api/ideas/:id`, `PATCH /api/ideas/:id` | Detalji / dorada |
| Ideje | `POST /api/ideas/:id/resubmit` | Ponovno slanje |
| Ideje | `POST /api/ideas/:id/review` | Prosledi ili vrati na doradu |
| Izveštaji | `GET /api/reports/preview?scope=company&...` | Dinamički izveštaj |
| Izveštaji | `GET /api/reports`, `GET /api/reports/:id` | Prethodni / objavljeni |
| Izveštaji | `POST /api/reports`, `PATCH /api/reports/:id` | Nacrt sektorskog izveštaja |
| Izveštaji | `POST /api/reports/:id/publish` | Objavljivanje predsedniku |
| Zaduženja | `GET /api/assignments`, `POST /api/assignments` | Predsednik → rukovodilac |
| Zaduženja | `PATCH /api/assignments/:id` | Izvršenje i odgovor |
| Zahtevi | `GET /api/requests`, `POST /api/requests` | Rukovodilac → predsednik |
| Zahtevi | `PATCH /api/requests/:id/decision` | Odluka predsednika |
| Predsednik | `GET /api/dashboard/overview` | Pokazatelji prema ulozi |
| Predsednik | `GET /api/dashboard/attention` | Problemi, zahtevi i rokovi |
| Obaveštenja | `GET /api/notifications` | Lista / nepročitana |
| Obaveštenja | `PATCH /api/notifications/:id/read` | Obeleži pročitano |
| Obaveštenja | `POST /api/notifications/push/subscribe` | Pretplata uređaja |
| Prilozi | `POST /api/attachments?targetType=...&targetId=...` | Zaštićen upload (`file`) |
| Prilozi | `GET /api/attachments/config` | Dozvoljeni formati i stvarno ograničenje veličine |
| Prilozi | `GET /api/attachments/target/:type/:id` | Prilozi sadržaja |
| Prilozi | `GET /api/attachments/:id` | Autentifikovano preuzimanje |

**Primeri upita:**

```http
GET /api/reports/preview?scope=company&type=weekly&day=2026-11-07
GET /api/reports/preview?scope=sector&id=<sectorId>&type=daily&day=2026-11-07
GET /api/reports/preview?scope=project&id=<projectId>&type=weekly&day=2026-11-07
GET /api/reports/preview?scope=employee&id=<userId>&type=daily&day=2026-11-07
GET /api/comments?targetType=activity&targetId=<activityId>
```

**Primer dnevnog unosa:**

```json
{
  "day": "2026-11-07",
  "activityId": "507f1f77bcf86cd799439011",
  "done": "Ažurirana hero sekcija i pripremljena verzija za mobilni prikaz.",
  "nextSteps": "Dodatna provera pristupačnosti.",
  "blockers": "",
  "updatedProgress": 75,
  "minutes": 180
}
```

## 6. PWA, obaveštenja i bezbednost

- PWA manifest, ikonice 192×192 i 512×512, `display: standalone`, registrovan service worker.
- **Ne keširaju se autentifikovani API odgovori, privatni dokumenti niti korisničke informacije.** Ako mreža nije dostupna, privatni podaci nisu dostupni za rad bez posebne offline implementacije.
- Express pruža REST podatke; Socket.IO javlja nove događaje i zahteva osvežavanje sadržaja na ekranu.
- Push obaveštenja su **opciona**, uključuju se pomoću VAPID parametara i uz dozvolu korisnika, nakon PWA instalacije tamo gde platforma to zahteva.
- Access token traje 15 minuta i čuva se u memoriji klijenta. Refresh token se rotira i čuva samo u HttpOnly cookie-u; server čuva njegov hash. Promena lozinke opoziva postojeće sesije.
- Upload je ograničen po veličini, formatu i MIME detekciji, smešta se van javne putanje; prilozi se preuzimaju preko autentifikovanog API-ja. **Antivirusno skeniranje i eksterni objekat storage potrebni su pre produkcije.**
- HTTPS je obavezan na javno dostupnom serveru, posebno za PWA i push.

## 7. Šta mora dodatno pre produkcije

1. Instalirati zavisnosti, pokrenuti oba procesa, obaviti integracione testove uz realan MongoDB i testne korisnike svih uloga.
2. Posebno istestirati **RBAC**: zaposleni ne smeju da čitaju ni uređuju tuđe dnevne zapise, a rukovodioci ne smeju upravljati drugim sektorima.
3. Uvesti **MFA za predsednika i administratore** i proces oporavka naloga; ova v0.1 ih još ne implementira.
4. Definisati produkcionu infrastrukturu: MongoDB Atlas ili privatni MongoDB, revizorske logove, automatske rezervne kopije, TLS, monitoring i minimalna prava pristupa.
5. Zameniti lokalni upload skladištem sa antivirusnim proverama i politikom zadržavanja podataka.
6. Za više server instanci uvesti Redis adapter za Socket.IO i distribuirani rate limiting; trenutni rate limit je po procesu.
7. Uvesti scheduler za podsetnike zaposlenima na dnevni unos, sa vremenskom zonom, radnim danima i praznicima prema pravilima kompanije.
8. Uskladiti React vizuelne komponente sa svih 27 ranije dizajniranih ekrana, testirati na Androidu i iPhone-u, uključujući realne korisničke tokove i obaveštenja.
9. Dopuniti automatizovane API, autentifikacione, E2E i load testove. Postoje početni unit/regresioni testovi i posebna lokalna integraciona RBAC grupa; to nije potpuna testna matrica.
10. Precizirati izvore istine za procenat realizacije (jednostavan prosek aktivnosti u v0.1), međusektorske projekte i tok odobravanja izveštaja.

## 8. Testiranje i izgradnja

```powershell
npm run test:server
npm run test:client
npm run check:server
npm run build:client
```

Za integracione provere prvo pokrenuti backend sa postojećom lokalnom demo bazom. U lokalnom `server/.env` mora biti podešena `DEMO_SEED_PASSWORD` koja odgovara već postojećim nalozima. Ove komande ne seeduju i ne resetuju bazu:

```powershell
npm run smoke:demo
npm run test:rbac
```

`API_TEST_BASE_URL` opciono menja adresu RBAC testa (podržan samo lokalni API); `PORT` menja port postojećeg smoke testa. Live testovi čitaju poslovne podatke; prijava pravi sesiju i ažurira `lastLoginAt`. RBAC grupa na kraju odjavljuje svoje testne sesije. Auth rate limit je 12 pokušaja na 15 minuta po IP-u; ne ponavljati suite u petlji. Unit/regresioni testovi ne pristupaju MongoDB-u, ali regresije ruta koriste privremeni localhost HTTP port.

**Potvrđeno 8. novembra 2026, posle drugog talasa:** prolaze 26/26 serverskih i 5/5 klijentskih testova, serverska sintaksa, frontend/PWA build i 28/28 live RBAC podprovera. Upisi kroz browser provereni su na izolovanim podacima u memoriji, bez MongoDB veze. Postojeći smoke sada ima 15/19: dve ranije pretpostavke o već odobrenom kandidatu i dve provere današnjih izveštaja, pošto demo evidencije završavaju 7. novembra, a za 8. novembar nema unosa. Baza nije menjana radi testa. Detalji su u [proverama drugog talasa](docs/EMPLOYEE_WAVE_02.md#provere).

`npm audit` je prijavio 0 serverskih i 6 frontend build-tool nalaza (2 low, 4 moderate, bez high/critical). Automatsko ažuriranje nije rađeno. Pokrenuti relevantne testove nakon svake značajne izmene; uspešan build nije dokaz da je mobilni dizajn ili stvarna PWA instalacija završena.
