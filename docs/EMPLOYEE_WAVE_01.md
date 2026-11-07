# Zaposleni — prvi talas ekrana

Implementirani su „Moj pregled“ (`/`) i „Moji projekti“ (`/projects`) za ulogu `employee` na grani `develop`. Korisnik je promenio raniji redosled: prvo se obrađuju zaposleni, u talasima po dva ekrana.

Reference su sačuvane bez izmena u [01-moj-pregled.png](design/employee/01-moj-pregled.png) i [02-moji-projekti.png](design/employee/02-moji-projekti.png).

## Prikaz i ponašanje

- Zajednički mobilni shell prati belu pozadinu, tamnu tipografiju, zlatne akcente, linijske ikonice i donju navigaciju iz referenci. CSS je ograničen na `.employee-*`; ostale uloge zadržavaju prethodni interfejs.
- Početna prikazuje ime prijavljenog korisnika, broj aktivnih projekata, broj nezavršenih dodeljenih aktivnosti, hitne rokove/blokade/instrukcije, dva poslednja komentara rukovodilaca/predsednika i dva poslednje ažurirana projekta.
- „Moje aktivnosti“ otvara paginiranu listu u okviru početnog pregleda. Svaka aktivnost vodi u postojeće detalje. „Novi komentari“ vodi na komentare na istoj stranici; klik na komentar otvara njegov projekat, aktivnost, ideju ili sektor. Nije dodat poseban ekran zaposlenih komentara.
- „Nova ideja“, obaveštenja i kartice projekata vode u postojeće povezane tokove. Dnevni unos je zadržan kroz profil meni i tekstualnu akciju na početnoj. Profil meni takođe omogućava odjavu.
- Lista projekata ima globalne brojače, filtere, stvarni napredak i rok, lične aktivnosti, pretragu naziva, redosled i paginaciju. Filter/pretraga/redosled/stranica čuvaju se u URL-u; promena filtera vraća prvu stranicu.
- Pretraga u zaglavlju otvara alate liste projekata. Dugme sa tri tačke uključuje/isključuje pretragu i redosled.
- Prikazana su stanja učitavanja, greške sa ponovnim pokušajem i prazne liste. Brze promene filtera otkazuju stare zahteve da njihov odgovor ne zameni noviji rezultat.

Imena, projekti, procenti, brojevi i poruke iz maketa nisu hardkodovani. Sličice se uzimaju iz najnovijeg odgovarajućeg slikovnog priloga konkretnog projekta; ako slike nema ili ne može da se učita, prikazuje se ikonica fascikle. Fotografije proizvoda iz maketa nisu raspoložive kao podaci projekata. Naziv sektora služi kao kontekst tima jer model nema posebno ime projektnog tima.

## Statusi i datumi

Postojeća MongoDB šema i statusi nisu menjani. Projekat nema status `review`, pa „Na proveri“ filtrira projekte sa **aktivnošću prijavljenog zaposlenog** u statusu `review`. Na aktivnom projektu takva kartica dobija oznaku „Na proveri“ sa objašnjenjem; statusi ugroženog roka, pauze i završetka ostaju vidljivi. Ne uvodi se izmišljeni status „Po planu“.

Broj aktivnih projekata obuhvata postojeće `active`, `at_risk` i `on_hold`. Broj otvorenih aktivnosti obuhvata sopstvena nezavršena zaduženja na nezavršenim/neotkazanim projektima. „Rok ove nedelje“ računa projekte sa rokom u kalendarskoj nedelji ponedeljak–nedelja. Datumi i oznaka „Danas“ koriste `Europe/Belgrade`.

„Nove poruke“ broji postojeća nepročitana obaveštenja tipa `comment` od predsednika/rukovodilaca svog sektora. Sam pogled na sažetak ne menja njihov status pročitanosti. Prikaz broja obaveštenja se osvežava kroz postojeće Socket.IO događaje i posle akcija nad obaveštenjima.

## Dopune API-ja

Obe rute su samo za čitanje, zahtevaju postojeću autentifikaciju i ulogu `employee`. Identitet i sektor uvek se uzimaju iz `req.user`; `userId`/`sectorId` iz upita ne proširuju pristup.

| Ruta | Upit | Odgovor |
|---|---|---|
| `GET /api/dashboard/employee` | `activityPage` | `stats`, `projects`, `sectorName`, `attention`, `latestComments`, `activities`, `today` |
| `GET /api/projects/mine` | `tab=all/active/review/completed`, `q` (max 160), `sort=updated/due/title`, `page`, `limit` (max 50) | `items`, `total`, `page`, `limit`, `sectorName`, `stats` |

Projekti su ograničeni članstvom/vlasništvom, sektorom i `archived:false`. Ugnježdene lične aktivnosti dodatno su ograničene dodelom korisniku i dostupnim projektima. Komentari su ograničeni na dostupne projekte, sopstvene aktivnosti i ideje i sopstveni sektor. Otvorene instrukcije u pažnji su direktno upućene zaposlenom ili nemaju posebno navedene primaoce.

Odgovor liste dodaje `myActivities` i `thumbnailId` samo u ovoj novoj ruti. Postojeći `/api/projects`, `/api/dashboard/overview`, modeli i ugovori drugih ekrana ostaju očuvani. Pretraga escape-uje regex simbole i tretira ih kao tekst.

Privatne slike se preuzimaju preko postojećeg autorizovanog download API-ja, sa `cache:no-store`, i prikazuju kroz privremeni blob URL. URL se oslobađa pri promeni/uklanjanju komponente. Nisu dodati javni upload direktorijumi, keširanje privatnih podataka ili nove zavisnosti.

## Verifikacija

| Provera | Rezultat |
|---|---|
| `npm run test:server` | 14/14; uključuje zabrane novih ruta za druge uloge, zaposlenog bez sektora i prazne podatke |
| `npm run test:client` | 3/3; statusi bez prikrivanja rizika/završetka, datumi preko ponoći/DST i srpski oblici brojeva |
| `npm run test:rbac` | 26/26 podprovera (Node prikazuje 27 sa roditeljskim testom); uključuje zaštitu ličnih aktivnosti, pretragu, filtere i pokušaj promene identiteta/sektora |
| `npm run check:server` | Prošlo |
| `npm run build:client` | Prošao React i PWA build |
| Neizmenjeni `smoke-demo.js` | 17/19; dve zatečene pretpostavke o pending kandidatu i dalje ne važe jer je već approved; baza nije menjana da bi test prošao |
| Browser | Ručno proverene širine 320, 390 i 1280 px, bez horizontalnog prelivanja; pretraga/brisanje/redosled, prazan filter, otvaranje projekta, aktivnosti i kontekstualnog komentara, ulaz u postojeću novu ideju i navigacija |

Testovi pisanja nisu izvršavani nad poslovnim demo podacima. Live provere prijavljuju demo naloge; to pravi auth sesije/ažurira `lastLoginAt`, a RBAC test odjavljuje svoje sesije. Privremeni API za smoke na 4001 je ugašen. Nisu rađeni seed/reset, promene demo naloga, commit ili push.

PWA instalacija na pravom telefonu, stvarna Web Push isporuka i browser simulacija gubitka mreže nisu obuhvaćeni ovom proverom. Višestruke stranice projekata nisu ručno isprobane jer postojeći zaposleni ima tri projekta; API i UI podržavaju paginaciju. Ostali ekrani zaposlenog koriste prethodne detalje/forme i očekuju naredne reference.
