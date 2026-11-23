# Areena – 3D-moninpeli selaimessa
https://ideanikkaritotti.github.io/Areena/
## Pelin tavoite: jouluruokareseptit
Pelaajat valitsevat huoneeseen tullessaan puolen: **sininen** tai **punainen** ovi (vieressä pelaajamäärät). Sininen base on areenan pohjoispäässä ja punainen eteläpäässä.
- Keskitornin katolle ilmestyy **jouluruokaresepti** minuutin kuluttua kierroksen alusta. Uusi resepti ilmestyy vasta, kun edellinen on haettu katolta, ja silloinkin vasta 3 minuutin kuluttua noudosta.
- Resepti poimitaan koskettamalla sitä, ja se viedään **oman basen** hehkuvaan ympyrään. Kun kannat reseptiä, ruudun reunat hehkuvat himmeän kultaisina.
- Reseptin voi myös **varastaa vastapuolen basesta**, jos sinne on viety reseptejä.
- Kantaja pudottaa reseptin kuollessaan. Tyrmätty syntyy uudelleen 10 sekunnin kuluttua: ensimmäiset 5 s kamera näyttää livekuvaa tappajasta siitä paikasta, jossa kuolit, ja viimeiset 5 s oman basen. Kuka tahansa voi poimia pudonneen reseptin, ja jos kukaan ei poimi sitä 30 sekunnissa, se palaa tornille.
- **Ensimmäinen tiimi, jolla on 3 reseptiä basessaan, voittaa.** Uusi kierros alkaa 8 sekunnin kuluttua.
- Omiin ei voi tehdä vahinkoa, eivätkä omat räjähdykset lennätä tiimikavereita.
- Puolta voi vaihtaa Esc-valikosta.

Pelin säännöt ovat `server/src/index.js`:n kohdassa `CTF`, ja basit ja tornin reseptipaikka `map.js`:ssä.

Pelaajat valitsevat hahmon alkuvalikosta, jossa hahmot on jaettu TF2:n tapaan ryhmiin: hyökkäys (Olavi, Daniel), puolustus (Jari, Juha) ja tuki (Jarmo). Ryhmät ovat `index.html`:n kohdassa `CLASS_GROUPS`. Pelaajat ja taistelevat pistooleilla 60 × 120 m areenalla. Keskellä on nelikerroksinen torni (maantaso, kaksi kerrosta ja katto 10,8 m korkeudessa). Kummankin basen vieressä on kapea **tähystystorni**, joka on yhtä korkea kuin keskitorni. Sen kierreportaille noustaan tornin kulmasta (sinisellä puolella lounaiskulma, punaisella koilliskulma), ja huipulta voi ampua tarkkuuskiväärillä keskitorniin tai vastapuolen tähystystorniin.

```
areena/
├── index.html            ← peli → GitHub Pages (repo "areena")
└── server/               ← palvelin → Cloudflare (areena.pallopeli.workers.dev)
    └── src/
        ├── index.js      ← pelin säännöt: hahmojen arvot, ase, osumat, kuolema
        └── map.js        ← kenttä
```

## Ohjaus
- **WASD** liikkuu, **välilyönti** hyppää, **hiiri** kääntää katsetta
- **Vasen hiiren painike** ampuu (pohjassa pitäminen ampuu jatkuvasti)
- **R** lataa (lipas latautuu myös automaattisesti, kun se tyhjenee)
- **Hiiren rulla** tai **1 / 2** vaihtaa asetta (jos hahmolla on useampi)
- **Shift** (pohjassa): kyykky. Hahmo on 25 % matalampi, nojaa eteen ja kävelee puolella nopeudella. Kyykyssä osuma-alue on pienempi, joten muurin takana on helpompi piiloutua.
- **Esc** tai **P** avaa taukovalikon (P toimii myös selaimen F11-kokoruututilassa)
- **Tab** tai **Q** (pidä pohjassa) näyttää pistetaulukon: pisteet = tapot + 2 × kotiin tuodut esineet + 1 × vastustajalta varastetut ja kotiin tuodut. Taulukko nollautuu, kun uusi kierros alkaa karttaäänestyksen jälkeen.

## Hahmot
| Hahmo | Pituus | Elämät | Nopeus | Hyppy | Ulkonäkö |
|---|---|---|---|---|---|
| Jari | 160 cm | 300 | 5,6 | 1,5 m | lihava, iso pää, kaksoisleuka, tummanharmaat hiukset |
| Juha | 195 cm | 250 | 7,0 | 1,5 m | pömppömaha, kalju, silmälasit |
| Jarmo | 180 cm | 200 | 7,0 | 1,5 m | hihaton paita, tummanruskeat hiukset |
| Olavi | 183 cm | 150 | 8,0 | 1,5 m + tuplahyppy | hoikka, blondi, iso leuka, hammashymy, kauluspaita, sukset |

Paidan väri on pelaajan oma väri, jotta pelaajat erottaa toisistaan. Hahmot on rakennettu muodoista `index.html`:n kohdassa *Hahmot: Jari, Juha ja Jarmo* (funktio `charSpec`). Kun teet myöhemmin omat .glb-mallit, ne korvaavat tämän osan.

Kaikilla on pistooli: 10 laukauksen lipas, lataus 1,3 s, noin 3,5 laukausta sekunnissa. Vahinko on lähietäisyydeltä 18–22 ja heikkenee tasaisesti niin, että yli 50 metristä se on 2–3. Ampuja näkee tekemänsä vahingon punaisena numerona. Kuoleman jälkeen pelaaja syntyy uudelleen 3 sekunnin kuluttua jompaankumpaan päätyyn.

## Jarin Tulipatukka
Jarin toinen ase. Pidä vasen painike pohjassa: mitä pidempään lataat (enintään 1,4 s), sitä pidemmälle patukka lentää (noin 7 m – 26 m). Patukka räjähtää osuessaan maahan, seinään tai pelaajaan. Räjähdyksen säde on 4,5 m, ja vahinko on keskellä 65 ja reunalla 12. Räjähdys lennättää kaikkia lähellä olevia, myös heittäjää itseään. Heittäjä ottaa omasta räjähdyksestä enintään 25 vahinkoa (jalkojen juuressa), ja kauempana vähemmän (`selfDamageMax`). Kun heität patukan jalkojesi juureen, lennät noin 4,5 metrin korkeuteen (patukkahyppy). Seinä suojaa räjähdykseltä. Arvot ovat `server/src/index.js`:n kohdassa `PATUKKA`, ja hahmojen aseet kohdassa `loadout`.

## Jarmon puikkoliima
Jarmon toinen ase on lähitaisteluase, jonka ulottuvuus on noin 2,3 m ja iskujen väli 0,6 s. Isku tekee 15 vahinkoa ja liimaa kohteen 5 sekunniksi. Liimattu pelaaja kävelee 50 % hitaammin ja ottaa 50 % enemmän vahinkoa, hänen kasvonsa muuttuvat vihreiksi, ja hänen ruutunsa reunat vihertävät. Arvot ovat `server/src/index.js`:n kohdassa `LIIMA`.

## Juhan banaaniserveri
Juhan toinen ase (TF2:n minisentryn tapaan). Valitse se rullalla tai näppäimellä 2. Eteesi ilmestyy haamubanaani: vihreä, kun banaanin voi asettaa siihen, ja punainen, kun ei voi. Klikkaus asettaa banaanin, ja käteen palaa pistooli.
- Rakentuu 2 sekunnissa. Rakentuessa elämät nousevat 25:stä 75:een, eikä banaani ammu.
- Kääntyy kohti lähintä vihollista, jonka se näkee 10 metrin säteellä, ja ampuu noin 6,7 laukausta sekunnissa, 6 vahinkoa per laukaus. Seinien läpi se ei näe. Omistajaa se ei ammu.
- Kohde kuulee kaksi piippausta, kun banaani lukittuu siihen.
- Banaanilla on 75 elämää. Muut voivat tuhota sen pistoolilla, patukalla tai puikkoliimalla.
- Uuden banaanin voi asettaa 30 s välein, ja vanha banaani tuhoutuu, kun uusi asetetaan.
- Banaani on kiinteä este: sen läpi ei kävele, mutta sen päälle voi hypätä.
- Oman banaanin tila näkyy vasemmalla ylhäällä.

Arvot ovat `server/src/index.js`:n kohdassa `BANAANI`.

## Jarin Shit detector
Jarin kolmas ase (rulla tai näppäin 3). Klikkaus heittää tikun, jonka kärjessä on vilkkuva punainen valo. Tikku jää kiinni maahan, kun se osuu johonkin. Seuraavat 10 sekuntia kaikki seinät ja rakenteet 15 metrin säteellä tikusta ovat **Jarille** 75 % läpinäkyviä, joten hän näkee niiden takana piileskelevät pelaajat. Muut näkevät vain tikun. Tikun voi heittää kerran 30 sekunnissa. Arvot ovat `index.js`:n kohdassa `DETEKTORI`.

## Jarmon tarkkuuskivääri
Jarmon kolmas ase (rulla tai näppäin 3). **Oikea hiiren painike** avaa ja sulkee tähtäimen (4× zoom). Tähdätessä Jarmo liikkuu 10 % nopeudella, ja hiiri on tarkempi. Ilman tähtäintä osuma tekee aina 50 vahinkoa. Tähtäimen läpi **pääosuma tekee aina 200**. Vartalo-osuma latautuu: täysi 100 tulee 5 sekunnin latauksen jälkeen, ja esimerkiksi 1 sekunnin latauksella vahinko on 20. Lataus alkaa alusta jokaisen laukauksen jälkeen, ja mittari näkyy tähtäimen alla. Laukausten väli on 2 s. Kun Jarmo ampuu tähtäimen läpi, tähtäin sulkeutuu ja kivääri ladataan 0,75 sekunnissa: lukko vedetään taakse ja työnnetään eteen. Latauksen aikana Jarmo liikkuu 35 % nopeudella, eikä tähtäintä saa auki. Jokaisesta kiväärin laukauksesta jää TF2:n Machinan tapaan ampujan joukkueen värinen säde. Sininen joukkue ampuu sinisen säteen ja punainen punaisen. Säde näkyy kaikille 1 s ja hiipuu sitten sekunnissa pois. Se päättyy osumakohtaan eli seinään, lattiaan, pelaajaan tai lehmään, joten se ei mene seinän läpi. Arvot ovat `index.js`:n kohdassa `KIVAARI` (`boltMs`, `boltSpeed`, `beamHoldMs`, `beamFadeMs`).

## Juhan mahaplätsi
Juhan kolmas ase (rulla tai näppäin 3). Maahan ilmestyy oranssi ympyrä, joka näyttää laskeutumisalueen. Sitä siirretään katseella: alaspäin katsominen tuo ympyrää lähemmäs, ja enimmäisetäisyys on 5 m. Hypyn lentorata näkyy pisteinä. Klikkaus hyppää noin 2 metrin korkeuteen, joten hypyllä pääsee esteiden yli ja päälle. Ilmassa Juha kääntyy mahaplätsiasentoon. Laskeutuessa ympyrän alueella (säde 2,5 m) olevat ottavat saman vahingon ja lennätyksen kuin Tulipatukasta. Hypyn voi tehdä 4 s välein. Arvot ovat `index.js`:n kohdassa `PLATSI`.

## Olavin suksisauva
Olavin toinen ase (rulla tai näppäin 2). Lähitaisteluase, jolla on sama ulottuvuus (noin 2,3 m) ja lyöntitahti (0,6 s) kuin puikkoliimalla. Lyönti tekee 30 vahinkoa, eikä sillä ole erikoisvaikutuksia. Arvot ovat `index.js`:n kohdassa `SAUVA`.

## Grillit ja pihvit
Kentällä on kolme grilliä: yksi keskitornin maantasossa 1. kerroksen portaiden alla ja yksi kummassakin päädyssä. Jokaisessa grillissä on aluksi pihvi. Kun kävelet grilliä vasten, saat **50 elämää** (enintään hahmon maksimiin asti), ja pihvi katoaa. Uusi pihvi ilmestyy samaan grilliin minuutin kuluttua. Täysillä elämillä pihviä ei oteta, vaan se jää muille. Grillit ovat `server/src/map.js`:n kohdassa `GRILLS`, ja pihvin arvot `index.js`:n kohdassa `PIHVI`.

## Taisteluhuudot
Laita mp3-tiedostot kansioon `huudot` index.html:n viereen (GitHubissa samaan repoon):
```
areena/
├── index.html
└── huudot/
    ├── jari.mp3
    ├── juha.mp3
    ├── jarmo.mp3
    └── olavi.mp3
```
- Hahmo huutaa automaattisesti, kun liityt peliin. Kaikki kuulevat sen, ja kauempana olevat hiljempaa.
- **V** huutaa (enintään 2,5 s välein).
- **G** pilkkanauru: hahmo nauraa paikallaan omalla naurullaan (huudot/jarinauru.mp3, juhanauru.mp3, jarmonauru.mp3, olavinauru.mp3, danielnauru.mp3). Kamera siirtyy kolmanteen persoonaan ja kiertää hahmon eteen. Naurun aikana ei voi liikkua, hypätä eikä ampua; kesto vastaa äänitiedoston pituutta (Olavi 2,75 s, Jarmo 3,15 s, Juha 3,5 s, Daniel 3,65 s, Jari 3,85 s). Hiirellä voi kääntää kameraa. Kuollessa nauru katkeaa.
- Kun sinut tyrmätään, kuulet tyrmääjän hahmon huudon.

## Mitä muutetaan missä
- **Hahmojen arvot, ase, uudelleensyntymisaika** → `server/src/index.js` (alussa kohta *PELIN SÄÄDÖT*)
- **Kenttä** → `server/src/map.js`
- Näiden jälkeen riittää `npx wrangler deploy`. Palvelin lähettää kentän ja arvot pelaajille, joten `index.html`:ää ei tarvitse päivittää.
- **Hahmojen nimet, kuvaukset ja ulkonäkö, äänet, HUD** → `index.html`. Muutoksen jälkeen lataa tiedosto GitHubiin.

## Testaus omalla koneella
`cmd` kansioon `areena\server`:
```
npx wrangler dev
```
Avaa sitten `index.html` kahteen selainikkunaan samaan huoneeseen.

## Julkaisu
1. `npx wrangler deploy` kansiossa `areena\server`
2. `index.html` GitHubin `areena`-repoon

## Miten osumat toimivat
Pelaaja näkee muut noin 100 ms viiveellä, jotta liike on sulavaa. Kun ammut, peli kertoo palvelimelle, minkä hetken näit ruudullasi. Palvelin kelaa muut pelaajat siihen hetkeen ja tarkistaa, osuiko laukaus ja oliko välissä seinä. Näin liikkuvaan kohteeseen osuu, kun tähtää siihen, ja kukaan ei voi ampua seinien läpi tai ampua liian nopeasti.

## Seuraavia ideoita
- Lippaat ja lataaminen (R)
- Pääosumat tekevät enemmän vahinkoa
- Jokaiselle hahmolle oma ase
- Elämäpaketit kentälle
- Tiimit ja pistetaulu (Tab)

## Daniel ja autonrengas
Daniel on 175 cm pitkä autokorjaaja haalareissa ja mustissa hanskoissa: 200 elämää ja nopeus 7 (sama kuin Jarmolla ja Juhalla). Aseet ovat pistooli, **autonrengas** ja **lasinpesunestepyssy**. Rengas heitetään kuten Tulipatukka (pidä hiiri pohjassa ja päästä irti), mutta se ei räjähdä vaan kimpoilee seinistä ja menettää joka kimmahduksella 15 % vauhdistaan. Maassa se pomppii ja lopulta vierii pysähdyksiin. Vahinko riippuu renkaan vauhdista osumahetkellä: täysin ladattu suora osuma tekee 100, hidas rengas vähemmän (vähintään 5). Sama rengas osuu kuhunkin vastustajaan vain kerran ja kimpoaa hänestä. Heittojen väli on 1,5 s (Tulipatukalla 0,9 s). Arvot ovat `index.js`:n kohdassa `RENGAS`, ja kimpoilun laskee `map.js`:n funktio `tireStep` (sama koodi on myös `index.html`:ssä, jotta rengas liikkuu kaikilla samaa reittiä). Danieln taisteluhuuto soi tiedostosta `huudot/daniel.mp3`, jos se on lisätty.

### Lasinpesunestepyssy
Pidä hiirtä pohjassa: pyssy suihkuttaa pisaroita kuin letkusta (20 pisaraa sekunnissa). Pisarat lentävät kaarena noin 8 m päähän ja ovat paljon luotia hitaampia, joten liikkuvaan maaliin pitää tähdätä vähän eteen. Jokainen osuva pisara tekee 10 vahinkoa (noin 200 vahinkoa sekunnissa). Säiliössä on 6 sekunnin suihku, ja se täyttyy itsestään, kun et suihkuta. Kun neste osuu maahan tai laatikon päälle, siihen jää 10 sekunniksi sininen lätäkkö. Lätäkössä kuka tahansa liikkuu 35 % nopeammin, mutta liukuu: suunnan ja vauhdin muuttaminen kestää hetken. Arvot ovat `index.js`:n kohdassa `PESU`.

## Botit
Jos joukkueissa on eri määrä pelaajia, palvelin lisää heikompaan joukkueeseen botteja, niin että puolet ovat tasan. Yksin pelatessa vastaan tulee yksi botti. Kun oikea pelaaja liittyy, botti poistuu hänen tieltään, ja kun viimeinen pelaaja lähtee, botit lähtevät myös. Botin nimen perässä lukee "(botti)".

Perusbotti liikkuu maan tasolla reitinhaun avulla (`server/src/bots.js`) ja ampuu pistoolilla näkemiään vihollisia pienellä reaktioviiveellä ja hajonnalla. Se poimii maahan pudonneet reseptit ja vie ne kotiin, jahtaa vastustajan reseptinkantajaa, varastaa reseptejä vastapuolen basesta, hakee pihviä grilliltä elämien ollessa vähissä ja partioi muuten kenttää. Botit käyttävät myös hahmojen erikoisaseita: Jari heittää Tulipatukoita, Juha asettaa banaaniserverin ja tekee mahaplätsin lähellä olevan vihollisen päälle, Jarmo ampuu kaukaa tarkkuuskiväärillä ja liimaa lähellä, Olavi rynnii suksisauvan kanssa ja Daniel heittää renkaita ja suihkuttaa lasinpesunestettä lähietäisyydeltä. Shit detectoria botit eivät käytä. Botit eivät vielä kiipeä torneihin. Vaikeutta voi säätää `index.js`:n kohdassa `BOT` (esim. `spread` = tähtäyksen hajonta, `reactionMs` = reaktioaika).

## Hahmon vaihto kesken pelin
Esc-valikon "Vaihda hahmoa" -napista voi vaihtaa hahmoa ilman, että puoli tai huone vaihtuu. Omassa basessa hahmo vaihtuu heti. Muualla hahmo kaatuu (ei lasketa kenellekään tapoksi) ja syntyy uutena hahmona normaalin 10 sekunnin odotuksen jälkeen, kuten TF2:ssa. Näin hahmon vaihdolla ei voi paeta tiukasta tilanteesta täysillä elämillä.

## Olavin pyöräsyöksy
Olavin kolmas ase (kuten TF2:n Demomanin rynnäkkö). Klikkaa: Olavi hyppää maantiepyörän selkään ja polkee 2,5 s noin 17 m/s (normaalisti 8). Kääntyminen ja katse ovat syöksyn aikana rajoitettuja. Ensimmäinen vastustaja, johon Olavi törmää, ottaa 65 vahinkoa ja lentää noin 30 m päähän ja 5 m korkeuteen. Syöksy päättyy törmäykseen, seinään tai ajan loppuessa. Uusi syöksy on käytettävissä 30 s kuluttua. Arvot ovat `index.js`:n kohdassa `CHARGE`. Botit-Olavitkin käyttävät syöksyä, ja botit lentävät nyt räjähdyksistä ja törmäyksistä kuten pelaajat.

## Kartat ja äänestys
Pelissä on neljä karttaa: **Joulutorni** (`server/src/map.js`), **Danielin autokorjaamo** (`server/src/korjaamo.js`), **Olavin alppikylä** (`server/src/alppikyla.js`) ja **Pepiino vs. Pappa Pizza** (`server/src/pepino.js`). Kartat kootaan tiedostossa `server/src/maps.js`, ja huoneen ensimmäinen pelaaja valitsee aloituskartan alkuvalikon Kartta-valikosta. Myöhemmin liittyvät tulevat samaan karttaan. Kun joukkue voittaa, ruudulle tulee karttaäänestys kaikista neljästä kartasta, jossa kortissa on kartan nimi, kuvaus ja pienoiskartta. Äänestys kestää 15 s tai päättyy aiemmin, kun kaikki ovat äänestäneet. Eniten ääniä saanut kartta voittaa, ja tasapelissä kartta arvotaan. Jos kukaan ei äänestä, valitaan jokin muu kuin juuri pelattu kartta. Botit eivät äänestä.

**Danielin autokorjaamo** (72 x 112 m) on Z:n muotoinen kartta TF2:n Sawmillin tapaan. Sininen base on vasemmassa yläkulmassa ja punainen oikeassa alakulmassa, ja kaksi isoa tiilivarastoa muodostavat Z:n. Reitti kulkee basesta parkkipaikan ja tankkauspisteen ohi kujalle ja keskellä olevaan korjaamohalliin. Tässä kartassa kerätään reseptien sijaan **pösön renkaita**, jotka ilmestyvät hallin lattialle keskelle. Hallissa on kaksi parvea, ja kummallekin pääsee portaita kahdelta puolelta. Parven ovesta pääsee riippusiltaa pitkin torniin oman puolen kujalla, ja tornista pääsee portaita alas. Koristeina on romuautoja (takapuskurissa "pösö"-logo), kaksi NistiPiha-maansiirtokuorma-autoa vihreine laitoineen (lavalle pääsee takaa rengaspinoja pitkin), NistiPiha-noutosäkkejä, autonostimia, moottorinosturi, työkalukaappeja, rengaspinoja, tynnyreitä, kontteja, romukasa, puita, pensaita ja kukkia. Pinnoilla on tiili-, aaltopelti-, puu-, betoni-, laatta-, nurmikko-, sora- ja asfalttikuvioita. Kuviot ja koristeet piirtää peli, eivätkä ne kuormita palvelinta. Kartan taustalla on Kotka. Itäpuolella on meri, ja laiturilla on matala kaide ja pollareita. Merellä on suuri täystakiloitu purjelaiva kuin Kotkan meripäivillä, pienempiä purjeveneitä, saaria ja majakka. Länsipuolella on Sunilaa muistuttava alue, jossa on valkoisia funkkistaloja tummine puuparvekkeineen, korkeita mäntyjä ja taustalla sellutehdas savupiippuineen. Sunilaan ei pääse, koska välissä on kiviaita rautaisine pinnoineen ja siinä kyltit "SUNILA". Pohjoispäädyssä on Kotkansaaren kerrostaloja, punatiilikirkko ja vesitorni. Eteläpäädyssä on satama konttinostureineen ja rahtilaivoineen. Grillien tilalla on kaksi Posso-munkkikojua, joista saa munkin (+50 elämää).

Uuden kartan lisääminen: tee uusi tiedosto `korjaamo.js`:n mallin mukaan (laatikot, basit, syntymäpaikat, reseptin paikka, grillit ja teema) ja lisää se listaan `maps.js`:ssä. Bottien reittiverkko lasketaan jokaiselle kartalle automaattisesti.

**Olavin alppikylä** (68 x 124 m) on kartta, jossa on korkeuseroja. Joki virtaa kentän poikki keskellä, ja sen yli kulkee kivisilta. Tässä kartassa kerätään reseptien sijaan **lampaita**, ja ne ilmestyvät sillan keskelle. Maasto on pehmeää: kukkula ja laidun ovat pyöreitä kumpuja, joen penkan ja basen tasanteen reunat pyöristyvät, ja jyrkät kohdat näkyvät kalliona. Penkan ja tasanteen alaosassa on silti 1,6 m pystysuora kallio, joten niille ei pääse hyppäämällä (vain portaita, Olavi tuplahypyllä). Tunnelin aukko on pidennetty, jotta myös Juha (195 cm) mahtuu portailta tunneliin. Basen ja sillan välissä on kumpu, jonka päällä on iso umpinainen kaksikerroksinen alppimaja. Polut kiertävät kummun ympäri sillalle kummaltakin puolelta, eikä basesta näe majan yli vastapuolen baseen. Talojen, kirkkojen, juustolan ja ladon harjakattojen päällä voi kävellä. Kylä on 2,5 m joen pohjaa korkeammalla, ja basit ovat vielä ylempänä 5 m:n tasanteilla, jonne nousee kolme portaikkoa. Jokeen voi kävellä veden alle (liike hidastuu ja ruutu muuttuu sinertäväksi) ja nousta vastarannalle rantaportaita pitkin. Sillan alta lähtee kumpaankin suuntaan viemäritunneli, joka nousee pintaan vastapuolen basen tasanteen juurella. Kummallakin rannalla on kirkko, ja sen kellotorniin pääsee kierreportaita tähystyspaikalle (tarkka-ampujalle). Kylässä on talot parvekkeineen, juustola, suihkulähde kirkon länsipuolella, alppitorvi kukkulan rinteellä, heinäpaaleja, halkopinoja, kuusia, Sveitsin liput ja Olavin suksiteline, ja mäellä on laidun lehmineen. Lehmät voi ampua pistoolilla tai tarkkuuskiväärillä (40 elämää): ne sanovat "ammuu", kaatuvat ja syntyvät uudelleen 15 s kuluttua. Välillä ne myös ammuvat itsekseen. Grillien tilalla ovat alppijuustopöydät (sama 50 elämän lisä). Taustalla näkyvät lumihuippuiset vuoret.

**Pepiino vs. Pappa Pizza** (72 x 128 m) on Espoon Vanttilan teollisuusalueen mukaan tehty kartta, joka ei ole symmetrinen. Kerätään **pizzalaatikoita**, jotka ilmestyvät keskellä olevan 11 m korkean sinisen varastohallin lattialle, ja elämiä saa kahdesta pizzapöydästä (takakujalla ja niityllä).

*Sininen base, Ravintola Pepiino* (länsipää): valkoinen aaltopeltitalo mustalla sokkelilla. Sisään noustaan puuportaita (mustassa kaiteessa lukee PEPIINO), julkisivussa ovat punaiset RAVINTOLA PEPIINO -kirjaimet, ruokataulunauha, liekkikuvaiset ikkunat, ikkunaruudukko, katos ja tikkaat. Pohjakerroksessa on tiiliseinäinen eteiskäytävä U-portaineen ja sen takana Pepiinon sali (base, buffetpöytä). Yläkerrassa ruokailutila on etelän pitkän ikkunanauhan puolella (verhot, puupöydät, konjakinruskeat tuolit), pizzeriakeittiö pohjoisseinällä palvelutiskin takana (tiiliuuni, teräspöydät, hyllyt), WC:t portaikkoaulan vieressä ja länsipäässä urheilu-TV-huone sekä leikkihuone. Yläkerran hätäovesta ulkoiset teräsportaat vievät alas ja ylös katolle.

*Punainen base, Pappa Pizza* (itäpää): korotettu pohjakerros, tummat lasit, vihreä aaltopelti, puuportaat, terassi punaisine markiiseineen ja PAPPA PIZZA -logo. Pohjakerros on tehty piirroksen mukaan: pohjoisreunassa ruokailutilaa ja koillisnurkassa portaikko, joka nousee yläkertaan ja edelleen katolle; länsiseinällä keittiö pizzauuneineen ja baaritiski sen itä- ja eteläpuolella (pizzalaatikot pinotaan tiskille); keskellä akvaario kaloineen ja ympärillä ruokailutilaa. Ovet: pääovi etelään, terassiovi, sivuovi länteen ja takaovi kujalle.

*Tiet ja talot* on sovitettu Vanttilan ilmakuvaan: asfalttitie kiemurtelee idästä Pappa Pizzan ohi, kääntyy Pepiinon kohdalla risteyksestä lounaaseen liikenneympyrään, ja Pepiinon edestä jatkuu hiekkatie länteen. Tiet piirretään pehmeinä nauhoina (`road`-koriste) keskiviivoineen, ja pyörätie kulkee tien eteläpuolella. Pepiinon takana on kolme hallia kujineen, romupihan laidalla pieni konepaja ja tien eteläpuolella painotalo sekä halli kaakossa. Pepiinon sisäänkäynnin portaat nousevat tasanteelle molemmilta puolilta, ja parkkipaikan autot ovat ruuduissa pohjois-eteläsuunnassa.

*Tikkaat*: ulkona olevat korkeat portaat on vaihdettu tikkaisiin (Minecraftin tapaan): kun kävelet tikkaita päin, nouset ylös; kun päästät irti, liu'ut hitaasti alas; Shift pohjassa pysyt paikallasi. Välilyönti nostaa myös. Botit osaavat kiivetä tikkaita (reitinhaussa on tikkaiden juurelta katolle johtava yhteys). Tikkaat määritellään kartassa listana `ladders` ({x, z, nx, nz, w, y0, y1}). Rakennusten sisäportaat ja matalat ulkoportaat (sisäänkäynnit, terassi) ovat edelleen portaita.

*Kattoreitit*: kummankin basen katolle pääsee hyökkäämään kattojen kautta. Pepiinoon: romupihalta tikkaat aurinkopaneelihallin katolle, riippusilta kadun yli hallin H3 katolle, lankkusilta hallin H1 katolle ja toinen lankkusilta Pepiinon hätäportaille (ylös katolle tai sisään hätäovesta). Pappa Pizzaan: tikkaat valkoisen hallin A kylkeä pitkin katolle, riippusilta kujan yli hallin B katolle ja portaat Pappa Pizzan katolle, josta portaikko vie alas sisälle. Matka kummastakin basesta pizzalaatikolle on bottien reitinhaulla mitattuna sama (noin 65 m), eikä kummastakaan basesta, yläkerrasta tai katolta näe toiseen.

### Bottien reitinhaku eri korkeuksilla
Bottien reittiverkko tuntee nyt kerrokset: portaat, parvet, sillat, tornit ja tunnelit. Botit hakevat reseptin myös Joulutornin katolta, korjaamon hallista ja alppikylän sillalta. Ne eivät kävele seinien läpi eivätkä putoa reunoilta, ellei reitti vie alas.

## Pehmeä maasto (korkeuskartta)
Kartta voi määritellä pehmeitä maastonmuotoja funktiolla `terrainPatch(x1, z1, x2, z2, pohja, f)` (katso `alppikyla.js`). Funktio `f(x, z)` palauttaa pinnan korkeuden (tai `NaN`, jos kohdassa ei ole maastoa). Palvelin tekee siitä kaksi asiaa:
- **Törmäykset:** maasto pilkotaan 0,5 m:n näkymättömiksi pylväiksi, jotka yhdistetään isommiksi suorakulmioiksi. Pelaaja nousee loivaa rinnettä kuin matalia portaita, ja kamera pehmentää nousun, joten liike tuntuu liukuvalta. Alamäessä pelaaja pysyy maassa. Luodit, renkaat ja botit käyttävät samoja pylväitä, joten erillistä koodia ei tarvita.
- **Ulkonäkö:** korkeusruudukko lähetetään pelaajille (`terrain`), ja peli piirtää siitä sileän pinnan (`buildTerrain`). Loivat kohdat ovat nurmea ja jyrkät kalliota.
