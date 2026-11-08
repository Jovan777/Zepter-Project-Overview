# Predsednik — projekat, ideje i konačna odluka

Implementirani su ekrani 3–4 prema dostavljenim mobilnim referencama, zatim tablet/desktop raspored. Jedna instanca razgovora i svakog započetog unosa ostaje na svim širinama. Predsednik i dalje koristi isti lični link, bez login formulara, menija naloga i odjave.

## Projekat i aktivnosti

- /projects/:id prikazuje stvaran naziv, opis, status, napredak, rok, prioritet, odgovornu osobu i članove tima. Ime tima se ne izmišlja; model nema takvo polje.
- Četiri prečice vode na razgovor projekta, projektni dnevni/nedeljni pregled i tim. Aktivnosti su paginirane, sa statusom, napretkom, odgovornima i rokom; opcioni filter razlikuje nezavršene i završene.
- Predsednički prikaz ostaje pregled sa komentarima/instrukcijama; nema dugmadi za uređivanje projekta ili dodavanje aktivnosti iz referentnog mockupa.
- Postojeći detalj aktivnosti privremeno koristi zajednički prikaz bez uređivanja za predsednika, uz privatne priloge, instrukcije, odgovor i zaštitu neposlatog komentara. Konačan predsednički dizajn aktivnosti čeka narednu referencu.
- Izveštaji zadržavaju scope=project i ID projekta. Izabrani projekat ostaje imenovan čak i kada nije među prvih 50 ponuđenih. Projektni pregled ne prikazuje nepovezanu listu objavljenih sektorskih izveštaja.

## Ideje i najnovije poslovno pravilo

Predsednik vidi samo predloge koji su mu prosleđeni, uključujući one o kojima je već odlučio. /ideas ima filtere Sve, Nove, U razmatranju, Odobrene i Odbijene, pretragu i paginaciju. Kartice prikazuju naslov, sažetak, stvarni sektor/autora, datum prosleđivanja (ili ranijeg unosa ako datum prosleđivanja nedostaje), broj komentara i stanje.

Po naknadnom korisnikovom nalogu:

- Odobrenje zahteva neprazan komentar sa narednim koracima. Odluka, autor, vreme i komentar čuvaju se zajedno; komentar se pojavljuje kao predsednička instrukcija uz ideju.
- Rukovodilac koji je prosledio ideju dobija obaveštenje i vidi naredne korake. Ako više nema aktivno ovlašćenje za taj sektor, isporuka koristi sadašnje ovlašćene rukovodioce. Ako ih nema, isporuka ostaje na čekanju.
- Odbijanje je završna odluka, bez obaveznog dodatnog komentara. Autor ne može dopuniti/ponovo poslati odbijenu ideju, a rukovodilac je ne može ponovo proslediti.
- Odobrena/odbijena odluka se ne menja ponovnim klikom ili konkurentnim zahtevom. Autor i rukovodilac zadržavaju predlog u svojoj istoriji i vide predsednikovu odluku.
- Komentar i odgovor dostupni su predsedniku i posle konačne odluke. Prosleđivanje rukovodioca i dalje nije odobrenje za realizaciju.

Postojeći detalj ideje funkcionalno je prilagođen ovoj odluci. Konačan vizuelni raspored posebnog predsedničkog ekrana detalja ideje odrediće njegova naredna referenca.

Prosleđene ideje koje čekaju odluku sada doprinose istom brojaču i listi Potrebna vaša pažnja za kompaniju/sektor. Odobrenje/odbijanje uklanjaju taj predlog iz pitanja koja čekaju predsednikovu reakciju.

## API, kompatibilnost i isporuka

- GET /api/ideas/president: samo president; tab=all/new/review/approved/rejected, page i doslovna pretraga q do 160 znakova. Status i granice podataka određuje server. Stats i lista koriste iste filtere.
- POST /api/ideas/:id/read: lična, idempotentna evidencija čitanja; opcioni If-Match. Korisnik se uzima iz sesije. Obeležava i sopstveno obaveštenje o prosleđivanju kao pročitano.
- POST /api/ideas/:id/decision: samo president; obavezni If-Match i telo {action:approve/reject, comment, requestId:UUID}. Odobrenje sa praznim komentarom vraća 422; nedostajuća verzija 428; zastarela ili druga završna odluka 409. Isti zahtev može bezbedno potvrditi već sačuvan ishod.
- POST /api/ideas/:id/decision/deliver: samo president; nastavlja isporuku sačuvane odluke, bez donošenja nove.

Idea.status dobija aditivna approved/rejected stanja. Nova opciona decision čuva javnu odluku, a decisionDelivery privatnu evidenciju zahteva/isporuke, izostavljenu iz javnog JSON-a. Poslovna odluka se atomski upisuje samo iz forwarded. Postojeći dokumenti i raniji API zahtevi ostaju važeći; migracija ideja, reset baze ili promena naloga nisu potrebni.

Komentar, obaveštenja i audit koriste stabilne ID-jeve i idempotentne upise. Ako naknadna isporuka zakaže, odluka i tekst ostaju sačuvani, API vraća 202/pending, a UI razlikuje sačuvanu odluku od potvrđene isporuke. Worker ponavlja pending isporuke na 30 sekundi; poslednji pokušaj sprečava da neisporučivi zapisi blokiraju druge sektore. To nije višedokumentna Mongo transakcija. Trajne poruke se ne dupliraju; spoljašnji push transport nema garanciju da je uređaj prikazao obaveštenje.

IdeaRead je nova kolekcija sa jedinstvenim user+idea indeksom. Isti predsednički nalog ima isto stanje čitanja na drugom uređaju. Raniji predsednikov komentar takođe dokazuje da je predlog već otvorio. Nove su nepročitane forwarded ideje; pročitane forwarded su U razmatranju. Finalne odluke imaju prednost nad oznakom Nova. Postojeći tok ne vraća konačne ideje u doradu; ako se to kasnije uvede, čitanje mora da prati novu verziju prosleđivanja.

## Provere i ponavljanje

- Server: 109 regresionih testova; client: 48 testova.
- Regresioni HTTP scenario prvog predsedničkog talasa: 47 provera na svežem osnovnom fixture-u, uključujući prosleđene ideje u brojaču pažnje.
- Izolovani HTTP scenario president-wave02-check.mjs: 61 provera, uključujući odluku, obavezni komentar, granice uloga/sektora, istoriju drugih uloga, oporavak i izgubljenu potvrdu.
- Stvarni lokalni MongoDB u posebno kreiranoj privremenoj bazi: 17 provera. Provereni su konkurentni zahtevi, jedinstveni komentar/obaveštenja, privatni JSON, read marker i nastavak reda pored zapisa bez aktivnog rukovodioca. Uklonjena je samo tačno proverena baza ovog testa; demo baza nije menjana.
- Postojeći demo API: 45 auth/read provera; sopstvena testna sesija odjavljena, bez upisa poslovnih podataka ili oznaka čitanja.
- Browser: projekat/lista ideja na 320/390/820/1440 px; ispravljeno prelivanje kompozera na 320 px; očuvan jedan unos pri resize-u, paginaciji i otkazivanju izlaska; tim, filter aktivnosti, oba projektna izveštaja, prazna pretraga, greška/oporavak čitanja.
- Browser poslovni tok: blokirano prazno odobrenje; odobrenje sa komentarom → rukovodiočevo obaveštenje/detalj → odgovor → predsednikov pregled odgovora; konačno odbijanje; pending isporuka i provera izgubljene potvrde bez duplikata. Nema predsedničke odjave/menija.
- Konkurentna odluka sa drugog uređaja ne prepisuje sačuvan ishod: nakon provere prikazuje se aktuelna odluka, a drugačiji neposlati tekst ostaje dostupan za kopiranje. Izričito otkazivanje odluke ili odbacivanje oporavljenog nacrta uklanja zaštitu izlaska.
- Serverska sintaksa, frontend/PWA build, git diff --check i ignorisanje privatnog linka proveravaju se pri završetku.

Za novi fixture iz server foldera postaviti ZEPTER_UI_FIXTURE=1, ZEPTER_UI_ROLE=president, ZEPTER_UI_QA=1, ZEPTER_UI_WAVE02=1, pa pokrenuti node tests/fixtures/employee-ui-server.mjs. Zatim ZEPTER_UI_FIXTURE=1 node tests/fixtures/president-wave02-check.mjs. Potreban je svež fixture. Dodatni podaci drugog talasa postoje samo uz WAVE02; standardni prvi talas koristi fixture bez te zastavice.

QA helper president-ui-qa.mjs ima ideas-error, idea-read-error, decision-lost, decision-delivery-error, decide-other <ID ideje> i project-options-empty/normal. decide-other simulira odluku druge sesije isključivo u memorijskom QA fixture-u. Testni /__fixture/manager ulaz postoji samo uz eksplicitne QA/WAVE02 zastavice u fixture-u bez MongoDB veze. Ne postoji u produkcionom serveru. Posle provere ugasiti fixture sa stop.

ZEPTER_ISOLATED_DB_TEST=1 node tests/integration/president-isolated-db.mjs kreira isključivo novu lokalnu testnu bazu sa fiksnim prefiksom i slučajnim sufiksom, a pre uklanjanja proverava njeno tačno ime. Ne menja niti resetuje demo bazu. Živa provera čitanja ostaje president-read-check.mjs uz ZEPTER_PRESIDENT_READ_CHECK=1.

Granice: stvarni telefon/PWA instalacija, produkcioni HTTPS, fizički prijem push poruke i operativni pregled više API instanci nisu potvrđeni ovim talasom. Stari smoke ne proglašava se prolaznim i demo pretpostavke se ne popravljaju promenom podataka.
