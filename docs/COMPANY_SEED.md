# Sektori, lokalni nalozi i inicijalni planovi

Usklađivanje od 9. novembra 2026. primenjeno je na postojeću lokalnu bazu uz izričitu dozvolu korisnika i očuvanje postojećih podataka. Nije rađen reset baze, promena šema, lozinki, uloga ili predsedničkog ličnog linka.

## Organizaciona struktura

Katalog u `server/src/data/company-catalog.js` sadrži 12 sektora koje je naveo korisnik:

| Sektor | Šifra |
| --- | --- |
| Pravna služba | LEGAL |
| IT | IT |
| Marketing | MKT |
| Kontroling | CTRL |
| Finansije | FIN |
| HR | HR |
| Prodaja | SALES |
| R&D | RND |
| Logistika | LOG |
| B2B | B2B |
| Edukativni sektor | EDU |
| Call Centar | CALL |

Logistika je na dostavljenom spisku bila navedena dvaput; postoji jedan sektor. Postojećih pet sektora zadržava ID-jeve, rukovodioce, članove i veze sa poslovnim podacima. Dodatni sektori ne dobijaju izmišljene zaposlene ili rukovodioce.

## Sadržaj i nalozi

Sa prikaznih polja uklonjen je prefiks `DEMO |`; lokalne adrese promenjene su sa `@demo.zepter.test` na rezervisani domen `@zepter.test`. ID-jevi, lozinke, uloge, odobrenja, dodele i sesije ostaju sačuvani. U neprodukcijskom okruženju stara adresa ostaje alias za prijavu sa istom lozinkom. Predsednikov postojeći lični URL ostaje isti.

Prikazno ime ranijeg „Demo Predsednik“ sada je **Philip Zepter**, prema [zvaničnom profilu kompanije](https://www.zepter.rs/zepter-world/company-profile/). Ostala postojeća imena zadržana su prema nalogu korisnika; nije potvrđeno da predstavljaju stvarni kadrovski spisak. Nisu izmišljane poslovne mejl adrese zaposlenih. Novi stvarni korisnici prolaze postojeću registraciju i administratorsko odobravanje; predsednik se inicijalizuje zasebnim postojećim CLI postupkom.

Nazivi i teme planova oslanjaju se na zvanične stranice [Zepter&Partners](https://www.zepter.rs/rules/regulations-zepter-partners), [Therapy Air](https://www.zepter.rs/therapyair/therapy-air), [VacSy](https://www.zepter.rs/cookart/vacuum-storage/vacsy), [Masterpiece](https://www.zepter.rs/cookart/cooking/masterpiece-cookware) i [BIOPTRON](https://www.zepter.rs/bioptron/hyperlight-therapy/bioptron). To su predlozi operativnih planova, a ne tvrdnje da kompanija već sprovodi te projekte ili da su postignuti određeni rezultati. Ne generišu se istorija rada, objavljeni izveštaji, procenti realizacije ili medicinske tvrdnje.

Postojeći sadržaj i napredak sačuvani su. Podrazumevani naslovi originalnih seed projekata usklađuju se samo kada se poklope deterministički ID i originalni naslov; korisnički izmenjeni naslovi ostaju. Sačuvani izveštaji ne preračunavaju se današnjim podacima. U njima se čiste prikazne oznake, uz očuvanje statistike, perioda, referenci i tipova datuma.

Za sedam novih sektora dodato je 14 planiranih projekata i 56 planiranih aktivnosti, bez odgovorne osobe, dodela, rokova ili izmišljene istorije. Počinju sa 0%; timove i rokove treba dogovoriti sa stvarnim rukovodiocima.

## Pokretanje i oporavak

Iz root-a, pregled bez upisa:

```powershell
npm run seed:company
```

Iz `server/`, samo uz izričit nalog za izmenu baze:

```powershell
node src/scripts/seed-company.js --apply
node src/scripts/seed-company.js --check
```

Skripta prihvata samo lokalnu bazu `zepter_management_demo` ili `zepter_management`, bez kredencijala/upitnih parametara u URI-ju, i odbija produkciju. Interni naziv postojeće baze zadržan je da se ne promene konekcije i razvojni procesi.

Pre prvog upisa nastaje privatna kopija promenjenih polja i planiranih novih zapisa u ignorisanom `server/backups/company/`. Kopija sadrži vrednosti pre i posle izmene, sa označenim ObjectId/Date tipovima; nema lozinki, njihovih hash vrednosti ili pristupnih ključeva. Ne objavljivati je u Gitu. Vraćanje se radi kontrolisano prema tim operacijama, uz proveru naknadnih korisničkih izmena; nema automatskog rollback-a koji bi prepisao noviji rad.

Izmene postojećih zapisa koriste proveru `updatedAt` i ne falsifikuju vreme poslednjeg poslovnog ažuriranja. Konflikti sektora/mejlova zaustavljaju plan pre upisa; konflikt tokom primene zaustavlja preostale operacije. Delimično primenjen katalog može se ponovo pregledati i nastaviti; ponavljanje nad usklađenom bazom ne pravi duplikate. Zatvorenom/arhiviranom projektu ne dodaju se aktivnosti. Stari `seed-demo.js` je kompatibilni ulaz u isti postupak i podrazumevano samo prikazuje plan; više ne generiše korisnike i istoriju.

## Administracija

Na `/admin` nalaze se pregled/pretraga sektora i obrazac „Dodaj novi sektor“. Šifra se predlaže iz naziva i može se prilagoditi; opis je opcioni. Novi aktivni sektor automatski se pojavljuje predsedniku i u registraciji. Samo administrator može pozvati postojeći `POST /api/admin/sectors`. Duplikat imena/šifre daje 409; nejasna mrežna potvrda zahteva proveru liste pre novog slanja. Ugovor API-ja i model ostali su isti.

## Provere

- 154/154 serverskih i 75/75 klijentskih testova; serverska sintaksa i frontend/PWA build prolaze.
- 12/12 provera u zasebnoj privremenoj MongoDB bazi, uključujući očuvanje kredencijala, referenci, datuma, snapshot-a i ponavljanje bez duplikata. Zatvoreni projekti pokriveni su zasebnim unit testom. Privremena baza je obrisana isključivo nakon provere njenog jedinstvenog testnog imena.
- Primena je uporedila zaštićena polja svih 437 prethodnih poslovnih/nalog/pristupnih/audit zapisa pre i posle izmene. Sve provere prošle su. Naknadni `--check` vraća prazan plan.
- Lokalno stanje: 12 sektora, 23 korisnika, 29 projekata, 116 aktivnosti, 20 ideja, 25 izveštaja, 179 dnevnih unosa, 37 komentara i 15 priloga. Proverena prikazna polja nemaju preostale demo oznake; audit istorija, fizički prilozi i tajne nisu prepisivani.
- `npm run smoke:company`: 19/19. Stari `smoke:demo` ostaje alias. Smoke koristi aktuelne sektore/adrese, stvarni status odobrenja naloga i poslednji raspoloživ period izveštaja. Validan izveštaj može imati nula dnevnih unosa; ne zahteva se izmišljanje današnjeg rada. Proveravaju se tip, obuhvat, granice perioda i struktura odgovora.
- `npm run test:rbac`: 40/40 podprovera (41 zajedno sa roditeljskim testom), uključujući prijavu starim lokalnim adresama i zabrane drugih sektora. Testne sesije su odjavljene.
- 13/13 provera postojećeg privatnog predsedničkog URL-a i dva nezavisna uređaja; obe testne sesije odjavljene, bez ispisa linka.
- Lokalni browser alat i dalje vraća „Local browser use is disabled in Work settings“. Novi admin raspored implementiran je za telefon i desktop, ali vizuelna/browser E2E provera tog obrasca nije potvrđena. Upis sektora, duplikati i zabrane uloga provereni su izolovanim API testovima.

Live testovi koriste privatno podešenu lokalnu lozinku (`LOCAL_TEST_PASSWORD` za smoke ili kompatibilni `DEMO_SEED_PASSWORD`; RBAC i dalje koristi drugi naziv). Ne pokretati uzastopno sve live suite-ove više puta: dele postojeći limit od 12 prijava na 15 minuta. Nijedan test ne popunjava poslovnu bazu da bi zadovoljio zastarele demo pretpostavke.
