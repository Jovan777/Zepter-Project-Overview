# Rukovodilac — Pregled mog sektora i Projekti sektora

Datum: 8. novembar 2026. Grana: `develop`. Prvi talas rukovodiočevog interfejsa nastavlja postojeću aplikaciju; prethodne izmene zaposlenog ostaju sačuvane.

## Ekrani

- `/`: stvarni naziv sektora, četiri brojača (projekti, zakašnjele aktivnosti, ideje na pregledu, nepročitana obaveštenja o predsednikovim komentarima), sklopljeni pregled svih statusa projekata, dnevni/nedeljni izveštaj, poslednji predsednikov komentar sektoru, odgovor u kontekstualnom razgovoru, projekti koji zahtevaju pažnju i do tri ideje koje čekaju pregled. Postojeći linkovi za predsednikova zaduženja i pitanje predsedniku su sačuvani.
- Brojači kašnjenja i predsednikovih komentara otvaraju proširene liste sa paginacijom po šest. Lista komentara je istorija predsednikovih poruka na sektoru/projektima/aktivnostima/idejama; nepročitana obaveštenja označavaju se na postojećem ekranu obaveštenja. Otvaranje istorije samo po sebi ne označava obaveštenja pročitanim.
- „Odgovori“ otvara razgovor sektora i bira konkretan predsednikov komentar kao roditelja. Koristi postojeći `/comments`; uspešan odgovor na otvorenu instrukciju menja njen status u `answered`. Paginacija proširenih lista i osvežavanje pregleda ne uklanjaju otvorenu formu odgovora. Sklapanje razgovora zadržava lokalno unet tekst dok korisnik ostaje na ekranu. Komentari nisu nov poseban ekran niti se čuvaju u localStorage-u.
- `/projects`: globalni brojači aktivnih i ugroženih projekata, „Kreiraj projekat“, četiri glavna filtera, listanje po osam, procenti, rokovi, odgovorna osoba i broj članova tima. Pretraga/redosled i dodatni statusi otvaraju se kroz lupu u zaglavlju. Aktivni dodatni filter je jasno prikazan i može se ukloniti. Nepostojeća prazna stranica vraća na prvu.
- „Kreiraj projekat“, detalji projekta/aktivnosti, izveštaji i odluke o idejama vode na postojeće funkcionalne ekrane. Njihov redizajn ostaje za sledeće reference. Rukovodilac dobija belo/zlatno zaglavlje i navigaciju Početna / Projekti / Izveštaji / Ideje, obaveštenja i meni naloga.

Reference su kopirane bez izmena u `design/manager/01-pregled-sektora.png` i `02-projekti-sektora.png`. Brojevi, fotografije i nazivi sa slika nisu ubačeni kao podaci. Model nema posebno ime tima: prikazuju se stvarni sektor, broj članova i odgovorna osoba. Slika projekta dolazi iz privatnog autorizovanog priloga; kada je nema, prikazuje se ikona.

## Značenje brojača i filtera

Ukupno projekata obuhvata sve nearhivirane projekte sektora. Aktivni su postojeći statusi `active`, `at_risk` i `on_hold`, u skladu sa prethodnim brojačima. Filter „U toku“ prikazuje tu istu grupu; kartice zadržavaju konkretan status, uključujući pauzirano ili ugroženo. „Rok ugrožen“ broji sačuvani `at_risk` status, nezavisno od datuma. Detaljniji statusi, uključujući planirane, završene i otkazane, dostupni su kroz dodatne filtere i pregled statusa.

„Na proveri“ znači da otvoreni projekat ima bar jednu aktivnost `review`, bilo kog člana sektora. To nije samo rukovodiočeva lična aktivnost. Kod kartice `at_risk`, `on_hold`, `planned`, `completed` ili `cancelled`, izvedena oznaka nikada ne skriva stvarni status. Samo aktivan projekat može dobiti izvedenu oznaku „Na proveri“.

„Po planu“ nije novi MongoDB status. To je aktivan projekat bez probijenog projektnog roka, bez blokiranih ili zakašnjelih nezavršenih aktivnosti. Projekat bez roka može biti u toj grupi, a rok je jasno prikazan kao nepostavljen. Ako ima aktivnost na proveri, kartica prvenstveno pokazuje „Na proveri“, iako može biti obuhvaćena i filterom Po planu. Izvedene oznake ne predstavljaju odobrenje predsednika ili izmenu podataka.

Kašnjenje znači nezavršenu aktivnost sa rokom pre početka dana u `Europe/Belgrade`, na nearhiviranom otvorenom projektu (`planned/active/at_risk/on_hold`). Završeni i otkazani projekti ne pune listu kašnjenja. Testirana je prava lokalna ponoć i promena UTC pomeraja pri prelasku na letnje/zimsko vreme. Pažnju zahtevaju otvoreni projekti sa `at_risk`, probijenim projektnim rokom ili blokiranom/zakašnjelom aktivnošću. Početni ekran prikazuje do tri, uz link za sve.

Ideje na pregledu su `submitted` i `in_review` u sektoru; najstarije su prikazane prve. Brojač novih predsednikovih komentara koristi nepročitana korisnikova `comment` obaveštenja, sa predsednikom kao akterom i linkom ka sadržaju iz trenutnog sektorskog pregleda. Nije izmišljen datum „poslednje posete“ niti novi read-state model.

## API i ovlašćenja

Dodate su samo read-only rute za `manager`:

```text
GET /api/dashboard/manager?activityPage=1&commentPage=1
GET /api/projects/sector?tab=all&q=&sort=updated&page=1&limit=8
```

Sektor i identitet dolaze sa serverskog korisnika, nikad iz query parametara. Zaposleni, predsednik i admin ne koriste ove specifične feed-ove (403); njihove postojeće rute ostaju dostupne prema sopstvenim pravilima. Nalog bez sektora i nedostajući sektor su odbijeni. Modeli, postojeći API odgovori, autentifikacija i ovlašćenja pisanja nisu menjani.

Pregled vraća `sector`, poslovni datum `today`, `stats` sa statusnim brojačima, `sectorComment`, paginirane `presidentComments` i `delayed`, `attentionProjects`, `attentionTotal` i `ideas`. Predsednikovi komentari filtriraju se prema autorizovanim sektorskim/projektnim/aktivnosnim/idejnim ciljevima; kartice i minijature ne otkrivaju sadržaj drugih sektora.

Projekti vraćaju `sector`, `items`, `total`, `page`, `limit` i globalni `stats` nezavisan od filtera. Stavka ima postojeća polja projekta, odgovornu osobu, `memberCount`, `activityCount`, `delayedActivities`, `hasReview`, `onTrack` i opcionu `thumbnailId`. Ne postoji lažna „moja aktivnost“ ili izmišljeni naziv tima. Pretraga je literalna, maksimalno 160 znakova, uz zaštitu od interpretacije regex znakova. Redosledi su `updated`, `due`, `title`; glavni tabovi `all`, `active`, `review`, `on_track`, a dodatni `attention`, `at_risk`, `planned`, `on_hold`, `completed`, `cancelled`. Nepoznat filter/redosled vraća 422.

Zajednički razgovor i meni naloga imaju male kompatibilne dopune; zaposleni zadržava svoj interfejs. Rukovodiočeva nova početna strana i lista učitavaju se po potrebi kroz React lazy/Suspense, bez dodavanja biblioteka. Produkcioni/PWA build uključuje njihove odvojene pakete.

## Provere

Naknadno, 8. novembra: oba ekrana pregledana su u browseru i prilagođena tabletu/desktopu. Aktuelni rezultati i ograničenja su u [responsive dopuni](RESPONSIVE_LAYOUTS.md); tabela ispod beleži stanje pri završetku prvog talasa.

| Provera | Rezultat |
|---|---|
| `npm run test:server` | 44/44; sektor, uloge, prazna stanja, globalni brojači, izvedene oznake, pretraga, granica kašnjenja, komentari i odgovor predsedniku |
| `npm run test:client` | 11/11; uključuje prioritet oznake review i očuvanje rizičnog/pauziranog/završenog statusa |
| `npm run check:server` | Prošla sintaksa 46 JS/MJS fajlova |
| `npm run build:client` | Prošao React/PWA build; nova dva ekrana su odvojeni paketi |
| `npm run test:rbac` | 35/35 live podprovera (36 sa roditeljskim); prvi pokušaj prekinut prolaznim `fetch failed`, ponovljen uspešno posle potvrđene dostupnosti backend-a |
| Postojeći smoke | 15/19; isti demo problemi: već odobren kandidat i izostanak današnjih dnevnih evidencija kompanije/sektora |
| Izolovani API tok rukovodioca | Tačni brojači, odsustvo stranog/arhiviranog projekta, izuzimanje zatvorenog projekta iz kašnjenja, svi filteri, paginacija, literalna pretraga, odgovor na sektorsku instrukciju i `answered` status |
| Browser / vizuelni UX | Nije izvršeno: lokalni browser je isključen u Work podešavanjima. Nisu napravljeni novi screenshot-ovi niti se tvrdi da je izgled vizuelno potvrđen. |

Testovi pisanja su izvršeni samo na modelima u memoriji i izolovanom fixture serveru na portu 4002, bez MongoDB veze. Server je ugašen sa `stop` i očistio je privremene priloge. Live RBAC samo čita poslovne podatke i odjavljuje svoje sesije; prijave standardno ažuriraju `lastLoginAt`. Nema seed/reset-a, promena demo naloga/lozinki, poslovnih upisa u demo bazu, commit-a ili push-a.

## Ponovljiv lokalni test

Dok Vite radi na 5173, u prvom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
$env:ZEPTER_UI_ROLE = 'manager'
node tests/fixtures/employee-ui-server.mjs
```

U drugom terminalu iz `server/`, na svežem fixture serveru:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/manager-wave01-check.mjs
```

Runner zahteva dummy token i manager ulogu sa fiksnog loopback porta 4002 pre upisa odgovora. Test podaci postoje samo u memoriji. `stop` ili Ctrl+C gasi server i briše njegov sopstveni OS temp direktorijum. Kroz agentski terminal koristiti `tty:true`. Za povratak na employee fixture eksplicitno postaviti `ZEPTER_UI_ROLE=employee` ili ukloniti promenljivu pre novog pokretanja.

Preostala vizuelna provera: na svežem manager fixture-u otvoriti `http://127.0.0.1:4002/` i `/projects` na 320/390/1280 px. Proveriti zaglavlje/navigaciju, duge nazive sektora/projekata, sve kartice, proširene liste i paginaciju, odgovor sektoru i očuvanje unosa pri sklapanju, filtere/pretragu/povratak kroz istoriju, prazno/greška stanje i ulaz `/projects/new`. Stvaran Android/iOS, PWA install i Web Push zahtevaju posebnu proveru na telefonu.
