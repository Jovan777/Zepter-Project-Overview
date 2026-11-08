# Mobilni, tablet i desktop raspored

Datum: 8. novembar 2026. Rad na `develop`, bez commit-a ili push-a.

Jedna React aplikacija sada prilagođava završene ekrane širini prozora. Telefon koristi postojeće mobilne komponente i donju navigaciju; desktop dobija bočnu navigaciju i sadržaj preko raspoložive širine. PWA manifest, service worker, autentifikacija, MongoDB šema i API ugovori nisu menjani. Instalacija PWA nije uslov za korišćenje aplikacije u običnom browseru.

## Obuhvat

| Uloga / ekran | Prilagođavanje za veće širine |
|---|---|
| Zaposleni — Moj pregled | Brojači i prečice u jednom redu; pažnja i najnoviji komentari u dve kolone |
| Moji projekti | Široki redovi sa nazivom/statusom, napretkom i rokom/otvaranjem |
| Detalji projekta | Sažetak preko cele širine, aktivnosti i tim levo, razgovor desno |
| Detalji aktivnosti | Sažetak preko cele širine, uređivanje i prilozi levo, razgovor desno |
| Moje ideje | Dve kolone kartica, sa očuvanim filterima i praznim stanjima |
| Nova ideja | Opis predloga levo; sektor, prilozi i objašnjenje slanja desno |
| Detalji ideje | Predlog, prilozi i dopuna levo; komentari desno |
| Obaveštenja | Nova i ranija obaveštenja u dve kolone; svih pet kategorija u jednom redu |
| Rukovodilac — Pregled mog sektora | Četiri brojača u redu, dve prečice za izveštaje, komentar predsednika i pažnja u dve kolone |
| Projekti sektora | Široki projektni redovi i pretraga/redosled/status u prilagodljivom redu |

Zajednički shell obuhvata i povezane postojeće pomoćne rute, uključujući dnevni unos. Ostali rukovodiočevi ekrani zadržavaju svoju prethodnu implementaciju do narednih dostavljenih referenci. Predsednički i administratorski prikaz nisu redizajnirani ovim zadatkom.

## Pravila rasporeda

- Ispod 768 px: mobilni raspored i donja navigacija prema postojećim referencama.
- Od 768 px: tablet koristi punu širinu, veće razmake i pregledne kolone; donja navigacija ostaje dostupna.
- Od 1024 px: fiksna bočna navigacija i zaglavlje sa kontekstom ekrana. Bočna traka ima sopstveno vertikalno skrolovanje za kraće prozore.
- Od 1200 px: detalji i razgovori u dve kolone, dvokolonska forma nove ideje i široki redovi projekata.
- Od 1600 px: nešto šira bočna navigacija; sadržaj ograničen na 1480 px radi čitljivosti.

`features/workspace/WorkspaceNavigation.jsx` prikazuje istu glavnu navigaciju na svim širinama. Dodatne desktop opcije ostaju skrivene i nefokusabilne na telefonu. `navigation.js` čuva postojeće rute i aktivan kontekst detalja projekta, aktivnosti, ideje i izveštaja. CSS je ograničen na `.workspace-shell` i uvezen posle postojećih stilova u `main.jsx`.

Promena širine radi kroz CSS, bez zasebnog stabla komponenti za svaki uređaj. Forma, izabrani prilozi, aktivan odgovor i zaštita nesačuvanih izmena ne dobijaju novu instancu prilikom promene širine. Nisu dodate biblioteke ili promenjene zavisnosti.

## Izvršene provere

Browser automatizacija je postala dostupna posle restarta aplikacije. Vizuelno je pregledano svih osam zaposlenih i oba završena rukovodiočeva ekrana na mobilnoj i desktop širini. Dodatne provere uključuju tablet prikaz, prelaze između rasporeda i odsustvo horizontalnog prelivanja u proverenim prikazima.

Korišćene širine: 320, 390, 820, 1024, 1440 i 1920 px. Nije svaki ekran proveren na svakoj širini. Posebno su pregledani:

- desktop i mobilna lista/detalji projekta, lista/detalji ideje, aktivnost i obaveštenja;
- nova ideja na desktopu i 320 px; isti nacrt pre i posle promene širine, dijalog pri izlasku i jedno slanje predloga;
- aktivnost na desktopu, 390 i 820 px; očuvan unos i uspešno čuvanje;
- odgovor na instrukciju uz ideju, direktno otvaranje iz obaveštenja i smanjen nepročitan brojač;
- oba rukovodiočeva ekrana na mobilnoj, tablet i desktop širini; odgovor predsedniku uz očuvan unos pri promeni širine;
- rukovodiočeva pretraga, prazna lista i uklanjanje filtera na 1024 px;
- 1920 px ograničenje širine sadržaja, aktivna navigacija, prazni prilozi i stanje učitavanja.

Prilikom provere popravljeno je preklapanje slike i sažetka projekta, skrivanje dodatnih desktop linkova na mobilnom, previše uske kartice ideja i raspored pet kategorija obaveštenja. U završnom zaposlenom prikazu nema zabeleženih console grešaka.

Sve browser provere pisanja koriste postojeći `server/tests/fixtures/employee-ui-server.mjs`, sa eksplicitnim `ZEPTER_UI_FIXTURE=1` i `ZEPTER_UI_ROLE=employee` ili `manager`, na `127.0.0.1:4002`. Nema dotenv/MongoDB veze ni upisa u demo bazu. Testni serveri ugašeni su komandom `stop`, uz čišćenje svojih privremenih priloga. Browser viewport override je uklonjen, a test tab zatvoren.

| Provera | Rezultat |
|---|---|
| `npm run test:client` | 13/13; uključuje uloge, rute i aktivan kontekst zajedničke navigacije |
| `npm run test:server` | 44/44; izolovani modeli i lokalni HTTP serveri |
| `npm run check:server` | Sintaksa 46 JS/MJS fajlova prošla |
| `npm run build:client` | Prošao React/PWA produkcioni build |
| `git diff --check` | Bez whitespace grešaka |
| Ignorisanje poverljivih fajlova | `.env`, oba `node_modules`, privatni prilozi i build ostaju ignorisani; nema praćenih ignorisanih fajlova |

Prvi pokušaj serverskih testova u sandbox-u nije mogao da pristupi svojim loopback HTTP serverima (`fetch failed`). Ista neizmenjena test komanda prošla je svih 44 provere uz dozvoljen lokalni pristup.

Live RBAC/smoke nisu ponavljani za promenu rasporeda bez serverskih izmena. Prethodni rezultat je u [prvom rukovodiočevom talasu](MANAGER_WAVE_01.md): RBAC 35/35 podprovera, smoke 15/19 zbog već odobrenog demo kandidata i nedostajućih dnevnih evidencija. Ti demo podaci nisu menjani.

Ova provera nije instalacioni PWA test na pravom Android/iOS uređaju. HTTPS, instalacija, tastatura na telefonu, Web Push i produkcioni deployment ostaju zasebne provere. Browser pregled je obuhvatio osnovne vizuelne tokove; nije ponovljen svaki konkurentni/greška scenario prethodnih talasa.

## Nastavak razvoja

Svaki naredni talas najpre prenosi dve odobrene mobilne reference, zatim prilagođava iste ekrane tabletu i desktopu koristeći ovaj zajednički shell. Proveriti i prelaz širina sa započetim unosom. Sledeći rukovodiočevi ekrani čekaju korisnikove reference.
