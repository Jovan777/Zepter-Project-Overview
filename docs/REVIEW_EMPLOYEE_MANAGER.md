# Pregled zaposlenog i rukovodioca pre predsedničkog interfejsa

Datum: 8. novembar 2026. Grana `develop`. Pregledani su postojeći ekrani, povezane API rute, tokovi evidencije/izveštavanja, prilozi, komentari, obaveštenja, prijava i granice ovlašćenja. Ne uvodi se novi vizuelni identitet niti novi predsednički ekrani.

## Pronađeno i ispravljeno

| Problem | Ispravka |
|---|---|
| Starije sektorske liste nisu svuda odbijale nalog bez sektora pre DB upita. | Zajednička rana provera na projektima, korisnicima, sektorima, dnevnim unosima, zahtevima i dashboard-u. Admin/predsednik zadržavaju pristup. |
| Staro članstvo u projektu moglo je ostaviti zaposlenom pristup posle promene sektora. | Čitanje projekta zahteva i članstvo i isti aktuelni sektor. Manager bez sektora ne može dobiti prava poređenjem dve prazne vrednosti. |
| Prepreka iz samostalnog dnevnog unosa stvarala je `/activities/` bez ID-ja i prikazivala opis posla umesto prepreke. | Poruka prikazuje stvarnu prepreku i otvara aktivnost, projekat ili tačan dnevni period sektorskog pregleda. Novi report link je strogo ograničen dozvoljenom listom. |
| Dnevni unos mogao je sadržati aktivnost i drugi `projectId`, ili napredak bez aktivnosti. | Neusklađeni zahtevi vraćaju 422 pre upisa. |
| Završen projekat mogao je dobiti nezavršenu postojeću aktivnost. | Pre promene statusa/napretka takvog posla traži se aktiviranje projekta; istorijski dnevni zapis bez promene napretka ostaje dozvoljen. Isto važi za zatvoreni/arhivirani projekat pri promeni napretka dnevnim unosom. |
| Projekat je mogao imati rok pre početka. | Kreiranje i uređivanje odbijaju taj redosled datuma sa 422, uz očuvan lokalni unos. |
| Nova aktivnost na 100% mogla je ostati „U toku“. | Kreiranje koristi isto pravilo kao uređivanje: 100% vodi na proveru, osim izričitog `completed`. |
| Sporije paralelno računanje moglo je vratiti zastareo prosek napretka projekta. | Preračunavanja istog projekta serijalizuju se unutar API instance; neuspeh ne blokira naredni pokušaj. |
| Obaveštenje moglo je preneti komentar neprosleđene ideje predsedniku preko eksplicitnog primaoca ili istorijskog roditelja. | Eksplicitni primalac se odbija, a automatski primaoci ne uključuju predsednika pre prosleđivanja. Komentari prosleđene ideje i dalje mu se dostavljaju. |
| Decimale u paginaciji mogle su stići do MongoDB `skip`/`limit`. | Centralni helper uvek vraća ograničene cele brojeve. |
| Neke forme štitile su izmene podataka, ali ne i neposlat komentar. | Jedna zajednička zaštita uključuje razgovor na projektu, aktivnosti, ideji i odgovoru predsedniku na sektoru. Promena taba koja čuva razgovor ne odbacuje njegov tekst. „Sačuvaj i nastavi“ ne sme da odbaci neposlat komentar. |
| Prekid veze posle uspešnog POST-a omogućavao je slepo ponavljanje komentara, dnevnog unosa ili priloga. | Tekst ostaje vidljiv, ponovno slanje je blokirano, nude se provera sačuvanog sadržaja i izričit početak novog unosa. Potvrđena 4xx greška priloga ostavlja podržan retry; nejasan ishod ne ponavlja fajl. |
| Rukovodilac je za lični dnevni unos koristio staru nezaštićenu formu. | I on koristi postojeću poboljšanu formu sa zaštitom unosa, proverom nejasnog ishoda i paginacijom istorije. |
| Povratak kroz istoriju browsera mogao je prikazati stari automatski izveštaj uz novi period/projekat. | Read-only pregled se osvežava za ceo kontekst tipa, datuma, nivoa i projekta. |
| Preuzimanje novije verzije projekta nije resetovalo marker delimičnog čuvanja. | Eksplicitno odbacivanje nacrta sada vraća i stanje pomoćnog toka/dugmadi. |
| Zakasneli refresh/401/privatni odgovor mogao je nastaviti rad posle odjave ili promene naloga. | Generacija sesije odbacuje stare odgovore i osvežavanja. Paralelni zahtevi dele jedan refresh; konačna zabrana prijave uklanja privatni UI, prolazna greška servera ne odjavljuje korisnika. |
| Rotacija HttpOnly cookie-a mogla je završiti posle odjave. | Odjava odmah zatvara lokalnu sesiju i razgovor sa socket-om, sačeka započetu rotaciju, zatim opoziva njen cookie na serveru. Dupli klik se zaključava. Neuspešna serverska odjava prikazuje poruku i retry. |
| Privatni HTTP odgovori i preuzimanja nisu svuda eksplicitno isključivali HTTP keš. | API odgovori imaju `Cache-Control:no-store`, a klijentski zahtevi koriste `cache:no-store`. Service worker i dalje ne kešira API/priloge. |
| Svi zaposleni ekrani bili su deo početnog JavaScript paketa. | Ekrani se učitavaju na zahtev kroz `React.lazy`/`Suspense`, unutar postojećeg shell-a. Početni paket je smanjen sa približno 497 kB pre pregleda na približno 434 kB; sam obrazac se ne duplira po širini. |

Nisu menjani modeli, indeksi, statusi ili nazivi/tela postojećih API ugovora. Nema migracije. Stroža validacija odnosi se na neispravne datume, kontekste, neovlašćen pristup i nelogične promene zatvorenog projekta. Novo zaglavlje `X-Zepter-Fixture-Role` postoji samo u izolovanom QA fixture-u, iza eksplicitnog okruženja i dummy tokena; produkcioni server ga ne koristi za autorizaciju.

## Obuhvat završenih ekrana

| Celina | Provereni tokovi i izvori dokaza |
|---|---|
| Zaposleni: pregled i projekti | Lični/sektorski filteri, brojači, pretraga, statusi, paginacija, linkovi; unit/regresije i live RBAC. |
| Zaposleni: projekat i aktivnost | Članstvo, dodela, verzionisano čuvanje, status/napredak, prilozi, odgovori, prenos urađenog u evidenciju; HTTP regresije i povezani fixture tok. |
| Zaposleni: lista, slanje i dopuna ideje | Autor/sektor, kreiranje, potvrđeni i nejasni neuspesi priloga, dorada, verzija, ponovno slanje, zabrane tuđeg sadržaja; unit/HTTP i povezani tok. |
| Zaposleni: obaveštenja | Primaoci, kategorije, nepročitane/ranije stranice, read/read-all i bezbedni linkovi; HTTP regresije i izolovani runner. |
| Rukovodilac: pregled i projekti | Statistika, kašnjenja, zatvoreni/arhivirani projekti, predsednikova instrukcija/odgovor, ideje; runner talasa 01 i live RBAC. |
| Rukovodilac: projekat i forma | Kreiranje/izmena, tim, dodela, uklanjanje članova sa aktivnostima, datumi, verzija i komentari; runner talasa 02 i HTTP regresije. |
| Rukovodilac: aktivnost i lista izveštaja | Polja/dodela/status, privatna istorija, prikaz audit polja, dnevni/nedeljni filter i paginacija; runner talasa 03. |
| Rukovodilac: priprema izveštaja i ideje | Priprema bez upisa, postojeći nacrt, snapshot, verzija, jednokratna objava, neizmenjiv objavljen sadržaj; sektorski statusi/brojači; runner talasa 04. |
| Rukovodilac: odluka i obaveštenja | Privatni prilog, kontekstualni odgovor, dorada, prosleđivanje, sopstvena ideja/dopuna, konflikti i pojedinačni primaoci; runner talasa 05. |
| Veza sa predsednikom | Novi runner prolazi ceo povezani tok kroz tri uloge i proverava stvarni sadržaj objavljenog izveštaja i prosleđene ideje, uz zabrane i po jedno obaveštenje. |

## Rezultati

Prethodni browser rezultati talasa ostaju u svojim dokumentima; ne predstavljaju vizuelnu potvrdu izmena ovog pregleda.

| Završna provera | Rezultat |
|---|---|
| `npm run test:server` | **90/90**; regresije ovlašćenja, podataka/konkurencije i tri nove provere odjave smoke sesija. Lokalni HTTP testovi zahtevaju dozvoljen loopback pristup; pokretanje bez njega dalo je `fetch failed`, a dozvoljeno ponovno pokretanje prolazi. |
| `npm run test:client` | **39/39**; uz ranije provere sesije, upload-a i linkova, pet novih regresija stvarno renderuje report komponente i proverava nedeljne periode, postojeći objavljen izveštaj, nastavljanje nacrta i read-only detalje. SSR provera ne izvršava browser događaje. |
| `npm run check:server` | **58 JS/MJS fajlova**, bez sintaksnih grešaka. |
| `npm run build:client` | Prošao React i PWA build; početni JS **434,35 kB**, gzip 133,81 kB; bez ranijeg upozorenja za veliki početni chunk. |
| Lokalni API | HTTP 200 i `Cache-Control:no-store`, bez nove prijave za tu proveru. |
| Git provera | `git diff --check` prolazi; modeli, zavisnosti i lock fajlovi nisu menjani. |

- Novi `workflow-audit-check.mjs`: **28 HTTP provera** nad memorijskim modelima. Tok: projekat → dodela → zaposleni završava posao → dnevni unos → instrukcija i odgovor → ideja/dorada/ponovno slanje/prosleđivanje → nacrt → objava → predsednik. Nacrti/tuđi sektori su zabranjeni, duple odluke/objave odbijene, objavljeni tekst i evidencija stvarno su pročitani predsedničkom ulogom.
- Svi postojeći `manager-wave01-check.mjs` do `manager-wave05-check.mjs` ponovo prolaze, svaki na zasebnom svežem fixture-u bez QA dodatnih ideja.
- `employee-wave04-check.mjs` ponovo prolazi na svežem employee fixture-u: autorska dorada, konflikt, odgovor, jedno ponovno slanje, kategorije/grupisanje i čitanje obaveštenja.
- Live `npm run test:rbac`: **40/40 podprovera**, 41 sa roditeljskim testom. Testne sesije su odjavljene.
- `npm run smoke:demo`: **15/19**, ista četiri ranija neuspeha: već odobren demo kandidat i odsutne očekivane današnje evidencije kompanije/sektora. Nisu menjani podaci ili testna očekivanja radi zelenog rezultata.
- Poslednje ponavljanje smoke-a, nakon popravke čišćenja sesija, zaustavio je stvarni limiter prijava (12/15 min), jer su prethodno pokrenuti live RBAC i smoke. U tom pokušaju kreirana je i odjavljena jedna sesija. Limiter nije isključen/resetovan. Odjava svih 4/5 testnih sesija pri uspehu, prekidu i neočekivano odobrenom kandidatu zasebno prolazi na lažnom HTTP serveru. Ranija smoke pokretanja nisu imala čišćenje sesija; postojeće korisničke sesije nisu masovno opozivane.

## Naknadna browser provera i ispravke

Pristup je proradio nakon ponovnog povezivanja. Raniji neuspeli pokušaji ne predstavljaju rezultat ovih provera. Na `localhost:5173` pročitano je stvarno rukovodiočevo stanje, reprodukovan problem nedeljnog izveštaja i potvrđeno otvaranje forme za drugu nedelju. Tu nisu čuvani projekti, izveštaji ili drugi poslovni podaci. Svi browser upisi ispod izvršeni su na `127.0.0.1:4002`, bez MongoDB veze, sa zasebnim employee i manager fixture procesima.

### Dodatno ispravljeno

- Dugme „Novi nedeljni izveštaj“ za već objavljenu nedelju ranije je odmah prikazivalo stari zaključani sadržaj. Sada zadržava jasan ekran kreiranja, objašnjava da period već postoji i nudi prethodnu/sledeću nedelju, izbor datuma ili otvaranje objavljenog izveštaja. Novi period ima uređiva sažeta polja, a postojeći nacrt se nastavlja bez duplikata.
- Datum u novom toku ostaje datum iz URL-a; ne zamenjuje se neprimetno ponedeljkom postojećeg izveštaja. Unos datuma ne prebacuje ekran dok se datum kuca: korisnik bira „Pripremi izveštaj“. Učitavanje je odvojeno po kontekstu perioda, tako da prethodni period ne može kratko prikazati svoju formu kao novi.
- Nejasna potvrda čuvanja ili objave izveštaja blokira sledeći upis do provere sačuvane verzije. If-Match/If-None-Match i postojeće serverske zabrane ostaju na snazi.
- Rukovodiočevo slanje sopstvene ideje koristilo je nezaštićenu staru formu. Sada koristi zajedničku formu sa prilozima, zaključavanjem slanja i zaštitom neposlatog unosa; autorska dopuna/ponovno slanje i dalje rade, uz odgovarajući tekst za ulogu.
- Na 320 px status je previše sužavao naslove projekta i aktivnosti rukovodioca. Status se sada raspoređuje ispod naslova, uz isti identitet i sadržaj.
- Nedostajuća vrednost prioriteta ima kratku oznaku „Nije zadat“ umesto praznog polja; naknadna promena statusa u „Završeno“ potvrđena je u UI-ju sa napretkom 100%.
- Smoke skripta odjavljuje svoje sesije u završnom čišćenju, uključujući prekid testa i neočekivano uspešnu prijavu kandidata. Postojeća četiri demo očekivanja nisu ublažena.

### Potvrđeni UI scenariji

| Celina | Browser provera |
|---|---|
| Zaposleni: pregled/projekti | Otvaranje zadataka, projekti i detalji, prazan statusni filter, tuđa aktivnost bez dugmeta za uređivanje. |
| Zaposleni: aktivnost i evidencija | Čuvanje urađenog/napretka, prenos istog teksta u dnevni unos; izgubljena potvrda evidencije ostavlja tačno jedan prikazani unos i blokira retry. |
| Zaposleni: komentari i prilozi | Neposlat komentar ostaje pri resize-u i blokira izlazak. Simulirani upis sa 503 potvrdom stvarno čuva jedan komentar/prilog; ponovno slanje ostaje blokirano, sadržaj se može proveriti. |
| Zaposleni: ideje | Nova ideja sa prilogom; nejasna potvrda priloga ne ponavlja ideju/fajl. Otvoren sačuvani prilog; dopuna vraćene ideje, odgovor i jedno ponovno slanje. „Sačuvaj i nastavi“ je blokirano uz neposlat komentar. |
| Zaposleni: obaveštenja/odjava | Sve kategorije, aktiviranje filtera tastaturom, direktno otvaranje aktivnosti, čitanje svih i odjava do prijavne forme. |
| Rukovodilac: sektor/projekat | Odgovor predsedniku, zaštita neposlatog teksta; kreiranje projekta sa početnom aktivnošću, naknadna aktivnost, uređivanje projekta i zaštita članova sa postojećim dodelama. |
| Rukovodilac: aktivnost | Dodela dodatne osobe, promena prioriteta/roka, čuvanje, instrukcija i sanitizovana istorija rada. |
| Rukovodilac: izveštaji | Novi nedeljni period → sažetak → nacrt → objava → zaključan sadržaj. Izgubljena potvrda nacrta, provera/preuzimanje server verzije, blokada ponovljenog upisa. Greška pripreme i retry ostaju u istom weekly URL-u. Sažetak ostaje pri resize-u; promena perioda/izlazak traže odluku o nesačuvanom tekstu. Paginacija radi; promena tipa i browser Back ne vraćaju stari automatski preview. |
| Rukovodilac: ideje/obaveštenja | Paginacija, prazna lista, privremena greška/retry; dorada uz obrazloženje, izgubljena potvrda odluke i blokada ponavljanja, prosleđivanje; autorska dopuna sopstvene ideje. Kategorije, prazno/greška stanje poruka, čitanje svih i direktni link kada označavanje kao pročitanog ne uspe. |

**Raspored:** 32 DOM merenja (osam zaposlenih ekrana × 320/390/820/1440 px) i 44 merenja rukovodioca (deset ekrana, uz zasebnu formu kreiranja/uređivanja projekta). Nijedno od 76 merenja nije imalo horizontalno prelivanje dokumenta. To su merenja rasporeda, ne 76 pojedinačnih vizuelnih poređenja sa referencom. Screenshot provere obuhvatile su mobilne preglede/listu projekata, detalje i dopune, tablet formu projekta i desktop razgovore, izveštaj i obaveštenja. Pri prelasku širina potvrđeno je očuvanje unosa projekta, aktivnosti, sažetka, komentara i ideje. Jedna instanca forme ostaje na svim širinama.

Kontrole nejasnih upisa: u svežem fixture-u postaviti `ZEPTER_UI_QA=1` i `ZEPTER_UI_ROLE=employee` ili `manager`, a zatim iz drugog terminala izvršiti `ZEPTER_UI_FIXTURE=1 node tests/fixtures/manager-ui-qa.mjs comment-lost`, `worklog-lost` ili `attachment-lost` (PowerShell promenljivu postaviti zasebno). Server stvarno izvrši testni upis i vrati 503 umesto potvrde. Kontrole nisu deo produkcionog servera i ne pristupaju MongoDB.

### Granice i sledeća provera

- Browser blokada je prevaziđena i navedeni scenariji su provereni; nije potvrđena svaka moguća kombinacija stanja ili potpuno poklapanje svakog piksela sa referencama. Učitavanje i greška pripreme izveštaja ostavljaju navigaciju dostupnom. Mobilna tastatura na stvarnom uređaju nije proverena.
- Pravi Android/iOS, instalacija PWA, stvarni Web Push, kompletna pristupačnost i produkcioni bezbednosni/load pregled ostaju zasebni prihvatni scenariji. Automatsko generisanje obaveštenja za kašnjenje/scheduler i postojeće preprodukcione stavke nisu dodati ovim pregledom.
- Red napretka serijalizuje upise samo unutar jedne Node instance. Više API instanci zahteva koordinaciju/DB transakcije; procesni prekid između poslovnog upisa i audita/obaveštenja nema transakcionu garanciju dostave. UI ne ponavlja slepo POST posle takvog ishoda. Ovim pregledom nije uvedena serverska idempotency kolekcija niti promena MongoDB topologije.
- Rezultati dokazuju navedene provere, ne odsustvo svih mogućih bagova. Demo smoke nije u celini zelen; ograničenja i poslednji rate-limit prekid navedeni su iznad.

## Ponavljanje povezanog testa

Svež fixture, iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
$env:ZEPTER_UI_ROLE = 'manager'
$env:ZEPTER_UI_QA = '1'
node tests/fixtures/employee-ui-server.mjs
```

U drugom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
$env:ZEPTER_UI_QA = '1'
node tests/fixtures/workflow-audit-check.mjs
```

Runner proverava dummy sesiju i koristi samo `127.0.0.1:4002`. Nakon provere ugasiti fixture komandom `stop`; on proverava svoju temp putanju i uklanja sopstvene priloge. Ne seeduje se baza niti se menjaju demo nalozi. Postojeći korisnikov Vite/API procesi se ne gase.

Sopstveni fixture procesi su ugašeni i njihovi privremeni prilozi očišćeni; poslednji procesi su završeni komandom `stop`, a raniji proces koji je korisnik zaustavio imao je zasebno čišćenje njegove tačno identifikovane temp putanje. Završna provera potvrđuje zatvoren port 4002. Nije rađen commit, push, seed/reset, izmena demo naloga/lozinki ili poslovnih zapisa u MongoDB.
