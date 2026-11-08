# Predsednik — izveštaji i pitanja za pažnju

Ekrani 7–8 prate dostavljene mobilne reference i koriste iste React komponente na telefonu, tabletu i desktopu. Predsednik zadržava postojeći lični link, bez login formulara, odjave ili dodatne potvrde pristupa.

## Čitanje izveštaja

- `/reports` sada otvara predsednički čitač za kompaniju, sektor, projekat ili zaposlenog. Dnevni/nedeljni tip, cilj i datum ostaju u URL-u; postojeće prečice početne, sektora i projekta otvaraju isti čitač.
- Na vrhu su izbor nivoa, dnevni/nedeljni tip i datum koji se potvrđuje dugmetom „Prikaži“. Delimičan unos datuma ne menja izveštaj. Forma pri potvrdi čita stvarnu vrednost polja, uz validaciju. Strelice pomeraju potvrđeni period za dan ili nedelju, po kalendaru Europe/Belgrade, ponedeljak–nedelja.
- Pretraga i paginacija izbora nisu ograničene na prvih 20 projekata. Već izabran cilj ostaje imenovan i van trenutne stranice izbora; zaposleni se mogu pretražiti punim imenom. Opcije ne izlažu mejlove, naloge ni tajne.
- Četiri odeljka prikazuju ostvarene rezultate, završene aktivnosti, probleme/kašnjenja i naredne korake. Duže liste imaju „Prikaži sve“, a evidencija sa postojećim ID-jem vodi do aktivnosti ili projekta. Isti sadržaj ostaje na svim širinama.
- Kompanijski pregled kombinuje evidenciju rada za period i tekstove objavljenih sektorskih izveštaja istog tipa i perioda. Posebna lista otvara svaki od tih izveštaja. Nacrti se ne uključuju. Projekat i zaposleni ne dobijaju nepovezane sektorske sažetke.
- Za sektor sa objavljenim izveštajem istog perioda koristi se sačuvani sadržaj. `/reports/:id` uvek čita taj konkretan objavljen izveštaj. Ako sektor kasnije nestane, sačuvani izveštaj ostaje čitljiv uz oznaku da sektor nije dostupan.
- Ako objavljen sektorski izveštaj ne postoji, prikazuje se jasno označen automatski pregled evidencije. Rezultati rada, prepreke i naredni koraci pripadaju izabranom periodu. Model ne čuva datum konačnog završavanja aktivnosti: broj/spisak završenih i zakasnelih aktivnosti označeni su kao trenutno stanje, odnosno stanje sačuvano pri objavi, a ne kao izmišljeni broj završavanja tokom tog perioda.
- Stariji objavljeni izveštaji bez spiska aktivnosti zadržavaju svoje sačuvane brojeve i tekstove; UI objašnjava da pojedinačni spisak nije naveden. Ne dopunjavaju se današnjim stanjem niti se nepoznati brojevi prikazuju kao nula. Broj „Prijave problema“ broji evidentirane prepreke i objavljene rukovodiočeve tekstove problema, bez tvrdnje da su to različiti jedinstveni incidenti.
- Odgovor za prethodni nivo, cilj, tip ili period ne prikazuje se ispod novih kontrola. Resurs koristi postojeći abort mehanizam, a čitač dodatno proverava kontekst odgovora. Promena širine čuva datum koji još nije potvrđen i proširene liste.

## Sva važna pitanja

`/attention` ima zajedničke brojače, filtere Sve/Odobrenja/Rokovi/Komentari/Ideje, izbor sektora i paginaciju. Osnovni izvori ostaju otvoreni zahtevi, blokirana zaduženja, projekti ugroženog roka, blokirane/zakasnele aktivnosti i prosleđene ideje koje čekaju konačnu odluku. Aktivnost ugroženog projekta ne pravi drugi alarm istog projekta, a zatvoren/arhiviran projekat ne stvara alarm aktivnosti.

Dodatni izvor su predsednikove instrukcije sa statusom `answered`. To su odgovori koji čekaju njegov pregled, ne sve otvorene instrukcije koje još čekaju zaposlenog. Instrukcije drugih korisnika, rešene instrukcije, neprosleđene ideje i obrisani ciljevi ne ulaze u taj izvor. Odgovori pripadaju sektoru stvarnog cilja, uključujući sektorske komentare koji nemaju sopstveno `sector` polje.

Klik na odgovor otvara baš njegov razgovor i instrukciju, čak i na kasnijoj stranici. Sklopljen sektorski razgovor otvara se automatski, komentar je označen, a postojeće paginiranje ostaje dostupno. „Označi kao rešeno“ uklanja odgovor iz pažnje i zajedničkih brojača. Rutinska obaveštenja ostaju na povezanom ekranu „Ostala obaveštenja“; ne pretvaraju se automatski u obaveze predsednika niti se izmišljaju događaji kašnjenja.

Brojači kompanije, sektora i liste koriste iste izvore. Filter se primenjuje pre paginacije, a brojači su za ceo izabrani sektor, ne samo trenutnu stranicu. To nisu transakcioni snapshot upiti; između odvojenih zahteva mogu se dogoditi stvarne promene, koje postojeći socket događaji ponovo učitavaju.

## API i kompatibilnost

- `GET /api/reports/president`: samo president; `scope=company/sector/project/employee`, opcioni `id`, `type=daily/weekly`, `day=YYYY-MM-DD`. Alternativno `reportId` čita tačan objavljen izveštaj. Odgovor nosi kontekst, izvor (`live`/`published`), vreme snimka, metrike, rezultate, završene/zakasnele aktivnosti, prepreke, naredne korake i objavljene sažetke. Nacrt vraća 403.
- `GET /api/reports/president/options`: samo president; `scope=sector/project/employee`, `q` do 160 znakova, `page`; 20 opcija po stranici. Pretraga je doslovna. Odgovor sadrži samo ID i prikazano ime/naziv.
- `GET /api/dashboard/president/attention`: dodati su `tab=all/approvals/deadlines/comments/ideas`, `stats`, `tab` i `sectorId`; stari pozivi bez filtera i dalje vraćaju paginiranu listu. „Rokovi“ obuhvataju projekte rizika i stvarno zakasnele aktivnosti, ne svaku blokadu sa budućim rokom. „Odobrenja“ su otvoreni zahtevi tipa approval.
- `GET /api/comments`: opcioni `focus` traži konkretnu poruku unutar istog autorizovanog cilja, računa njenu stranicu i vraća `focusId`. Stabilan redosled je `(createdAt, _id)`. Tuđi cilj ne utiče na računanje stranice i vraća 404; pristup razgovoru prethodi čitanju poruke.
- Generator zadržava prethodna polja i dodaje `generatedAt`, `activitySnapshot` i ID-jeve uz evidenciju. Podaci se čuvaju u postojećem `Report.generated` Mixed polju. Nova kašnjenja koriste početak beogradskog dana i samo nezavršene aktivnosti otvorenih, nearhiviranih projekata; ispravljeno je ranije računanje zatvorenih projekata i UTC ponoći.

MongoDB šeme, nazivi statusa i raniji zahtevi ostaju kompatibilni. Nema migracije, re-seedovanja, resetovanja demo baze ili promene naloga. Dodate rute su read-only; postojeća ovlašćenja uređivanja/objavljivanja ostaju kod rukovodioca i administratora.

## Izvršene provere

- Server: **129/129** regresionih testova; client: **53/53**. Nova grupa obuhvata stare/nove objavljene snimke, nedostajuće podatke, periode, granice uloga, pretragu, beogradsku ponoć, izvore/brojače pažnje i fokus komentara van prve stranice.
- Izolovani povezani scenario `president-wave04-check.mjs`: **94 provere**, uključujući sva četiri nivoa i oba tipa, neprosleđene nacrte, istorijski sadržaj, izbor izvan prve stranice, sve filtere, direktna odredišta i uklanjanje rešenog odgovora.
- Prethodni predsednički HTTP scenariji ponovljeni su na odgovarajućim svežim fixture-ima: prvi talas **47**, drugi **61**, treći **39** provera. Odluke i tok komentara/priloga ostaju funkcionalni.
- Stvarni lokalni MongoDB: **31 provera** u novoj zasebnoj privremenoj bazi. Potvrđeni su sačuvani Mixed snimak posle promene aktivnosti, ID-jevi evidencije, stvarno populisani sektori/odgovori, brojači i fokus na drugoj stranici. Uklonjena je samo tačno proverena baza tog testa.
- Postojeći lokalni demo API: **70 auth/read provera**; bez poslovnih upisa, oznaka čitanja ili odluka. Sopstvena testna sesija odjavljena, privatni link nije ispisan.
- Browser pre prekida: oba ekrana na **320/390/820/1440 px**, bez horizontalnog prelivanja; jedna forma perioda, očuvan nepotvrđeni datum i proširene liste pri resize-u; svi osnovni filteri pažnje, 8+7 ideja bez ponavljanja, izbor punog imena/projekta kroz pretragu, oba tipa i stvarni potvrđeni datum.
- Browser poslovni tok: instrukcija → odgovor rukovodioca → pažnja; direktan fokus instrukcije na trećoj stranici projektnog razgovora sa prikazanim odgovorom; rešavanje → prazna lista odgovora i umanjen isti početni brojač. Stariji dnevni izveštaj ne dobija današnju listu. Potvrđeni su greška/oporavak izveštaja, opcija i pažnje, kao i prazan sektor.
- Serverska sintaksa: **80 JS fajlova**; frontend/PWA production build prolazi. `git diff --check` i ignorisanje privatnih fajlova provereni. Testni procesi su ugašeni i port 4002 je slobodan.

Posle restarta sesije browser alat je ponovo vratio `Local browser use is disabled in Work settings`. Zato dopunska browser simulacija sporog prethodnog odgovora i poslednje vizuelno ponavljanje nisu završeni; ranije uspešne provere nisu proglašene ponovljenim. Pokušaj zatvaranja QA kartice i vraćanja privremene širine takođe je odbijen tim podešavanjem. Memorijski server i njegovi privremeni prilozi ipak su uredno očišćeni. Realni telefon/PWA instalacija, fizička push dostava i produkcioni audit nisu predmet potvrde ovog talasa.

## Ponavljanje

Iz `server/` postaviti `ZEPTER_UI_FIXTURE=1`, `ZEPTER_UI_ROLE=president`, `ZEPTER_UI_QA=1`, `ZEPTER_UI_WAVE02=1`, `ZEPTER_UI_WAVE04=1`, pa pokrenuti `node tests/fixtures/employee-ui-server.mjs`. WAVE04 postoji samo u eksplicitnom memorijskom fixture-u i dodaje sintetičke objavljene/stare/nacrt izveštaje, projekte van prve stranice, evidenciju i duži razgovor.

Na svežem fixture-u: `ZEPTER_UI_FIXTURE=1 node tests/fixtures/president-wave04-check.mjs`. Scenario rešava sopstvenu testnu instrukciju. QA helper `president-ui-qa.mjs` dodaje `report-error`, `attention-error`, `report-options-error` i `report-delay`. Ugasiti fixture sa `stop`.

Za ranije scenarije koristiti njihove odgovarajuće sveže podatke: prvi talas bez WAVE zastavica; drugi/treći sa WAVE02, bez WAVE04. Za pravu izolovanu MongoDB proveru: `ZEPTER_ISOLATED_DB_TEST=1 node tests/integration/president-isolated-db.mjs`; skripta pre čišćenja proverava tačno ime, prefiks i aktivnu konekciju svoje nove baze. Živo čitanje: `ZEPTER_PRESIDENT_READ_CHECK=1 node tests/integration/president-read-check.mjs`.
