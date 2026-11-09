# Optimizacija i probno objavljivanje na besplatnim planovima

Izmene su pripremljene na `develop`; nije izvršen deploy, commit, push, prenos baze na Atlas niti promena postojećih naloga i predsednikovog ključa. Dodati su lokalni indeksi; postojeći poslovni zapisi i fajlovi nisu migrirani niti brisani.

## Izbor hostinga i stvarna ograničenja

Predlog je **Cloudflare Pages + Render Free + MongoDB Atlas Free**, sa backend-om i Atlas klasterom u bliskim evropskim regionima, npr. Frankfurt kada je dostupan. Nije merena razlika Cloudflare/Vercel mreže iz Srbije, pa se ne tvrdi da je jedan CDN brži u stvarnom deployment-u. [Vercel Hobby](https://vercel.com/docs/plans/hobby) ograničen je na ličnu, nekomercijalnu upotrebu, što nije dobar izbor za ovaj poslovni portal.

[Render Free](https://render.com/docs/free) uspavljuje servis posle 15 minuta bez dolaznog saobraćaja; sledeće buđenje prema njihovoj dokumentaciji traje oko minut. Nema izmene JavaScript-a koja može garantovati trenutno buđenje tog plana. Nisu dodati cron/keep-alive pozivi za održavanje servisa budnim. Prvo otvaranje odmah pokreće jedan javni readiness zahtev dok se frontend učitava, prikazuje status i dopušta ponovni pokušaj. Poslovni upisi i prijava se ne ponavljaju radi buđenja.

Render lokalni disk gubi sadržaj pri restartu, redeploy-u i uspavljivanju; Free nema trajni disk. Zato konfiguracija za Render zahteva **GridFS** umesto lokalnog skladišta. [Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) ima ograničen prostor i broj operacija; binarni prilozi dele taj prostor sa bazom i indeksima. Potrošnju treba pratiti tokom prezentacije. Nakon dugotrajne neaktivnosti klaster može zahtevati ručno nastavljanje rada u Atlas-u.

[Pages Functions](https://developers.cloudflare.com/pages/functions/pricing/) troše kvotu Workers Free zahteva, dok se statički fajlovi poslužuju odvojeno. Proxy se izvršava samo za `/api/*` i `/socket.io/*`, a ne za svaku stranicu/ikonu. To čuva isti origin za HttpOnly cookie, API, dokumente i obaveštenja, bez oslanjanja na third-party cookies. Stvarna isporuka WebSocket-a, cookies i cold-start odziv na izabranim cloud nalozima moraju se proveriti posle deploy-a.

## Šta je optimizovano

- Role shell komponente, njihovi stilovi i Socket.IO klijent učitavaju se po potrebi. Trideset postojećih pomoćnih funkcija premešteno je bez izmene tela u lazy `features/legacy/LegacyPages.jsx`. Jedinstven Auth context i forme ostaju sačuvani.
- HTML prikazuje osnovni status odmah. Mali `wake.js` započinje credential-free `/api/ready` GET pre React pokretanja. Aplikacija i API učitavaju se paralelno. Readiness čeka do oko 90 sekundi ukupno, sa ograničenim ponavljanjem samo javnog GET-a, zatim nudi ručni retry. Ne prikazuje se korisnički sadržaj pre autentifikacije.
- Istovremeni identični GET zahtevi dele jedan transport. Rezultat se ne čuva kao keš. Svaki pretplatnik može nezavisno prekinuti zahtev; kada svi odu, transport se prekida. Promena korisnika, upis i novi socket događaj razdvajaju naredna čitanja. Stari odgovori ne mogu vratiti drugog korisnika u aplikaciju.
- Grupisani događaji obaveštenja osvežavaju prikaze jednom po kratkom talasu, umesto da šalju više identičnih zahteva. Povratak na vidljivu karticu osvežava aktivne resurse. Transport greška socket-a ne šalje novi auth refresh POST; auth oporavak se koristi samo za odbijen pristup.
- Predsednikova pažnja deli ista brojanja unutar jednog zahteva: **8 umesto 17** count operacija. Novi zahtev ponovo čita aktuelnu bazu. Početni pregled kompanije dobija i ukupnu pažnju i sektorske brojače iz istih grupisanih rezultata, bez dodatnih šest count upita. Nezavisna čitanja instrukcija/projekata rade paralelno. Pretraga sektora ne sužava ukupnu kompanijsku pažnju.
- Dodati su indeksi za članstva projekata, dodeljene aktivnosti, sektor/datum evidencije, komentare/odgovore, status ideja i nepročitana obaveštenja. Produkcija koristi pool od najviše 10 konekcija, bez minimalnog toplog pool-a, i ne pravi sve indekse pri svakom cold startu. Operator jednom pokreće `db:indexes`; skripta ne briše postojeće indekse.
- PWA unapred preuzima samo mali javni shell i ikone. Javni hashed JS/CSS fajlovi keširaju se tek pri stvarnom korišćenju, sa ograničenjem broja. Nema keširanja API odgovora, privatnih dokumenata, predsedničkih URL-ova ili korisničkih podataka. Privatni rad i dalje zahteva mrežu.

## Merljive veličine

Veličine su lokalni produkcioni build, bez tvrdnje da predstavljaju mrežno vreme na Render-u. Jedinice u tabeli su decimalni KB.

| Mera | Pre | Posle |
| --- | ---: | ---: |
| Ulazni JS za prvi prikaz | 454,8 KB | 227,2 KB |
| Osnovni JS nakon učitavanja aplikacije, pre konkretne uloge | 454,8 KB | 357,0 KB |
| CSS za prvi osnovni prikaz | 126,0 KB | 1,2 KB |
| CSS osnovne aplikacije, pre konkretne uloge | 126,0 KB | 22,0 KB |
| PWA početni precache | oko 900 KiB | 9,81 KiB |

Predsednički početni ekran sa svim potrebnim deljenim kodom: oko **381,9 KB JS + 74,2 KB CSS**, odnosno oko **140,4 KB gzip zbirno**. Socket klijent, service worker i kasnije posećeni ekrani predstavljaju dodatne odložene resurse. Stilovi koje više uloga deli eksplicitno se uvoze; ušteda ne zavisi od uklanjanja dizajna.

Ponovljivo merenje:

```powershell
npm run build:client
npm run check:bundle
```

Provera čita Vite manifest, obilazi i deljene statičke zavisnosti i prijavljuje prvi ekran svake uloge. Budžet ulaznog paketa je 300 KB JS / 5 KB CSS; ne tvrdi da su svi ekrani svedeni samo na tu veličinu.

## Privatni prilozi

Novo opciono polje `Attachment.storage` razlikuje `local` i `gridfs`. Stari dokumenti bez tog polja ostaju kompatibilni sa lokalnim fajlovima. Nove GridFS datoteke su u privatnim `privateAttachments.files` i `privateAttachments.chunks` kolekcijama; [MongoDB GridFS](https://www.mongodb.com/docs/drivers/node/current/crud/gridfs/) deli binarne podatke na segmente i omogućava streaming bez učitavanja celog priloga u RAM.

Upload i dalje proverava cilj, autora, veličinu, format i stvarni MIME. Postojeći uploadId sprečava duplikate. GridFS download i delete prolaze iste API provere ovlašćenja; nema javne putanje. Posle potvrđenog upisa briše se samo privremeni upload fajl. U lokalnom radu podrazumevani storage ostaje `local`.

Pre prenosa postojećih priloga na Render, uz izričit nalog za migraciju i backup baze, iz `server/`:

```powershell
# Pregled bez upisa; server/.env mora upućivati na izabranu bazu i stvarne lokalne fajlove.
npm run attachments:gridfs

# Eksplicitni prenos nakon pregleda:
npm run attachments:gridfs -- --apply
```

Skripta najpre proverava prisustvo i veličinu svih lokalnih fajlova. Pre upisa pravi privatni backup metapodataka u ignorisanom `backups/attachments/`; svaki preneti fajl čita nazad i proverava SHA-256. Čuva attachment ID, veze i vreme poslovnog ažuriranja. Originalni lokalni fajlovi ostaju. CAS provera sprečava prepisivanje istovremene izmene; ponovljen poziv preskače potvrđene prenose. Kod delimičnog neuspeha proveriti stanje/backup pa nastaviti, bez brisanja originala.

Tek zatim izvesti celu bazu, uključujući GridFS kolekcije, i uvesti je u Atlas. Sam `mongodump` stare baze bez prenosa binarnih fajlova nije dovoljan za očuvanje lokalnih priloga. U ovom zadatku migracija postojeće baze nije izvršena.

## Podešavanje probnog deployment-a

1. Sačuvati/pushovati odobrene izmene na `develop`. Pripremiti Atlas bazu, korisnika i mrežna pravila za backend. Koristiti isti region kada je dostupan. URI se unosi samo u privatna serverska podešavanja.
2. Iz lokalnog `server/`, sa privatno podešenim Atlas `MONGODB_URI`, jednom pokrenuti `npm run db:indexes`. To treba uraditi posle importa podataka i pre otvaranja portala. Ne stavljati URI u shell istoriju, Git ili frontend build promenljive.
3. Render konfiguracija je u root `render.yaml`: Free Node web servis, `rootDir: server`, build `npm ci --omit=dev`, start `npm start`, health `/health`. Node major je 22. Ne postoji seed, reset ili indeksiranje u startup komandi. Podesiti privatni `MONGODB_URI`, jak `JWT_SECRET` od najmanje 64 znaka, tačan frontend `CLIENT_ORIGIN`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=strict`, `TRUST_PROXY=1`, `ATTACHMENT_STORAGE=gridfs`, `MONGO_POOL_SIZE=10`. JWT vrednost generisati lokalno kao u README-u; ne koristiti Render `generateValue`, čiji je podrazumevani format kraći od postojeće aplikacione provere. VAPID vrednosti postaviti ako se koristi postojeći Web Push.
4. Cloudflare Pages Git projekat: **root `client`**, build `npm ci && npm run build`, output `dist`, Node 22. U server-side Pages Functions podešavanjima postaviti `BACKEND_ORIGIN=https://<naziv-servisa>.onrender.com`, bez putanje. Ne koristiti `VITE_` za tajne. Projektu je potreban Git build/Functions deployment; upload samo sadržaja `dist` kroz statički drag-and-drop ne postavlja Functions proxy.
5. Functions iz `client/functions/` prosleđuju API, streaming priloge i Socket.IO. `_routes.json` ograničava obradu na API/socket putanje. `_headers` daje immutable cache javnim hashed assets, no-referrer/noindex i sprečava keširanje service worker-a i ličnih predsedničkih putanja. Ne dodavati analytics za lične URL-ove. Pages koristi SPA fallback kada nema sopstvenog 404 dokumenta.
6. `CLIENT_ORIGIN` mora biti konačni Pages/custom domen. Predsednikov isti privatni path/ključ dobija taj domen, bez regenerisanja linka u bazi. Lokalni URL sa `localhost` ne služi udaljenom pristupu. Preview domen nije automatski dozvoljen za auth.
7. Posle objave proveriti hladno i toplo otvaranje, sve četiri uloge, ponovljeno otvaranje predsedničkog linka na drugom uređaju, cookie refresh, upload/download posle restarta, Socket.IO obaveštenja, deep links, mobilnu instalaciju i Web Push. Free limite pratiti tokom probnog korišćenja.

## Provere

- Unit/regresije: 172 serverska i 91 klijentski test; uspešni serverski syntax check, frontend/PWA build i provera bundle budžeta.
- 20 stvarnih HTTP/MongoDB provera u novoj izolovanoj bazi: privatni upload/download, strani sektor, idempotentnost, ponovno povezivanje bez lokalnog fajla, MIME validacija, brisanje binarnih segmenata, migracija sa SHA proverom i očuvanim originalom, ponavljanje i indeksi. Iz `server/`: `ZEPTER_PERF_DB_TEST=1`, zatim `node tests/integration/performance-isolated.mjs`. Skripta zatvara HTTP server, briše samo svoju potvrđenu testnu bazu i čisti testni temp folder.
- Live smoke 19/19 i RBAC 43/43 podprovere; sopstvene testne sesije odjavljene. Postojeća baza nije menjana radi zelenog testa. Predsednikov URL: 13 provera i dve odjavljene testne sesije, bez promene/ispisa ključa.
- Lokalno su indeksi provereni/dodati za 17 modela, bez brisanja zapisa i drugih indeksa. Deploy konfiguracija/proxy imaju izolovane testove za cookies, zabranu proizvoljnog odredišta i očuvanje WebSocket upgrade odgovora; to nije stvarna cloud E2E potvrda.
- Ugrađeni browser je vratio `Browser is not available: 2`. Pokušaj preko `computer-use` je zaustavljen jer alat nije mogao pouzdano utvrditi URL. Dalji UI input nije izvršavan. Interaktivni browser pregled, Lighthouse, stvarna mobilna PWA instalacija, cloud cold-start vreme i Cloudflare/Render/Atlas E2E ostaju otvoreni. Ranija vizuelna ograničenja nisu proglašena rešenim.
