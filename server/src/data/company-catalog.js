// Sector structure supplied by the project owner. Product references are public;
// project plans are proposed operational content, not verified company results.
export const companySources=[
 'https://www.zepter.rs/zepter-world/company-profile/',
 'https://www.zepter.rs/rules/regulations-zepter-partners',
 'https://www.zepter.rs/therapyair/therapy-air',
 'https://www.zepter.rs/cookart/vacuum-storage/vacsy',
 'https://www.zepter.rs/cookart/cooking/masterpiece-cookware',
 'https://www.zepter.rs/bioptron/hyperlight-therapy/bioptron'
];
const project=(title,description,tasks)=>({title,description,tasks});
export const companySectors=[
 {code:'LEGAL',name:'Pravna služba',description:'Ugovori, pravna podrška sektorima i pregled poslovne dokumentacije.',projects:[
  project('Uređenje ugovora sa poslovnim partnerima','Priprema jedinstvenog pregleda ugovora, rokova i odgovornih osoba za partnersku saradnju.',['Popis važećih ugovora','Pregled ugovornih obrazaca','Usaglašavanje sa prodajom','Plan praćenja rokova']),
  project('Pravni pregled internet prodavnice','Pregled uslova kupovine, obaveštenja kupcima i toka reklamacija.',['Popis objavljenih dokumenata','Pregled uslova kupovine','Usaglašavanje procedura','Priprema predloga izmena'])]},
 {code:'IT',legacy:'DEMO_IT',name:'IT',description:'Poslovne aplikacije, infrastruktura, integracije i podrška korisnicima.',projects:[
  project('Integracija internet prodavnice i ERP sistema','Usklađivanje kataloga, dostupnosti proizvoda i statusa porudžbina između prodajnih i poslovnih sistema.',['Mapiranje podataka i integracija','Definisanje API ugovora','Razvoj integracionog sloja','Provera razmene porudžbina']),
  project('Zepter Management Overview','Centralni pregled projekata, aktivnosti i izveštaja za predsednika, rukovodioce i zaposlene.',['Provera korisničkih ovlašćenja','Povezivanje poslovnih tokova','Uređenje korisničkog interfejsa','Provera mobilnog i desktop rada']),
  project('Automatizacija poslovnih izveštaja','Priprema pouzdanih izvora podataka za izveštaje po sektorima i prodajnim kanalima.',['Mapiranje izvora podataka','Definisanje pokazatelja','Povezivanje izvora','Validacija prikazanih rezultata'])]},
 {code:'MKT',legacy:'DEMO_MKT',name:'Marketing',description:'Brend, sadržaj, digitalni kanali, kampanje i podrška prezentaciji proizvoda.',projects:[
  project('Unapređenje Zepter internet prodavnice','Jasniji prikaz ponude Therapy Air, BIOPTRON, Masterpiece i VacSy proizvoda na telefonu i računaru.',['Predlog strukture i dizajna','Uređenje početne stranice','Priprema sadržaja proizvoda','Provera mobilnog korisničkog toka']),
  project('Komunikacija programa Zepter&Partners','Usklađivanje materijala koji objašnjavaju partnerski program i načine saradnje.',['Kreativni koncept programa','Priprema komunikacionih materijala','Uređenje odredišne stranice','Provera poruka sa prodajom']),
  project('Uređenje digitalnog kataloga proizvoda','Ujednačavanje naziva, fotografija i opisa proizvoda u internet prodavnici.',['Pregled kategorija proizvoda','Priprema fotografija','Usklađivanje opisa i prevoda','Završna urednička provera'])]},
 {code:'CTRL',name:'Kontroling',description:'Planiranje, poslovni pokazatelji i analiza odstupanja po sektorima i kanalima.',projects:[
  project('Pregled pokazatelja prodajnih kanala','Jedinstven prikaz pokazatelja internet prodavnice, salona i partnerske prodaje.',['Popis izvora pokazatelja','Dogovor definicija sa sektorima','Priprema pregleda odstupanja','Predlog mesečnog izveštavanja']),
  project('Planiranje troškova po sektorima','Ujednačen proces prikupljanja planova i praćenja odstupanja od odobrenih budžeta.',['Priprema obrazaca planiranja','Usklađivanje kategorija','Prikupljanje predloga sektora','Konsolidacija plana'])]},
 {code:'FIN',legacy:'DEMO_FIN',name:'Finansije',description:'Računovodstvo, platni promet, potraživanja i finansijska evidencija.',projects:[
  project('Usklađivanje potraživanja i prodajne evidencije','Pregled otvorenih potraživanja i usklađivanje evidencije uplata sa prodajnim kanalima.',['Prikupljanje evidencije uplata','Provera otvorenih stavki','Usaglašavanje sa prodajom','Priprema plana naplate']),
  project('Plan novčanih tokova i obaveza','Priprema pregleda očekivanih priliva, obaveza i termina plaćanja.',['Prikupljanje planova sektora','Pregled očekivanih priliva','Planiranje obaveza','Konsolidacija novčanih tokova']),
  project('Elektronska obrada ulaznih faktura','Jasno evidentiranje prijema, provere i odobravanja faktura bez ponovnog unosa istih podataka.',['Analiza toka faktura','Povezivanje evidencija','Provera obrazaca odobravanja','Kontrola arhiviranja'])]},
 {code:'HR',name:'HR',description:'Kadrovska administracija, zapošljavanje, uvođenje zaposlenih i razvoj ljudi.',projects:[
  project('Uvođenje novih zaposlenih u poslovne procese','Ujednačen plan upoznavanja novih kolega sa sektorima, alatima i odgovornostima.',['Popis koraka uvođenja','Dogovor odgovornih osoba','Priprema materijala za nove kolege','Plan praćenja uvođenja']),
  project('Pregled radnih mesta i odgovornosti','Usklađivanje opisa poslova i kontakt tačaka između sektora.',['Prikupljanje opisa poslova','Pregled odgovornosti','Usaglašavanje sa rukovodiocima','Priprema internog imenika'])]},
 {code:'SALES',legacy:'DEMO_SALES',name:'Prodaja',description:'Prodajna mreža, saloni, kupci i razvoj partnerske prodaje.',projects:[
  project('Segmentacija kupaca i praćenje upita','Uređenje CRM podataka i praćenje interesovanja za pojedine kategorije Zepter proizvoda.',['Pregled izvora upita','Uređenje segmenata kupaca','Priprema relevantnih ponuda','Praćenje odgovora kupaca']),
  project('Podrška partnerima programa Zepter&Partners','Jasni materijali i kontakt tačke za predstavljanje programa zainteresovanim partnerima.',['Pregled potreba partnera','Priprema prezentacionog paketa','Plan razgovora sa partnerima','Evidencija dogovorenih koraka']),
  project('Praćenje kontakata posle prezentacija proizvoda','Dosledno evidentiranje dogovora i narednih kontakata nakon prezentacija i konsultacija.',['Mapiranje toka kontakta','Uređenje CRM obrazaca','Usaglašavanje sa Call Centrom','Pregled prvih povratnih informacija'])]},
 {code:'RND',name:'R&D',description:'Analiza potreba korisnika, unapređenja proizvoda i tehnička dokumentacija.',projects:[
  project('Analiza povratnih informacija o Therapy Air proizvodima','Prikupljanje povratnih informacija i predloga za korisničko iskustvo i prateće materijale.',['Dogovor izvora povratnih informacija','Razvrstavanje tema','Pregled sa stručnim timom','Predlog prioriteta unapređenja']),
  project('Pregled korisničkih uputstava za proizvode','Provera razumljivosti uputstava i identifikovanje tema koje zahtevaju dopunu.',['Izbor dokumentacije za pregled','Analiza čestih pitanja','Predlog izmena uputstava','Usaglašavanje sa edukativnim sektorom'])]},
 {code:'LOG',legacy:'DEMO_LOG',name:'Logistika',description:'Zalihe, skladište, distribucija, isporuke i prateća dokumentacija.',projects:[
  project('Praćenje dostupnosti proizvoda i rezervnih filtera','Usklađivanje pregleda zaliha proizvoda i filtera za Therapy Air sa potrebama prodajnih kanala.',['Analiza ERP podataka','Provera skladišne evidencije','Definisanje upozorenja o zalihama','Provera izveštaja dostupnosti']),
  project('Praćenje rokova i statusa isporuke','Jasne informacije o preuzimanju, transportu i uručenju porudžbina kupcima.',['Pregled toka isporuke','Analiza otvorenih kašnjenja','Plan koordinacije sa prevoznicima','Praćenje statusa porudžbina']),
  project('Digitalne otpremnice i skladišna dokumentacija','Uređenje elektronskog toka pripreme, potvrde i arhiviranja otpremnica.',['Pregled pravila dokumenta','Priprema digitalnog obrasca','Provera skladišnog toka','Uputstvo za korišćenje'])]},
 {code:'B2B',name:'B2B',description:'Poslovni kupci, kompanijske ponude i koordinacija ugovorene saradnje.',projects:[
  project('Paket ponuda za poslovne kupce','Priprema preglednih ponuda i prodajnih materijala za kompanije i institucije.',['Razvrstavanje potreba kupaca','Izbor odgovarajućih kategorija','Priprema obrazaca ponuda','Dogovor daljeg praćenja']),
  project('Evidencija prilika i dogovora sa kompanijama','Jedinstven pregled otvorenih poslovnih razgovora, odgovornih osoba i narednih koraka.',['Popis poslovnih prilika','Uređenje kontakt evidencije','Definisanje faza saradnje','Priprema pregleda za rukovodioca'])]},
 {code:'EDU',name:'Edukativni sektor',description:'Obuke o proizvodima, prodajnim procesima i internim alatima.',projects:[
  project('Program obuke za prezentaciju Zepter proizvoda','Strukturisane obuke za predstavljanje Masterpiece, VacSy, Therapy Air i BIOPTRON ponude.',['Dogovor modula obuke','Priprema stručnih materijala','Plan termina i učesnika','Predlog provere usvojenog znanja']),
  project('Baza edukativnih materijala za zaposlene','Lako dostupan i ažuran pregled uputstava, prezentacija i internih postupaka.',['Popis postojećih materijala','Uređenje kategorija','Dogovor odgovornosti za ažuriranje','Priprema pristupa zaposlenima'])]},
 {code:'CALL',name:'Call Centar',description:'Podrška kupcima, prijem i usmeravanje upita i praćenje dogovorenih kontakata.',projects:[
  project('Uređenje prijema i usmeravanja upita kupaca','Jasan tok od prijema pitanja do povezivanja sa prodajom, logistikom ili podrškom.',['Popis kategorija upita','Dogovor pravila usmeravanja','Priprema obrazaca odgovora','Praćenje otvorenih slučajeva']),
  project('Baza odgovora na pitanja o porudžbinama i proizvodima','Ujednačeni odgovori o dostupnosti, statusu porudžbine i pristupu zvaničnim uputstvima.',['Pregled čestih pitanja','Priprema odgovora sa sektorima','Uređenje pretrage materijala','Plan redovnog ažuriranja'])]}
];
