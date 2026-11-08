# Zepter Management Overview — pravila za rad

## Obuhvat i način rada

- Nastavljaj postojeću MERN aplikaciju; ne pravi projekat ponovo i ne uklanjaj funkcionalnosti koje rade.
- Pre izmene pročitaj `README.md`, `BACKEND_FUNKCIONALNOSTI.md`, `docs/ANALIZA_PROJEKTA.md`, `docs/PLAN_FRONTEND.md` i relevantan postojeći kod.
- Rad se nastavlja na grani `develop`. Implementirano je osam ekrana zaposlenog i deset rukovodiočevih ekrana, u talasima po dve dostavljene reference. Sledeći razvoj i reference određuje korisnik; ne zatvaraj automatski preostale provere ranijih talasa.
- Ne radi automatski git commit, push, reset, force-push ili prepisivanje tuđih izmena.
- Ne menjaj MongoDB šemu, nazive statusa ni API ugovore bez potrebe. Kada je promena potrebna, objasni kompatibilnost i eventualnu migraciju.

## Instalacija i komande

- `client` i `server` su nezavisni npm projekti, svaki sa svojim `package-lock.json` i `node_modules`.
- Root `package.json` služi samo kao skup pomoćnih komandi. Ne uvodi ponovo npm workspaces ni root zavisnosti bez obrazloženog zadatka.
- Instalacija iz root-a: `npm run install:all`. Zasebno: `npm ci` iz `server/` ili `client/`.
- Razvoj u dva terminala: `npm run dev:server` i `npm run dev:client`.
- Provere: `npm run test:server`, `npm run check:server`, `npm run build:client`.
- Integracija sa već pokrenutim lokalnim demo API-jem: `npm run smoke:demo`, `npm run test:rbac`.
- Node.js >=22; frontend i backend moraju raditi i bez root `node_modules`. Čuvaj lock fajlove u Gitu.
- Nemoj automatski pokretati `npm audit fix` ili menjati verzije tokom nepovezanog zadatka.

## Podaci i tajne

- Ne briši, resetuj, ponovo seeduj bazu niti menjaj demo naloge ili lozinke bez izričitog naloga korisnika.
- `bootstrap`, `seed-demo.js` i `reset-demo-password.js` nisu deo instalacije, development starta ni automatskih testova.
- Lokalna demo baza: `mongodb://127.0.0.1:27017/zepter_management_demo`; API: `http://localhost:4000`; frontend: `http://localhost:5173`.
- Ne prikazuj sadržaj `.env`, tokene, hash lozinke, JWT/VAPID tajne, privatne priloge ili lične podatke u logu, izveštaju ili odgovoru.
- Ne hardkoduj lozinke i tajne. `.env.example` sadrži samo netajne primere i prazna polja za tajne; lokalni `.env` ne prepisuj ako postoji.
- `node_modules`, `.env*` osim `.env.example`, upload direktorijumi, logovi, backup-i i dump-ovi ne idu u Git. Ako se promeni upload putanja unutar repozitorijuma, dopuni `.gitignore`.
- Integracioni testovi nad postojećom bazom smeju samo da čitaju poslovne podatke. Prijava menja `lastLoginAt` i pravi sesiju; testne sesije odjavi. Testove pisanja izvršavaj sa modelima u memoriji ili posebnom izolovanom bazom.
- Za browser provere pisanja dostupan je `server/tests/fixtures/employee-ui-server.mjs`, sa eksplicitnim `ZEPTER_UI_FIXTURE=1`, bez MongoDB veze, na loopback portu 4002. Pročitaj `docs/EMPLOYEE_WAVE_02.md` za pokretanje i gašenje; kroz agentski terminal koristi `tty:true` ako želiš da radi komanda `stop`. Ugasiti testni proces i očistiti njegove privremene priloge pre završetka zadatka.
- Ne menjaj postojeće podatke da bi test postao zelen. Jasno prijavi zastarele demo pretpostavke i stvaran rezultat.
- Dopunska browser QA za izveštaje/ideje koristi opcioni `ZEPTER_UI_QA=1` samo u izolovanom fixture-u i `server/tests/fixtures/manager-ui-qa.mjs`. Kontrole simuliraju greške i prazne odgovore bez MongoDB veze; postupak je u `docs/MANAGER_WAVE_04.md`. Standardni `manager-wave04-check.mjs` pokreni na svežem fixture-u bez QA režima (početna četiri predloga); QA režim dodaje još 12 ideja.

## Ovlašćenja

- Backend je izvor autorizacije; UI ruta ili skriveno dugme nisu bezbednosna granica.
- Administrator jedini odobrava registracije i konačnu ulogu. Javni unos `requestedManager` nije dodela ovlašćenja.
- Zaposleni vidi svoje projekte i lične evidencije; uređuje samo dodeljene aktivnosti. Ne dozvoli uvid u tuđe lične izveštaje ili druge sektore.
- Rukovodilac upravlja svojim sektorom. Projekti u postojećoj verziji imaju tim iz jednog sektora.
- Predsednik vidi sve sektore, projekte, aktivnosti i objavljene izveštaje; ideje vidi tek posle prosleđivanja. Ne uređuje i ne objavljuje nacrte sektorskih izveštaja.
- Predsednički nalog inicijalizuje se eksplicitnim CLI postupkom, mimo javne registracije.
- Privatni prilozi ostaju iza autorizovanih API ruta. Ne dodavati javni static upload direktorijum.
- Access token ostaje u memoriji, refresh token u HttpOnly cookie-u. Ne uvoditi localStorage za tajne.
- Pri promeni autorizacije dodaj pozitivne i negativne regresione testove za uloge i granice sektora.

## Interfejs i izveštaji

- Prioritet je predsednik na telefonu: mali broj koraka, jasni nazivi i veliki dodirni ciljevi.
- Implementirano je svih osam ekrana zaposlenog i svih deset rukovodiočevih ekrana. Zaposleni i prva dva rukovodiočeva ekrana prošli su prilagođavanje opisano u `docs/RESPONSIVE_LAYOUTS.md`; naredni talasi su u `docs/MANAGER_WAVE_02.md`, `docs/MANAGER_WAVE_03.md`, `docs/MANAGER_WAVE_04.md` i `docs/MANAGER_WAVE_05.md`, sa zasebno navedenim granicama vizuelne provere. Dostavljene slike određuju mobilni raspored i izgled; prikazani primeri imena, brojeva i projekata nisu podaci za hardkodovanje.
- Svaki naredni talas prvo implementira odobrene mobilne reference, pa prilagođava iste ekrane tabletu i desktopu. Koristi zajednički `features/workspace` shell: donja navigacija na telefonu/tabletu, bočna od 1024 px, detalji u kolonama od 1200 px. Ne ograničavaj desktop na simulirani telefonski okvir.
- Očuvaj jednu instancu forme/razgovora na svim širinama; ne remount-uj sadržaj na resize i ne pravi odvojene mobilne i desktop kopije forme. Proveri očuvanje započetog unosa pri promeni širine.
- Drugi rukovodiočev talas i provere opisani su u `docs/MANAGER_WAVE_02.md`. Projektni PATCH koristi opcioni `If-Match`; ne uklanjaj člana sa postojećim dodelama i ne dodaj aktivnost zatvorenom/arhiviranom projektu. Kreiranje početnih aktivnosti ostaje odvojen tok sa nastavkom potvrđenih neuspeha i bez slepog retry-ja posle nejasnog ishoda. Zasebna tablet vizuelna provera tog talasa nije završena.
- Implementirani su i rukovodiočevi ekrani 5–6: `docs/MANAGER_WAVE_03.md`. Aktivnost koristi postojeća polja, verzionisani PATCH i read-only istoriju samo svog sektora, bez privatnih audit detalja. Izveštaji razlikuju nacrt/objavljen i dnevni/nedeljni tip; ne mešaj dnevne rezultate za period sa aktuelnom statistikom projekta. Browser vizuelna/E2E provera ovog talasa nije završena zbog prekida browser alata.
- Četvrti rukovodiočev talas, priprema/objava izveštaja i ideje sektora, opisan je u `docs/MANAGER_WAVE_04.md`. Nastavljaj postojeći nacrt istog perioda, koristi `If-None-Match` za novi i `If-Match` za čuvanje/objavu. Ne prikazuj današnji pregled kao snapshot starijeg objavljenog izveštaja bez sačuvanih podataka. `/ideas/sector` i `/reports/prepare` koriste sektor sesije; review obuhvata submitted i in_review. Naknadna Chrome provera potvrdila je 320/390/820/1440 px, očuvanje unosa pri resize-u, mobilno čuvanje/objavu i osnovne tokove ideja; obim i ograničenja su u dokumentaciji talasa.
- Peti rukovodiočev talas je u `docs/MANAGER_WAVE_05.md`. Review koristi `If-Match` i atomski prelaz iz submitted/in_review; dorada zahteva obrazloženje. Prosleđivanje nije odobrenje za realizaciju. Sačuvaj autorsku dopunu sopstvene ideje rukovodioca. `view=manager` obaveštenja uvek koriste primaoca iz sesije; kategorije po akteru zavise od aktuelne uloge, a „Odgovori zaposlenih“ obuhvataju i komentare. Ne izmišljaj događaje kašnjenja koje postojeći mehanizmi nisu poslali. Ne ponavljaj odluku posle nejasnog ishoda bez provere servera.
- Rukovodilac ima nove `/dashboard/manager` i `/projects/sector` feed-ove, vezane isključivo za sektor sa sesije. „Po planu“ i „Na proveri“ su izvedene oznake, ne novi statusi; pravila su u `docs/MANAGER_WAVE_01.md`. Model nema posebno ime tima: koristi stvarni sektor, odgovornu osobu i članove, bez izmišljanja timova.
- Srpska latinica, bela pozadina, zlatni akcenti, tamna čitljiva tipografija. Ne izmišljaj novi identitet.
- Koristi odobrene referentne slike kada budu dostupne. Ne tvrdi da je ekran veran dizajnu bez reference i vizuelne provere.
- Komentari pripadaju sektoru, projektu, aktivnosti ili ideji; ne uvodi poseban ekran komentara zaposlenog.
- Evidencija rada je osnov za izveštaje. Izbegavaj višestruko unošenje istog sadržaja. Datumi izveštavanja su u `Europe/Belgrade`, nedelja ponedeljak–nedelja.
- Ne keširaj privatne API odgovore i priloge u service worker-u. PWA testiraj na realnom telefonu preko odgovarajućeg HTTPS okruženja.
- Development server podrazumevano ostaje na localhost; mrežni pristup i produkciono objavljivanje traže odgovarajući zaseban zadatak.

## Završna provera

- Pokreni relevantne testove, serversku proveru sintakse i frontend build nakon značajne izmene.
- Za UI promene proveri mobilni raspored, stanja učitavanja/greške/praznih lista, pristupačnost i sve relevantne uloge.
- Pregledaj `git diff --check`, diff i ignorisanje poverljivih fajlova. Ne ostavljaj privremene testne servere.
- Navedi šta je promenjeno, šta je provereno, stvarne rezultate i ograničenja. Build nije zamena za vizuelni, E2E ili bezbednosni pregled.
