# Predlog faznog razvoja React frontend-a

**Treći rukovodiočev talas:** implementirani su i ekrani 5–6, [upravljanje aktivnošću i izveštaji sektora](MANAGER_WAVE_03.md), sa mobilnim/tablet/desktop CSS rasporedom. Prolaze API/unit/RBAC/build provere; vizuelna browser provera ovog talasa ostaje otvorena. Sledeći talas čeka reference za preostale ekrane, uključujući formu izveštaja. Raniji redosled i rezultati su sačuvani ispod.

**Prethodni talas:** implementirano je osam ekrana zaposlenog i prva četiri rukovodiočeva ekrana. [Drugi rukovodiočev talas](MANAGER_WAVE_02.md) obuhvata detalje projekta i kreiranje/uređivanje, sa povezanim dodavanjem aktivnosti. Mobilni i desktop prikaz pregledani su u opisanom obimu; zasebna tablet vizuelna provera ostaje navedena kao ograničenje. Prva dva rukovodiočeva i zaposleni ekrani prethodno su prilagođeni svim širinama; [rasporedi i provere](RESPONSIVE_LAYOUTS.md). Svaki sledeći talas prvo prati odobrene mobilne reference, pa dobija tablet/desktop raspored u istim komponentama.

**Naknadno usvojen redosled:** korisnik je odredio razvoj zaposlenih ekrana pre predsedničkog dela, na `develop`, u talasima po dve reference. Implementirano je svih osam ekrana zaposlenog; [četvrti talas](EMPLOYEE_WAVE_04.md) donosi detalje/doradu ideje i obaveštenja. [Treći talas](EMPLOYEE_WAVE_03.md) donosi moje ideje i slanje nove ideje. Prethodni talasi: [prvi talas](EMPLOYEE_WAVE_01.md) i [detalji projekta/aktivnosti](EMPLOYEE_WAVE_02.md). Plan ispod čuva prvobitni predlog i preostale oblasti, a aktuelni redosled prati najnovije korisničke instrukcije.

Ovo je plan narednih zadataka; novi ekrani nisu implementirani u početnoj analizi. Postojeća povezana aplikacija ostaje osnova. Redosled počinje predsedničkim interfejsom. Usvojene slike svih ekrana treba prikupiti pre precizne vizuelne implementacije; u repozitorijumu trenutno nisu dostupne.

## Faza 0 — stabilna osnova i priprema dizajna

- Uskladiti nalaze P1 iz `ANALIZA_PROJEKTA.md`: tok dnevnog rada/izveštaja, completed status, opoziv Socket.IO pristupa i potrebna poslovna prava.
- Napraviti katalog referenci i mapu: ekran → ruta → API → dozvoljene akcije. Sačuvati postojeće ugovore i statuse.
- Postepeno izvući postojeći API sloj, auth context, zajedničke kartice, forme, razgovor i priloge iz monolitnog `App.jsx`.
- Uvesti zajednički mobile layout, postojeću belo/zlatnu paletu, tipografiju, stanja učitavanja/greške/prazne liste i zaštite ruta po ulozi.
- Definisati datum `Europe/Belgrade`, paginaciju i način osvežavanja podataka. Predsednik koristi isti bezbedan login, bez javnog privilegovanog ulaza.

Kriterijum: postojeći tokovi ostaju funkcionalni; prolaze unit/regresije, RBAC, build i odgovarajući smoke u dokumentovanom demo stanju. Nema promene vizuelnog identiteta bez reference.

## Faza 1 — predsednik: osnovna hijerarhija (4 od 9 ekrana)

| Ekran | Postojeći API i potrebni delovi |
|---|---|
| 1. Početni pregled kompanije | `/dashboard/overview`, `/sectors`; prioriteti, sektori, ulazi u izveštaje i pažnju |
| 2. Pregled sektora | `/sectors/:id`, `/sectors/:id/people`, `/comments`; projekti, odgovorni rukovodilac, kontekstualna poruka |
| 3. Pregled projekta | `/projects/:id`, `/activities/project/:id`, `/comments`; tim, rokovi, procenat, istorija razgovora |
| 6. Detalji aktivnosti | `/activities/:id`, `/attachments`, `/comments`; odgovorni, urađeno/sledeće/prepreke, dokumenti i instrukcija |

Kriterijum: na telefonu predsednik dolazi od kompanije do aktivnosti jasnom hijerarhijom, vidi stvarne podatke i može poslati poruku/instrukciju. Uključiti priloge na projektu, za koje API već postoji. Pisanje proveravati u izolovanoj testnoj bazi.

## Faza 2 — predsednik: ideje, izveštaji i reakcije (preostalih 5 ekrana)

| Ekran | Postojeći API / dopuna |
|---|---|
| 4. Ideje zaposlenih | `/ideas`; samo forwarded; planski dodati kompatibilne filtere sektora/datuma |
| 5. Detalji ideje | `/ideas/:id`, komentari i privatni prilozi; bez promene toka odobravanja |
| 7. Dnevni/nedeljni izveštaji | `/reports/preview` + `/reports`; company/sector/project/employee, URL filteri, prikaz konsolidovanih podataka |
| 8. Potrebna moja pažnja | `/dashboard/attention`, `/requests`, `/assignments`; uskladiti brojač/listu i uključiti otvorene instrukcije |
| 9. Moji komentari i instrukcije | `/comments/mine/instructions`; status, odgovor i ispravan link ka svim tipovima sadržaja |

Podržati postojeće detalje zahteva, odgovor predsednika i kreiranje zaduženja rukovodiocu kao povezane tokove. Ne uvoditi novi sistem komentara. Izveštaj ne traži ponovno unošenje dnevnih rezultata; rukovodiočev objavljeni tekst dopunjuje agregat evidencije.

Kriterijum: svih 9 predsedničkih ekrana povezano sa backend-om i provereno prema referencama; rade listanje, filteri, povratak, odgovori, deep link i potrebne prazne/greška situacije.

## Faza 3 — rukovodilac: 10 ekrana

Pregled sektora; projekti sektora; detalji projekta; kreiranje/uređivanje projekta; upravljanje aktivnošću; dnevni/nedeljni izveštaji; priprema/objava izveštaja; ideje zaposlenih; odluka o ideji; obaveštenja.

Ponovo koristiti komponente iz predsedničkog dela. Dodati mobilni izbor tima i odgovornih, rokove/prioritete, dopunu i objavu nacrta, evidenciju koja nedostaje i rukovodiočeva predsednička zaduženja/zahteve. Svaka akcija ostaje u njegovom sektoru.

Kriterijum: kompletan tok sektor → projekat → aktivnost → zaposleni → evidencija → objavljen izveštaj → predsednik radi u izolovanom E2E scenariju. Vraćanje ideje na doradu i prosleđivanje imaju dokaziv tok i obaveštenja.

## Faza 4 — zaposleni: 8 ekrana

Moj pregled; moji projekti; detalji projekta; uređivanje moje aktivnosti; moje ideje; nova ideja; detalji/dorada ideje; obaveštenja.

Dnevni rad uključiti u prirodan tok aktivnosti/pregleda koristeći postojeći `/worklogs`, bez zahteva za duplim unosom sadržaja. Komentari ostaju u kontekstu projekta/aktivnosti/ideje; ne praviti poseban ekran zaposlenih komentara. Tuđe aktivnosti u zajedničkom projektu mogu se pregledati prema postojećem pravilu, ali samo dodeljene aktivnosti se uređuju; lične evidencije kolega ostaju nedostupne.

Kriterijum: zaposleni ažurira dodeljeni posao i dnevnu evidenciju, šalje/dorađuje ideju, odgovara na instrukciju i otvara privatni prilog, bez pristupa ličnim evidencijama kolega i drugim sektorima.

## Faza 5 — administracija, PWA i završna stabilizacija

- Dopuniti admin API i UI za naloge, aktivaciju/deaktivaciju, konačne uloge/sektore i audit; promene prava i postojeće reference proveriti regresijama.
- Izolovani E2E testovi za sve uloge i upise, refresh/logout/expiry, deaktiviran nalog i zabrane pristupa.
- Mobilni vizuelni pregled prema svim 27 referenci, pristupačnost, dodirni ciljevi i ponašanje tastature.
- Android/iOS instalacija, manifest/ikone, HTTPS, update service worker-a, deep link i gubitak mreže; bez keširanja privatnih API podataka. Stvarni Web Push samo uz podešen VAPID i dozvolu korisnika.
- Kontrolisano ažurirati npm audit nalaze, izmeriti velike liste/izveštaje, podesiti produkcioni SPA/API/Socket proxy i završiti MFA, backup/restore, skladište i monitoring.

Kriterijum: dogovorena matrica uloga i prihvatnih scenarija prolazi, mobilni tokovi su provereni na pravim uređajima, preostala ograničenja su poznata. Commit/push i produkciono objavljivanje nisu automatski deo faze.

## Predložena organizacija klijenta

```text
src/
  app/           # router, providers, zaštite ruta
  api/           # postojeći REST, refresh, socket, prilozi
  components/    # kartice, statusi, forme, razgovori, prilozi
  layouts/       # zajednički mobilni shell i navigacija po ulozi
  features/      # dashboard, sectors, projects, activities, ideas,
                 # reports, notifications, assignments, requests, admin, auth
  styles/        # postojeći identitet i zajednički tokeni
  sw.js
```

Ovo je cilj postepene ekstrakcije, bez masovnog prepisivanja i bez uvodjenja dodatnih biblioteka dok konkretna potreba nije potvrđena. Svaki zadatak treba da isporuči mali funkcionalan tok, proverene API pozive, dizajn poređenje i relevantne testove.
