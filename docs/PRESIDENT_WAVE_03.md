# Predsednik — detalji ideje i aktivnosti

Ekrani 5–6 sada imaju poseban predsednički prikaz prema dostavljenim mobilnim referencama, zatim raspored za tablet i desktop. Ruta ideje ostaje `/ideas/:id`, aktivnosti `/activities/:id`. Predsednik i dalje ulazi istim ličnim linkom bez formulara i odjave.

## Sadržaj i razgovor

- Ideja prikazuje autora, stvarni sektor, datum nastanka, status, broj komentara, kratak izvod i ceo opis/korist. Model ima jedan opis; izvod se računa iz njega, bez novog obaveznog polja ili ponavljanja unosa. Fotografije i nazivi timova se ne izmišljaju.
- Aktivnost prikazuje opis odmah, odgovorne osobe, rok, prioritet, projekat, napredak, urađeni posao, sledeći korak, prepreke i dokumente. Predsednički ekran nema obrazac za promenu aktivnosti. Podaci se osvežavaju bez gubitka nacrta komentara.
- Komentari i instrukcije koriste postojeći razgovor, odgovore, statuse i obaveštenja. Prilozi poruke prikazuju se uz konkretnu poruku i u prikazima zaposlenog/rukovodioca. Ne ponavljaju se u spisku izvornih dokumenata ideje/aktivnosti.
- Dokumenti se preuzimaju kroz postojeću autorizovanu rutu. Podržani formati i veličina dolaze sa servera; `.fig` nije uveden samo zato što se pojavljuje u mockupu. Nije uveden javni upload niti neprovereni inline HTML/document viewer.
- Odluka o ideji iz prethodnog talasa ostaje dostupna. Odobrenje zahteva naredne korake rukovodiocu koji je prosledio ideju, odbijanje je konačno. Razgovor ostaje dostupan i posle odluke.
- Telefon i tablet koriste donju, desktop bočnu navigaciju; od 1200 px sadržaj i razgovor idu u kolone. Predsednikov projekat i aktivnost zadržavaju aktivan kontekst „Sektori“. Jedna forma i izabrani fajlovi ostaju sačuvani pri resize-u.

## Kompatibilna dopuna priloga

`Attachment` dobija opciona `comment` i `uploadId` polja. Parcijalni jedinstveni indeks `(owner, uploadId)` obuhvata samo dokumente sa string ključem, a `(targetType, targetId, comment)` podržava čitanje dokumenata i priloga razgovora. Stari prilozi ostaju važeći i ne zahtevaju migraciju. Statusi, poslovni podaci, nalozi i lozinke nisu menjani.

`POST /api/attachments?targetType=...&targetId=...` zadržava stari ugovor. Opcioni `commentId` mora pripadati istom cilju i autoru prijavljene sesije. Predsednik može dodati prilog ideji koju sme da vidi samo uz svoj komentar; time ne uređuje autorov predlog. Opcioni `uploadId` je UUID i zahteva `commentId`. Isti ključ vraća već sačuvan prilog (200); novi daje 201. Upotreba istog ključa za drugi cilj vraća 409. Provera pristupa prethodi čitanju/upload-u fajla i važi i za retry. Konkurentni duplikat uklanja samo sopstveni višak fizičkog fajla.

`GET /api/comments?...&includeAttachments=1` opciono dodaje javne metapodatke priloga uz poruke trenutne stranice. Bez tog parametra stari odgovor ostaje isti. Obe grupe podataka imaju isti autorizovani cilj; storage putanje i ključevi slanja nisu deo obogaćenog odgovora. Privatni download ostaje `no-store`.

UI prvo potvrđuje komentar, pa šalje do tri izabrana priloga, uz zaseban stabilan ključ po fajlu. Uspešni fajlovi se ne ponavljaju. Ako potvrda fajla izostane, „Pošalji preostale priloge“ nastavlja istu poruku i operacije. Ako izostane potvrda samog komentara, slepi POST ostaje blokiran: proverava se razgovor i izabrani fajlovi mogu se eksplicitno dodati uz prepoznatu sopstvenu poruku. Fajl i metapodaci koji su već sačuvani ne brišu se zbog naknadne greške audita/socket-a. To nije jedna transakcija komentara, fajlova, audita i obaveštenja.

## Provere

- Server: 116 testova; client: 50 testova. Nova grupa pokriva sopstveni komentar, drugi cilj/autor/sektor, neprosleđenu ideju, privatno preuzimanje, retry, naknadnu grešku audita i konkurentni upload.
- Povezani HTTP scenario `president-wave03-check.mjs`: 39 provera na izolovanom fixture-u. Provereni su oba tipa sadržaja, obaveštenje zaposlenom, odgovor predsedniku, javni metapodaci, granice ovlašćenja i izgubljena potvrda priloga bez duplikata.
- Regresija drugog talasa: 61 HTTP provera na svežem WAVE02/WAVE03 fixture-u, pre daljih upisa novog scenarija.
- Stvarni lokalni MongoDB: 21 provera u zasebnoj privremenoj bazi, uključujući jedinstveni indeks, konkurentne ključeve, opcioni komentar i stare priloge bez ključa. Uklonjena je samo tačno proverena baza tog testa; demo baza nije korišćena.
- Browser: oba ekrana 320/390/820/1440 px bez horizontalnog prelivanja; jedna forma, očuvan tekst, tip poruke i izabrani fajl pri resize-u. Vizuelno pregledani mobilni i desktop prikazi. Potvrđeni su zaštita izlaska, upload, gubitak potvrde komentara i fajla, nastavak bez duplikata, zaposleni → odgovor u istom razgovoru → predsednički prikaz odgovora, odobrenje sa narednim koracima i rukovodiočev prikaz odluke/priloga.
- Browser greške/oporavak: ideja, aktivnost, razgovor (očuvan nacrt) i spisak dokumenata; provereni su i prazni prilozi/razgovor u osnovnom fixture-u. Sintaksa i production/PWA build provereni pri završetku.

Za ponavljanje: uz `ZEPTER_UI_FIXTURE=1`, `ZEPTER_UI_ROLE=president`, `ZEPTER_UI_QA=1`, `ZEPTER_UI_WAVE02=1` i opciono `ZEPTER_UI_WAVE03=1` pokrenuti `node tests/fixtures/employee-ui-server.mjs` iz server foldera. WAVE03 dodaje sintetičke dokumente, dve odgovorne osobe i popunjene detalje aktivnosti. Zatim `ZEPTER_UI_FIXTURE=1 node tests/fixtures/president-wave03-check.mjs`. Za prethodni scenario potreban je svež fixture. `president-ui-qa.mjs` dodaje `activity-error`, `idea-detail-error`, `attachment-list-error`, `comments-error` i `attachment-lost`. QA ulazi `/__fixture/employee` i `/__fixture/manager` postoje samo u eksplicitnom memorijskom president/QA/WAVE02 fixture-u; u produkciji ne postoje. Pri promeni uloge u istom browser profilu ponovo otvoriti sintetički lični link pre provere predsednika.

Fixture ugasiti sa `stop`, koji čisti njegove privremene priloge. Zaseban Mongo postupak ostaje `ZEPTER_ISOLATED_DB_TEST=1 node tests/integration/president-isolated-db.mjs`, uz proveru imena i prefiksa pre čišćenja. Testovi ne menjaju poslovne podatke postojeće demo baze.

Granice: nisu potvrđeni realan telefon/PWA instalacija, fizički prijem push poruke, produkcioni HTTPS niti kompletan audit više API instanci. Ovim talasom ne zatvaraju se ranije otvorene provere drugih talasa.
