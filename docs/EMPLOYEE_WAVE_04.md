# Zaposleni — Detalji ideje i Obaveštenja

Datum: 8. novembar 2026. Grana: `develop`. Prethodne izmene trećeg talasa ostale su sačuvane u radnoj kopiji; commit/push nije rađen.

## Implementirani ekrani

`/ideas/:id` sada za zaposlenog prikazuje ceo predlog, korist za kompaniju, autora, sektor, datum i status, razlog vraćanja na doradu, broj privatnih priloga i komentare sa imenima, ulogama, vremenom i odgovorima. Nisu dodavane lažne fotografije korisnika; komentari imaju inicijale. Sektor i autor dolaze iz API-ja.

Samo autor ideje u statusu `revision_requested` vidi „Dopuni ideju“ i „Ponovo pošalji“. Prvo dugme otvara obrazac sa postojećim naslovom, opisom i koristi. „Sačuvaj dopunu“ čuva tekst bez prosleđivanja; „Ponovo pošalji“ najpre čuva izmenjeni tekst, pa vraća ideju rukovodiocu kroz postojeći resubmit endpoint. Posle uspeha status je „Na razmatranju“ i forma se zaključava. Otkaži izmene vraća poslednji sačuvani tekst. Navigacija/browser Back i `beforeunload` štite nesačuvanu dopunu, uz mogućnost čuvanja pre izlaska. Nema lokalnog skladištenja privatnog teksta.

Prilozi koriste postojeću komponentu i pravo autora; upload je trenutan i odvojen od čuvanja teksta. Komentari/odgovori koriste postojeći razgovor i backend, bez novih prava za kolege ili novog zasebnog ekrana. Prikaz ideje nema automatsko prepisivanje nacrta pri Socket.IO događaju; dugme „Osveži status ideje“ i obrada konflikta preuzimaju aktuelni predlog. Razgovor i prilozi se osvežavaju postojećim događajima.

`/notifications` ima kategorije Sva / Zadaci / Projekti / Ideje / Smernice, nove i ranije stavke, paginaciju po 12, vreme događaja, nepročitanu oznaku i dugme „Označi sva kao pročitana“. Broj uz „Nova“ odnosi se na sve nepročitane stavke izabrane kategorije; ukupni brojač iznad liste i zvono obuhvataju sve kategorije. Nepročitane stavke prethode svim pročitanim, uključujući prelaze između stranica. Dugme za sva pročitana odnosi se na sve kategorije korisnika.

Klik označava jednu stavku kao pročitanu, osvežava brojač i otvara povezani sadržaj. Pri neuspelom označavanju ostaju greška i eksplicitan link za otvaranje bez označavanja. Pročitana stavka se otvara bez dodatnog upisa. Prihvataju se samo poznate lokalne putanje i ID-jevi, kao i eksplicitno podržane liste (npr. `/reports`); spoljašnji URL, `javascript:`, nepoznate putanje i proizvoljni query parametri ne ulaze u navigaciju. Backend i dalje proverava pristup otvorenom resursu. Nedostupan/obrisan resurs prikazuje postojeće stanje greške, bez proširenja ovlašćenja.

Obaveštenja su dodata kao četvrta stavka donje navigacije zaposlenog, prema osmoj referenci. Zvono prikazuje stvaran broj (do `99+`); detalji ideje imaju zaglavlje „Ideja“ i povratak na ličnu listu. Postojeće uključivanje Web Push-a ostaje dostupno u pomoćnom, sklopljenom delu obaveštenja. Podešavanja i stvarno slanje na telefon nisu menjani ni automatski uključivani.

Reference su neizmenjeno sačuvane u `design/employee/07-detalji-ideje.png` i `08-obavestenja.png`. Stvarni podaci i postojeći belo/zlatni stil imaju prednost nad izmišljenim sadržajem sa slike. **Vizuelna browser provera ovog talasa nije obavljena: lokalni browser je isključen u Work podešavanjima.** Build i API provere ne potvrđuju izgled na telefonu; to ostaje jasno izdvojena završna provera.

## Kompatibilne dopune backend-a

- `PATCH /api/ideas/:id` podržava opcioni `If-Match: "<updatedAt ISO>"`. Uz header se upis radi atomski uslovljen autorom, statusom dorade i verzijom. Stari pozivi bez header-a zadržavaju postojeći ugovor.
- `POST /api/ideas/:id/resubmit` prihvata isti opcioni header. Promena u `submitted`, pražnjenje reviewNote i povećanje `revisionCount` su jedan atomski upis sa uslovom `revision_requested`, i za stare klijente. Dvostruki/konkurentni zahtev ne šalje novu poslovnu tranziciju. Zastarela verzija ili izgubljena trka vraćaju 409.
- UI pri konfliktu zadržava unos i omogućava pregled i eksplicitno preuzimanje novije verzije. Ako PATCH uspe, a resubmit ne uspe, sačuvana dopuna se ne gubi. Kod mrežne/serverske greške bez potvrde UI traži proveru aktuelnog statusa pre ponovnog pokušaja, jer je server možda već obradio zahtev. Ovo nije novi serverski idempotency ugovor.
- `GET /api/notifications` prihvata opcioni `category=all|tasks|projects|ideas|guidance` i `grouped=true`. Bez novih parametara važe prethodni redosled i oblik odgovora. Sa `grouped=true` odgovor dodatno sadrži `filteredUnread`; `unread` i dalje znači sve nepročitane stavke korisnika. Paginacija čita prvo nepročitanu, zatim pročitanu grupu, svaku po `createdAt` opadajuće i stabilnom `_id` redosledu.
- Zadaci koriste linkove aktivnosti/zaduženja; projekti i ideje svoje resursne linkove. Smernice obuhvataju `type=instruction`, kao i postojeći sistemski par `type=comment`, `title=Nova instrukcija`. Instrukcija na projektu/ideji dostupna je i po sadržajnoj kategoriji i u Smernicama. Izveštaji i ostale novosti ostaju pod Sva. Nije menjana istorija obaveštenja radi nove klasifikacije.
- Identitet pri čitanju, pojedinačnom i grupnom označavanju dolazi isključivo sa sesije. Query/body drugog korisnika ne proširuje pristup. MongoDB modeli, uloge, tok odobravanja i postojeće rute nisu zamenjeni; nema migracije ili novih npm zavisnosti.

## Provere i ograničenja

Naknadno, 8. novembra: browser pristup je omogućen i ekrani su pregledani u okviru [mobilnog/tablet/desktop prilagođavanja](RESPONSIVE_LAYOUTS.md). Tabela ispod čuva rezultate u trenutku četvrtog talasa.

| Provera | Rezultat |
|---|---|
| `npm run test:server` | 37/37; autor/status dorade, verzionisan upis, zastarela verzija, atomska trka, jedno resubmit obaveštenje rukovodiocu, odgovor na instrukciju, tuđa ideja, privatnost obaveštenja i granice grupisane paginacije |
| `npm run test:client` | 10/10; uključuje dozvoljene lokalne linkove, sprečavanje spoljašnje/proizvoljne navigacije, ikone i vreme obaveštenja |
| `npm run test:rbac` | 32/32 live podprovere, 33 sa roditeljskim testom; poslovni podaci samo čitani, testne sesije odjavljene |
| `npm run check:server` | Prošla provera JS/MJS sintakse |
| `npm run build:client` | Prošao React i PWA build |
| Izolovani API tok | Dopuna, 409 za stari prozor, odgovor i answered roditelja, ponovno slanje jednom, tačan revisionCount i status; sve kategorije, granica stranice Nova/Ranije, pojedinačno i grupno označavanje i tačni brojači |
| Postojeći smoke | 15/19; ista četiri neuspeha: demo kandidat je već odobren, za 8. novembar nedostaju dnevni unosi kompanije/sektora |
| Vizuelno/UX u browseru | Nije izvršeno zbog isključene lokalne browser automatizacije; nisu sačuvani screenshot-ovi ovog talasa |

Izolovani tok koristi stvarne Express rute sa modelima u memoriji, bez dotenv/MongoDB i sa svojim privremenim prilozima. Test server je ugašen sa `stop` i očistio je svoj direktorijum. Nema upisa poslovnih podataka u demo bazu, seed/reset-a, promena naloga/lozinki, commit-a ili push-a. Prijave live testova standardno ažuriraju `lastLoginAt` i kreiraju auth sesije.

## Ponovljiva lokalna provera

Uz Vite na portu 5173, u prvom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/employee-ui-server.mjs
```

Na svežem fixture serveru, u drugom terminalu iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
node tests/fixtures/employee-wave04-check.mjs
```

Skripta zahteva eksplicitan flag, fiksni loopback port 4002 i dummy fixture token pre bilo kakvog poslovnog upisa. Ne koristi demo login ili stvarnu bazu. Za ponovno izvršavanje pokrenuti nov fixture server. Komanda `stop` u prvom terminalu gasi i čisti test. Kroz agentski terminal koristiti `tty:true`.

Za preostalu ručnu vizuelnu proveru, na svežem fixture serveru otvoriti `/ideas/b2b2b2b2b2b2b2b2b2b2b2b2` i `/notifications` na 320/390/1280 px. Proveriti prikaz dugog teksta, otvaranje/otkazivanje dopune, browser Back sa nacrtom, čuvanje i slanje, povratak iz obaveštenja, sve kategorije, brojač i prazno stanje posle označavanja. Promenom ideje u dva prozora proveriti da se nacrt ne prepisuje bez odluke. Pravi Android/iOS, PWA install i Web Push zahtevaju zasebnu proveru na uređaju.
