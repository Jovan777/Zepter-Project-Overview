# Rukovodilac — treći talas: aktivnost i izveštaji

Datum: 8. novembar 2026. Grana `develop`, bez commit-a ili push-a. Prethodne nekomitovane izmene drugog talasa su sačuvane i nastavljene.

## Obuhvat i reference

| Ekran | Ruta | Referenca |
|---|---|---|
| Detalji aktivnosti — Upravljanje | `/activities/:id` | [Mobilna referenca](design/manager/05-activity-management.png) |
| Dnevni i nedeljni izveštaji sektora | `/reports?type=daily` / `?type=weekly` | [Mobilna referenca](design/manager/06-sector-reports.png) |

Nove komponente učitavaju se po potrebi samo za rukovodioca. Drugi korisnici zadržavaju prethodne ekrane. Aktivna navigacija aktivnosti ostaje „Projekti“, jer aktivnost pripada projektu; aktivna navigacija liste izveštaja je „Izveštaji“.

Mobilni raspored implementiran je prvi prema dostavljenim referencama. Zatim je dodat tablet/desktop CSS na istim komponentama: od 768 px veći razmaci i puna širina, od 1024 px postojeći sidebar, od 1200 px pregled/uređivanje aktivnosti levo i razgovor desno; lista izveštaja levo i automatski pregled desno. Nema posebnog stabla formi po uređaju niti novih zavisnosti. Ovi rasporedi nisu vizuelno potvrđeni u browseru u ovom talasu.

## Upravljanje aktivnošću

Početni prikaz daje pregled naziva, opisa, statusa, napretka, odgovornih osoba, roka sa godinom i prioriteta. „Opis i cilj“ koristi postojeći `description`, a „Šta je urađeno“ koristi postojeći `actualWork`. Slike u referenci nisu izvor dodatnih polja modela ili lažnih fotografija.

Prikazi su „Detalji“, „Prilozi“, „Komentari“ i „Istorija“. Podrazumevani detalji uključuju opis/rezultat/sledeći korak/prepreke, privatne priloge i razgovor. Na desktopu razgovor ostaje uz izabrani sadržaj. Jedna instanca razgovora i forme ostaje montirana pri promeni taba ili širine.

- „Uredi aktivnost“ otvara inline obrazac: naziv, opis, rok, prioritet, status, napredak i odgovorne osobe.
- „Dodeli“ vodi do pretraživog izbora odgovornih članova projekta, sa najviše 30 dodela prema postojećem API ograničenju. Za proširenje tima postoji veza ka formi projekta.
- „Ažuriraj status“ vodi do statusa u istom obrascu; completed podiže procenat na 100, a 100% bez completed ide na proveru, kao na backend-u.
- Zapis urađenog rada može se izmeniti u opcionoj sklopivoj sekciji. Izmena aktivnosti ne pravi ili prepisuje `WorkLog`; dnevni unosi zaposlenih ostaju osnova izveštaja.
- Čuvanje šalje samo promenjena polja uz postojeći opcioni `If-Match`. Zastarela verzija vraća 409 i nacrt ostaje u formi; korisnik može pregledati aktuelnu verziju i izričito odbaciti svoj unos.
- Dijalog pri izlasku i `beforeunload` štite nesačuvane izmene. Osvežavanje je onemogućeno dok postoje izmene ili zahtev traje.
- Prilozi koriste postojeći autorizovani upload/download/delete, sa postojećim formatima i limitom. `.fig` iz reference nije ponuđen jer ga backend ne podržava.
- Rukovodilac može odgovoriti u kontekstu aktivnosti, poslati komentar/instrukciju i označiti sopstvenu instrukciju rešenom. Zaposleni ne dobija dodatna ovlašćenja zajedničkom komponentom razgovora.

Kreiranje aktivnosti već je uvedeno u drugom talasu kroz `/projects/:id/new-activity`; taj tok ostaje povezan sa projektom. Nije pravljen drugi sistem kreiranja.

## Stvarna istorija rada

Dodata je autentifikovana read-only ruta `GET /api/activities/:id/history`, samo za rukovodioca sa sektorom i pristupom aktivnosti. Postojeći predsednički i administratorski API tokovi nisu menjani.

Odgovor sadrži:

- `events`: paginirane `activity.created` / `activity.updated` audit stavke sa ID-jem, akcijom, datumom, osnovnim imenom autora i imenima promenjenih dozvoljenih polja;
- `worklogs`: paginirane dnevne unose iste aktivnosti, istog projekta i sektora, sa osnovnim imenom zaposlenog, datumom, urađenim, narednim koracima, preprekama i minutima.

Query parametri su `page`, `worklogPage` i `limit` (podrazumevano 10, najviše 50). Dve liste imaju nezavisnu paginaciju. Identitet i sektor ne mogu da se promene query parametrima. Odgovor je `Cache-Control: no-store`. IP adrese, kontakt podaci i proizvoljni sadržaj audit `details` ne izlaze iz rute.

Audit nema prethodne vrednosti polja, pa UI ne izmišlja vremensku liniju starih procenata/tekstova. Ako ranije nije pravljen audit ili dnevni unos, istorija je prazna. Modeli i MongoDB šema nisu menjani i migracija nije potrebna.

## Izveštaji sektora

Lista koristi postojeći `/reports?type=...&page=...&limit=10`. Dnevni/nedeljni izbor, datum automatskog pregleda i stranica su povezani sa URL-om. Server ograničava rukovodioca na sektor sa sesije, a nalog bez sektora dobija 403 pre čitanja izveštaja.

Svaka kartica prikazuje tip, pun dnevni/nedeljni period, sažetak stvarnog `results` teksta ili dostupne generisane brojače, i oznaku „Nacrt“ / „Objavljen“. Filter ne meša tipove; paginacija daje pristup i starijim izveštajima. Otvaranje vodi do postojećih detalja izveštaja.

„Novi dnevni izveštaj“ i „Novi nedeljni izveštaj“ otvaraju postojeći `/reports/new` sa unapred izabranim tipom i datumom. Stara forma sada prihvata te query vrednosti i koristi `Europe/Belgrade` datum. Njeno detaljno preuređivanje prema sedmom rukovodiočevom ekranu čeka narednu referencu. Otvaranje liste ili prečice samo po sebi ne kreira nacrt.

Sačuvan je automatski pregled sektora ili projekta iz prethodne implementacije. Prečice sa početne strane i detalja projekta zadržavaju scope/ID kontekst. Izbor projekta podržava učitavanje dodatnih stranica. Pregled preuzima postojeće dnevne unose, bez duplog kucanja; ponovni klik osvežava isti period. UI izričito razlikuje dnevne rezultate za period od statistike projekata/aktivnosti koja je u postojećem API-ju aktuelno stanje. Nedelja ostaje ponedeljak–nedelja. Ne tvrdi se da je aktuelna statistika istorijski snapshot izabranog perioda.

## Provere

| Provera | Rezultat |
|---|---|
| `npm run test:client` | 22/22; uključuje manager patch, očuvanje rada, dodele, nullable rok, status/procenat, tip/stranicu/datum i istinite sažetke izveštaja |
| `npm run test:server` | 58/58; istorija ograničena na ulogu/sektor/projekat/aktivnost, bez privatnih audit polja, nezavisna paginacija, manager upis, filtriranje izveštaja i zabrane drugih uloga/sektora |
| `npm run test:rbac` | 37/37 live podprovera, 38 sa roditeljskim testom; uključuje novu istoriju i listu izveštaja, uz odjavu sesija |
| `npm run smoke:demo` | 15/19; ista četiri ranije zabeležena neuspeha: kandidat je već odobren, nema očekivanih dnevnih evidencija kompanije/sektora za aktuelni dan |
| Izolovani API tok | Prošao `manager-wave03-check.mjs`: dodela/rok/napredak/procenat projekta, stale 409, uklanjanje roka, istorija, odgovor predsedniku, dnevna/nedeljna lista i paginacija, strani sektor, detalji i automatski nedeljni pregled |
| `npm run check:server` | Prošla sintaksa svih 50 JS/MJS fajlova |
| `npm run build:client` | Prošao React/PWA produkcioni build |

Browser kontrola je pokušavana kroz dostupni Windows Computer Use. Posle otvaranja test kartice alat je zaustavio pristup jer nije mogao pouzdano da odredi trenutni browser URL. Nisu potvrđeni završni mobilni/tablet/desktop izgled, browser tokovi pisanja, očuvanje unosa kroz resize ili puna pristupačnost ovog talasa; nisu sačuvani screenshot-ovi. To ostaje zasebna vizuelna/E2E provera, nezavisna od prolaznog build-a i API testova. Nisu testirani pravi Android/iOS, PWA instalacija ili Web Push.

Poslovni upisi izvršeni su samo u fixture modelima u memoriji, bez MongoDB veze i `.env`. Live RBAC/smoke samo čitaju poslovne podatke; prijave standardno menjaju `lastLoginAt` i kreiraju/odjavljuju sesije. Demo baza, nalozi i lozinke nisu resetovani ili menjani. Fixture je ugašen komandom `stop`, uz čišćenje njegovih privremenih priloga. Postojeći Vite server korisnika nije gašen.

## Ponovljiv izolovani test

U prvom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
$env:ZEPTER_UI_ROLE = 'manager'
node tests/fixtures/employee-ui-server.mjs
```

U drugom terminalu, na svežem fixture-u:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/manager-wave03-check.mjs
```

Runner proverava dummy fixture token i manager ulogu pre upisa, koristi samo fiksni loopback port 4002 i ne traži stvarnu bazu. Fixture sada ima i izveštaje/dnevni rad/istoriju u memoriji. `stop` gasi server i čisti njegov sopstveni temp direktorijum; kroz agentski terminal koristiti TTY. Za browser proveru uz Vite na 5173 otvoriti `/activities/555555555555555555555555` i `/reports`, pa proveriti 320/390/820/1440 px, svaku tab sekciju, prazna/greška stanja, formu sa nacrtom i promenu širine, komentare, upload i izbor tipa izveštaja.
