# Zaposleni — detalji projekta i uređivanje aktivnosti

Završeno 8. novembra 2026. na `develop`. Reference su sačuvane u [03-detalji-projekta.png](design/employee/03-detalji-projekta.png) i [04-detalji-aktivnosti.png](design/employee/04-detalji-aktivnosti.png). Poslovni demo podaci nisu menjani radi implementacije ili testiranja.

## Detalji projekta

Ruta `/projects/:id` za zaposlenog prikazuje stvarni opis, status, napredak, rok, odgovornu osobu i njegove dodeljene aktivnosti. Lista sadrži sve aktivnosti dostupnog projekta, odgovorne osobe, rokove, status i procenat. Sopstvena zaduženja su posebno označena; druge aktivnosti otvaraju se kao pregled sa komentarima.

Tri kratice vode na komentare, tim i dodatne podatke. Tim, dodatni detalji i projektni prilozi mogu da se otvore po potrebi, kako ekran na telefonu ne bi bio preopterećen. Fotografija koristi postojeći autorizovani slikovni prilog ili ikonicu fascikle.

Osnovne podatke projekta zaposleni ne menja: postojeći backend rezerviše tu akciju za rukovodioca/admina/predsednika, čak i kada je zaposleni naveden kao vlasnik projekta. Ovim zadatkom nisu proširena prava. Zaposleni komentariše dostupan projekat, uređuje dodeljene aktivnosti i upravlja prilozima u okviru postojećih dozvola.

## Detalji aktivnosti

Ruta `/activities/:id` ima pregled roka/odgovornih i jednu glavnu akciju **Sačuvaj izmene**, odmah posle polja. Prilozi i razgovor su odvojeni i imaju svoje jasno označene akcije; nije potrebno proći ceo razgovor da bi se sačuvali status i napredak.

- Uređuju se samo dozvoljena polja sopstvenog zaduženja: status, procenat, urađeni posao, sledeći korak i prepreke.
- Izbor „Završeno“ postavlja 100%. Promena procenta završene aktivnosti ispod 100 vraća je u „U toku“. Postavljanje 100% bez izbora završetka postavlja „Na proveri“, u skladu sa postojećim pravilom servera.
- Opis i prazno polje za prepreke su sklopivi; postojeće prepreke i blokirane aktivnosti pokazuju polje odmah. Sledeći korak je označen kao opcioni.
- Tuđa aktivnost ima pregled urađenog posla, priloga i razgovora, bez forme za promenu podataka ili dodavanje priloga.
- Neuspešno čuvanje ostavlja unos u poljima. Dvostruki klik je blokiran dok zahtev traje.

Automatsko Socket.IO osvežavanje ne resetuje nacrt aktivnosti. Zajednički hook za učitavanje podržava zadržavanje prethodnih podataka, pa osvežavanje razgovora ili priloga ne uklanja formu. Aktivnost se nakon čuvanja ponovo učitava, dok se sačuvani nacrt odmah usklađuje sa kanonskim odgovorom servera.

Pre odlaska preko linka, dugmeta za povratak u aplikaciji ili istorije browsera prikazuje se izbor: sačuvaj i nastavi / odbaci / ostani. Koristi se postojeći React Router kroz `createBrowserRouter` i `useBlocker`, umesto presretanja pojedinačnih klikova. URL-ovi i postojeći `App`/`Routes` raspored su očuvani; nije dodata zavisnost. Za refresh/zatvaranje kartice koristi se standardni browser `beforeunload` dijalog kada ga browser podržava. Eksplicitna odjava ostaje nesmetana i uklanja korisnički kontekst.

## Istovremene izmene

Nova forma šalje opcioni `If-Match: "<updatedAt ISO>"` uz postojeći `PATCH /api/activities/:id`. Autorizacija i Zod validacija ostaju na serveru. Server proverava verziju, a upis radi atomskom `findOneAndUpdate` operacijom sa uslovom `_id + updatedAt`. Ako je zapis promenjen pre ili tokom čuvanja, vraća 409 i ne prepisuje noviju verziju.

Polja odgovora i MongoDB šema nisu menjani. Stari klijenti bez ovog zaglavlja zadržavaju prethodni način poziva. Zaštita od konkurentnog upisa važi za novi uslovni način čuvanja; ne predstavlja opštu reviziju svih starih API pisanja.

U konfliktu lokalni unos ostaje vidljiv. Korisnik može da pogleda aktuelnu verziju i izričito odbaci svoj nacrt ako želi da preuzme nove podatke. Nema automatskog spajanja ili prepisivanja.

## Komentari i prilozi

Zajednički `EmployeeThread` koristi postojeći kontekstualni `/comments` API. Podržava novi komentar, odgovor na konkretan parent komentar, autorstvo i lokalno vreme, status instrukcije i paginaciju. Sopstvene poruke su označene. Zaposleni ne može izdati instrukciju ili razrešiti tuđu instrukciju. Komentar i odgovor se čuvaju odmah, nezavisno od forme aktivnosti; to ne briše njen nacrt.

`EmployeeAttachments` koristi postojeći upload/list/download/delete API. Dodata je samo autentifikovana ruta `GET /api/attachments/config`, koja vraća `extensions` i `maxBytes`; ne otkriva putanju skladišta. UI proverava format i veličinu prema stvarnom server podešavanju, a server i dalje proverava sadržaj/MIME, ovlašćenja i veličinu. Broj bajtova je zaokružen naniže na ceo broj, što omogućava i decimalni `MAX_UPLOAD_MB` bez greške Multer konfiguracije.

Prilozi se dodaju pojedinačno i čuvaju odmah. Uklanjanje je ponuđeno samo vlasniku fajla, uz izričitu potvrdu, a pravo se ponovo proverava na serveru. Read pristup projektu ne daje pravo dodavanja fajla tuđoj aktivnosti ili brisanja tuđeg fajla. Download ostaje autorizovan i `no-store`.

Formati iz postojeće implementacije su očuvani: PDF, PNG/JPG/JPEG/WebP i DOCX/XLSX/PPTX. `.fig` prikazan u maketi nije podržan postojećim backend-om i nije lažno ponuđen u UI-ju. Antivirus i produkcioni storage ostaju ranije dokumentovan produkcioni posao.

## Jedan unos za dnevnu evidenciju

Čuvanje aktivnosti ažurira njen pregled stanja; samo po sebi ne pravi `WorkLog`. Kada postoji sačuvan opis urađenog posla, link „Dodaj urađeno u dnevni izveštaj“ otvara postojeći tok dnevnog unosa sa preuzetim tekstom. Prenosi se samo ID aktivnosti; tekst se ponovo čita preko autentifikovanog API-ja, pa nije stavljen u URL ili browser skladište.

Zaposleni pregleda datum, urađeno, sledeće korake, prepreke i minute i potvrđuje dnevni unos. Ne mora ponovo da kuca isti opis. `POST /worklogs` dobija `activityId`, pa postojeći backend povezuje i projekat; lični izveštaji i izveštaji sektora koriste taj zapis. Tok ne šalje ponovo procenat koji je već sačuvan na aktivnosti.

Usput je ispravljena potvrđena greška starog API-ja: dnevni unos `updatedProgress=100` više ne vraća već završenu aktivnost iz `completed` u `review`. Pravilo protiv smanjivanja napretka završene aktivnosti dnevnim unosom ostaje.

## Provere

| Provera | Rezultat |
|---|---|
| `npm run test:server` | 26/26; uključuje vlastita/tuđa zaduženja, zabranjena polja, projektnu administraciju, odgovore i parent granice, konkurentni upis i completed status pri dnevnom unosu |
| Testovi priloga u toj grupi | Stvaran upload/download/delete isključivo u sopstvenom privremenom direktorijumu sa modelima u memoriji; provereni MIME spoofing, nepodržan format, veličina i zabrane pristupa |
| `npm run test:client` | 5/5; status/procenat, datumi i jezik, dozvoljeni formati/veličine |
| `npm run test:rbac` | 28/28 podprovera na postojećoj bazi (Node računa 29 sa roditeljskim testom); jedan početni pokušaj prekinut prolaznom localhost greškom, ponovljen uspešno |
| `npm run check:server` | Prošla sintaksa 38 JS/MJS fajlova |
| `npm run build:client` | Prošao React/PWA build |
| Postojeći smoke | 15/19 na 8. novembar: dva prethodna neuspeha za već odobrenog pending kandidata i dva dnevna izveštaja za novi dan bez demo unosa |
| Browser, izolovani upisi | Sačuvana aktivnost i novi procenat projekta; projektni komentar; odgovor na predsednikovu instrukciju i `answered`; upload; potvrda uklanjanja i otkazivanje; dnevni unos iz preuzetog teksta; zaštita nacrta i povratka kroz istoriju; konflikt dva prozora i preuzimanje aktuelnih podataka; pregled tuđe aktivnosti; odjava |
| Browser, stvarni demo podaci | Samo čitanje; provereni detalji projekta i sopstvene aktivnosti, širine 320/390/1280 px, bez horizontalnog prelivanja i sa aktivnom navigacijom „Projekti“ |

Datum i stanje smoke fixture-a provereni su direktnim čitanjem: `day=2026-11-08` ima 0 WorkLog zapisa, poslednji unosi su `2026-11-07`; kandidat je `approved/employee`. Dnevni API ispravno vraća prazne rezultate, dok stari smoke očekuje nenultu količinu. Test nije ublažavan, niti su dodati današnji unosi radi zelenog rezultata.

Nije rađen seed/reset, izmena demo naloga/lozinki, pisanje poslovnih podataka u postojeću bazu, commit ili push. Live prijave prave auth sesije i ažuriraju `lastLoginAt`; RBAC grupa odjavljuje svoje sesije. UI fixture proces i njegov privatni testni upload uklonjeni su po završetku.

## Ponovljiv browser test bez MongoDB upisa

Dok Vite radi na 5173, u drugom terminalu:

```powershell
cd server
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/employee-ui-server.mjs
```

Otvoriti adresu projekta koju skripta ispiše na `http://127.0.0.1:4002`. Autentifikacija i dokumenti su izolovani testni podaci u memoriji. Koriste se stvarne Express rute i frontend; skripta ne učitava `.env`, ne povezuje MongoDB i isključuje VAPID u sopstvenom procesu. Slike su u zasebnom OS temp direktorijumu. `stop` ili Ctrl+C gasi server i čisti taj direktorijum. Pri pokretanju kroz agentski terminal koristiti interaktivni TTY ako se planira `stop` preko stdin-a.

Ovo je pomoćni ručni browser fixture, ne produkcioni server ili zamena za test autentifikacije. Stvarna prava naloga proveravaju se posebnom live RBAC grupom. Realni Android/iOS, instalacija PWA, Web Push, veliki razgovori sa više stranica i otpornost na proizvoljne mrežne prekide nisu u potpunosti isprobani u ovom talasu.
