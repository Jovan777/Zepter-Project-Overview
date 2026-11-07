# Zepter Management Overview — funkcionalna specifikacija backend-a

## Drugi talas zaposlenih ekrana

Detalji projekta/aktivnosti, komentari, odgovori, upload/download i dnevna evidencija koriste postojeće ugovore. `PATCH /api/activities/:id` dodatno podržava opcioni `If-Match` sa navedenim `updatedAt` ISO vremenom u navodnicima i atomsku proveru verzije; zastareli upis vraća 409. `GET /api/attachments/config` iza autentifikacije vraća formate i ograničenje veličine. Dnevni unos na 100% više ne vraća `completed` u `review`. Modeli nisu menjani. Detalji i testovi su u [drugom talasu](docs/EMPLOYEE_WAVE_02.md).

## Prvi talas zaposlenih ekrana

Dodate su autentifikovane rute samo za ulogu `employee`: `GET /api/dashboard/employee` (lični pregled, aktivnosti, pažnja i poslednji komentari) i `GET /api/projects/mine` (lični projekti, filteri/pretraga/redosled i paginacija). Identitet i sektor dolaze sa serverske sesije, bez mogućnosti proširenja kroz query parametre. Modeli i postojeći API ugovori nisu menjani. Detaljan odgovor i semantika statusa opisani su u [dokumentaciji ekrana](docs/EMPLOYEE_WAVE_01.md#dopune-api-ja).

## Povezanost sa usvojenim ekranima predsednika

| Predsednički ekran | Backend funkcionalnosti |
|---|---|
| 1. Početni pregled kompanije | Dashboard ukupnih projekata, pažnja, lista sektora, pregled dnevnih/nedeljnih izveštaja |
| 2. Pregled sektora | Sektori, projekti sektora, komentari na sektoru, sektorski izveštaji |
| 3. Detalji projekta | Projekat + aktivnosti + tim + status/progress + komentari i prilozi |
| 4. Ideje zaposlenih | Prosleđene ideje iz svih sektora, filteri po sektoru i datumu |
| 5. Detalji ideje | Sadržaj ideje, autor, prilozi, komentari predsednika i odgovori |
| 6. Detalji aktivnosti | Odgovorni, rok, procenat, urađeno, sledeći koraci, prilozi i komentari/instrukcije |
| 7. Dnevni/nedeljni izveštaj | Automatski pregled kompanije/sektora/projekta/zaposlenog; objavljeni sektorski izveštaji |
| 8. Potrebna moja pažnja | Zahtevi rukovodilaca, ugroženi rokovi, blokirane aktivnosti, predsednikova otvorena zaduženja |
| 9. Moji komentari i instrukcije | Svi predsednikovi komentari i instrukcije, stanje odgovora, direktan link na sadržaj |

## Službeni zahtevi project managera

- Zaposleni svakog radnog dana evidentira šta je urađeno, šta sledi i eventualne prepreke; `/worklogs` i `/worklogs/compliance` podržavaju praćenje ispunjenosti obaveze.
- Rukovodilac vidi projekte i aktivnosti sektora, kreira projekte i zaduženja, priprema i objavljuje sektorske izveštaje.
- Predsednik vidi sve nivoe i izveštaje, dodeljuje zadatke rukovodiocima, komentariše i odgovara na zahteve.
- Ideje: zaposleni → rukovodilac (prosleđivanje ili povratak na doradu) → predsednik (pregled i komentar).
- Promene se čuvaju odmah; Socket.IO signalizira klijentu da preuzme novi sadržaj.
- Admin odobrava registracije i role; predsednik se inicijalizuje posebno, mimo registracije.
- PWA koristi HTTPS i web manifest za instaliranje na telefonu; privatni API se ne kešira.

## Kolekcije MongoDB

`users`, `sectors`, `projects`, `activities`, `worklogs`, `comments`, `ideas`, `reports`, `assignments`, `decisionrequests`, `notifications`, `attachments`, `audits`, `sessions`, `pushsubscriptions`.

## Pravila modela

- `User` ima `role` i `approval` — uloga se dodeljuje isključivo na backend-u.
- `Project` pripada tačno jednom sektoru; `members` i `owner` su aktivni korisnici tog sektora.
- `Activity` pripada jednom projektu; `assignees` moraju biti članovi projektnog tima.
- `WorkLog` je nezavisan dnevni unos zaposlenog, opcionalno vezan za projekat/aktivnost.
- `Comment` može biti uz sektor/projekat/aktivnost/ideju/zaduženje/zahtev. Ima autora, vreme, vrstu i status odgovora.
- `Idea` prati tok `submitted` → (`revision_requested` → ponovno slanje) ili `forwarded`. Prosleđivanje nije odobrenje za realizaciju.
- `Report` sektora ima nacrt i objavljeno stanje; objavljen izveštaj je zaključan. Automatski pregled u drugim nivoima generiše se iz evidencije rada.
- `Attachment` ima privatni fizički fajl i autorizovanu baznu referencu.
- `Audit` čuva promene sa akterom i vremenom.

## V1 prioriteti

1. Potvrditi organizacionu strukturu, sektore, korisnike i pravo uređivanja.
2. Isprobati tok: admin → rukovodilac → projekat → aktivnost → zaposleni → dnevni unos.
3. Isprobati tok komentara predsednika: sektor, projekat, aktivnost, ideja.
4. Isprobati tok ideja i vraćanja na doradu.
5. Isprobati sektor → kompanija izveštavanje.
6. Povezati finalni React dizajn i PWA instalaciju na telefonu.

## Plan pre produkcije

MFA (obavezno predsednik/admin), recovery lozinke, skeniranje dokumenata, distribucija rate limita, backup/restore, bezbednosni audit, testovi svih dozvola, automatski reminder posle radnog dana i produkcioni SSL/reverse proxy. Za slučaj međusektorskih timova mora se proširiti postojeća pretpostavka da svi članovi projekta pripadaju istom sektoru.
