# Zepter Management Overview — pravila za rad

## Obuhvat i način rada

- Nastavljaj postojeću MERN aplikaciju; ne pravi projekat ponovo i ne uklanjaj funkcionalnosti koje rade.
- Pre izmene pročitaj `README.md`, `BACKEND_FUNKCIONALNOSTI.md`, `docs/ANALIZA_PROJEKTA.md`, `docs/PLAN_FRONTEND.md` i relevantan postojeći kod.
- Rad se nastavlja na grani `develop`. Po završetku osam ekrana zaposlenog, najnoviji nalog korisnika je prelazak na rukovodioca sektora, u talasima po dve dostavljene reference. Prvi talas su pregled sektora i projekti sektora.
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
- Implementirano je svih osam ekrana zaposlenog; četvrti talas obuhvata „Detalji ideje“ i „Obaveštenja“. Browser vizuelna provera četvrtog talasa čeka dostupnu browser automatizaciju; ne tvrdi da je urađena dok je lokalni browser isključen. Dostavljene slike određuju raspored i izgled; prikazani primeri imena, brojeva i projekata nisu podaci za hardkodovanje.
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
