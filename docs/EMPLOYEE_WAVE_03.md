# Zaposleni — Moje ideje i Nova ideja

Datum: 8. novembar 2026. Grana: `develop`.

## Ekrani i postojeći tok

- `/ideas`: lične ideje, ukupan broj i broj na doradi, filteri Sve / Na razmatranju / Na doradi / Prosleđene predsedniku, kartice sa naslovom, opisom, stvarnim statusom, datumom slanja i razlogom dorade. Lista ima paginaciju po osam stavki; nepostojeća stranica vraća na prvu. Dodato je jasno dugme „Nova ideja“.
- `/ideas/new`: naslov i kratak opis su obavezni, korist i prilozi opcioni. Granice teksta prate backend (220 / 7000 / 4000 znakova). Sektor se prikazuje iz naloga i ne može se birati drugi sektor.
- Nakon uspeha otvaraju se postojeći detalji ideje. Redizajn tog sedmog ekrana ostaje za sledeću referencu. Ostale uloge koriste postojeće komponente i API.
- Reference su sačuvane neizmenjene u `design/employee/05-moje-ideje.png` i `06-nova-ideja.png`. Bele kartice, zlatni akcenti i donja navigacija prate prethodne ekrane. Kartica koristi prvu stvarnu sliku iz privatnih priloga; bez slike prikazuje ikonu ideje. Fotografije i podaci iz mockup-a nisu ubačeni kao demo podaci.

## API i ovlašćenja

Novi kompatibilni read-only endpoint je `GET /api/ideas/mine?tab=all&page=1&limit=8`, registrovan pre `/:id`, samo za `employee`. Odgovor:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 8,
  "stats": {"total": 0, "revision": 0}
}
```

Stavke sadrže `_id`, naslov, opis, status, napomenu za doradu, `createdAt` i `thumbnailId` ili null. Globalni brojači obuhvataju sve ideje autora, nezavisno od filtera i stranice. Tabovi su `all`, `review` (`submitted` i `in_review`), `revision` (`revision_requested`) i `forwarded`. Nepoznat tab vraća 422, druge uloge 403, neprijavljen korisnik 401.

Autor dolazi isključivo sa serverske sesije. Query parametri za drugog autora/sektor ne proširuju pristup. Zaposleni zadržava pristup sopstvenim idejama i ako mu se sektor kasnije promeni, kao u postojećoj `/ideas` ruti. Slike se preuzimaju preko autentifikovane `/attachments/:id` rute, bez javnih upload putanja ili service worker keša. Tuđa ideja ostaje nedostupna čak i kolegi iz istog sektora.

Kreiranje koristi postojeći `POST /api/ideas` sa naslovom, opisom i koristi. Backend dodeljuje `author`, `sector` i `submitted`, vodi audit i šalje postojeće obaveštenje odobrenim rukovodiocima sektora. MongoDB šema i postojeći statusi/ugovori nisu menjani; nema novih zavisnosti ili migracije.

## Prilozi, greške i nedovršen unos

Fajlovi se prvo biraju lokalno i mogu ukloniti pre slanja. Formati i veličine dolaze iz `/attachments/config`; server i dalje proverava stvarni MIME i pravo autora. Pri slanju se najpre kreira ideja, pa prilozi dodaju postojećim `POST /attachments?targetType=idea&targetId=…`. Postojeći API zahteva ID pre dodavanja fajla; rukovodilac zato može dobiti obaveštenje pre završetka svih upload-a.

Ako neki upload ne uspe, forma jasno prikazuje da je ideja poslata, zaključava njen tekst i nudi ponavljanje samo nedodatih priloga ili otvaranje poslate ideje. Kreirani ID i uspešni upload-i ostaju u memoriji forme; ponovni pokušaj ne pravi novu ideju i ne ponavlja potvrđene fajlove. Dugme ima i neposrednu ref zaštitu od dvostrukog klika. Pri mrežnoj/serverskoj grešci bez potvrđenog odgovora na kreiranje forma zaustavlja ponovno slanje i traži proveru liste, jer je ideja možda već nastala.

Ovo nije serverska idempotentnost: ako server obradi zahtev, a odgovor se izgubi, klijent nema pouzdanu potvrdu. Kod takvog prekida upload-a proveriti postojeće priloge u detaljima pre dodatnog ručnog slanja. Nije dodavan novi idempotency ugovor ili lažni draft status.

Navigacija i browser Back traže potvrdu izlaska iz nedovršene forme; osvežavanje/zatvaranje koristi `beforeunload`. Tekst i fajlovi ostaju samo u memoriji, bez localStorage kopije. Odjava ostaje dostupna. Napuštanje poslate ideje sa neuspelim prilozima ne briše već sačuvanu ideju/priloge.

## Provere

| Provera | Rezultat |
|---|---|
| `npm run test:server` | 30/30: uključuje author scope, brojače, oba review statusa, praznu listu, zabranjene uloge/polja, sektor sa sesije, obaveštenje rukovodiocu i privatnost tuđe ideje |
| `npm run test:client` | 7/7: uključuje kreiranje jednom pri ponovnom upload-u, preskakanje već dodatih fajlova i neuspeh kreiranja bez pokušaja upload-a |
| `npm run test:rbac` | 30/30 live podprovera (31 sa roditeljskim testom); samo čitanje poslovnih podataka, sesije odjavljene |
| `npm run check:server` | Prošla sintaksa 39 JS/MJS fajlova |
| `npm run build:client` | Prošao React i PWA build |
| `npm run smoke:demo` | 15/19; ista četiri neuspeha kao prethodni talas: kandidat je već odobren, a za 8. novembar nema dnevnih unosa |
| Browser sa izolovanim podacima | Svi filteri, globalni brojači, razlog dorade, privatna blob minijatura, slanje sa/bez priloga, kontrolisan neuspeh prvog upload-a i uspešan retry na isti ID (broj ideja povećan jednom), zadržavanje unosa pri odustajanju od izlaska, browser Back i vraćanje sa stranice 999 |
| Responsive | Vizuelno proverene širine 320, 390 i 1280 px; mobilna lista i forma bez horizontalnog prelivanja |

Serverski HTTP testovi u ograničenom sandbox-u prvo su naišli na `fetch failed`; ponovljeni uz dozvoljen lokalni mrežni pristup prolaze. Nisu menjani testovi radi prikrivanja greške.

Browser je pri završnom pokušaju čuvanja snimka isključen u Work podešavanjima. Prethodne vizuelne i funkcionalne provere su obavljene, ali završni screenshot nije sačuvan. Izolovani server je ugašen komandom `stop` i sam je očistio sopstvene privremene priloge. Android/iOS uređaji, pravi PWA install, obaveštenja na telefonu i proizvoljni mrežni prekidi nisu u potpunosti testirani.

Nije rađen seed/reset, upis poslovnih podataka u demo bazu, promena demo naloga ili lozinki, commit ili push. Live auth provere standardno kreiraju sesije i ažuriraju `lastLoginAt`.

## Ponovljiv lokalni UI test

Uz Vite na 5173, iz `server/`:

```powershell
$env:ZEPTER_UI_FIXTURE = '1'
# Opciono, za proveru retry toka bez stvarnog kvara servera:
$env:ZEPTER_UI_FAIL_UPLOAD_ONCE = '1'
node tests/fixtures/employee-ui-server.mjs
```

Otvoriti `http://127.0.0.1:4002/ideas`. Fixture ne učitava `.env`, ne povezuje MongoDB, koristi modele u memoriji i zaseban OS temp direktorijum. Prvi upload pri navedenom opcionom flag-u vraća testnu 503 pre kreiranja metadata; retry prolazi. Primer minijature je postojeća javna ikona aplikacije dodata kao privatni testni prilog. Komanda `stop` ili Ctrl+C gasi proces i čisti taj direktorijum. Kroz agentski terminal koristiti `tty:true` za rad stdin-a. Ovaj server se nikada ne koristi za produkciju.
