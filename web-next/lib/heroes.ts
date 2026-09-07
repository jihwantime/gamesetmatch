// Hero photography for the landing page — one frame per Grand Slam and
// ATP Masters 1000 tournament, in calendar order.
//
// Every image is from Wikimedia Commons under a licence that permits reuse with
// attribution, and each was checked by eye against its venue before being
// included: search alone returns look-alikes (a US Open query surfaced Louis
// Armstrong Stadium rather than Arthur Ashe, and a Madrid query surfaced a
// concert). Credits are rendered in the UI.

export type Hero = {
  slug: string;
  src: string;
  label: string;
  detail: string;
  credit: string;
  license: string;
  source: string;
};

export const HEROES: Hero[] = [
  {
    slug: "australian-open",
    src: "/hero/australian-open.jpg",
    label: "Australian Open",
    detail: "Rod Laver Arena · Melbourne",
    credit: "Global-Cityzen",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Rod_Laver_Arena_panorama_January_2020.jpg",
  },
  {
    slug: "roland-garros",
    src: "/hero/roland-garros.jpg",
    label: "Roland-Garros",
    detail: "Court Philippe-Chatrier · Paris",
    credit: "MFonzatti",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Court_Philippe_Chatrier_2024.jpg",
  },
  {
    slug: "wimbledon",
    src: "/hero/wimbledon.jpg",
    label: "Wimbledon",
    detail: "Centre Court · London",
    credit: "Daniel Cooper",
    license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:2023_Wimbledon_Men%27s_singles_final_(2).jpg",
  },
  {
    slug: "us-open",
    src: "/hero/us-open.jpg",
    label: "US Open",
    detail: "Arthur Ashe Stadium · New York",
    credit: "D. Benjamin Miller",
    license: "CC0",
    source: "https://commons.wikimedia.org/wiki/File:Arthur_Ashe_Stadium,_July_7,_2018.jpg",
  },
  {
    slug: "indian-wells",
    src: "/hero/indian-wells.jpg",
    label: "Indian Wells",
    detail: "Indian Wells Tennis Garden · California",
    credit: "IvanAndreevich",
    license: "CC BY 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Indian_Wells_Tennis_Garden,_Stadium_1.jpg",
  },
  {
    slug: "miami",
    src: "/hero/miami.jpg",
    label: "Miami Open",
    detail: "Hard Rock Stadium · Miami",
    credit: "Vbrunophotog",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Taylor_Fritz_at_2025_Miami_Open_01.jpg",
  },
  {
    slug: "monte-carlo",
    src: "/hero/monte-carlo.jpg",
    label: "Monte-Carlo Masters",
    detail: "Monte-Carlo Country Club",
    credit: "JC",
    license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:2018_Monte-Carlo_Masters_IMGL0132_(40587792880).jpg",
  },
  {
    slug: "madrid",
    src: "/hero/madrid.jpg",
    label: "Madrid Open",
    detail: "Caja Mágica · Madrid",
    credit: "diego de martin",
    license: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Panoramica_caja_magica.jpg",
  },
  {
    slug: "rome",
    src: "/hero/rome.jpg",
    label: "Italian Open",
    detail: "Foro Italico · Rome",
    credit: "Stefano Cappa",
    license: "CC BY 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Il_Centrale_(108607831).jpeg",
  },
  {
    slug: "canada",
    src: "/hero/canada.jpg",
    label: "Canadian Open",
    detail: "Montréal",
    credit: "Francis Bourgouin from Montréal, Québec, Canada",
    license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Coupe_Rogers_2015_@_Montr%C3%A9al_!_(19971844064).jpg",
  },
  {
    slug: "cincinnati",
    src: "/hero/cincinnati.jpg",
    label: "Cincinnati Open",
    detail: "Lindner Family Tennis Center · Ohio",
    credit: "RandyFitz",
    license: "CC0",
    source: "https://commons.wikimedia.org/wiki/File:Lindner_Family_Tennis_Center_2025.jpg",
  },
  {
    slug: "shanghai",
    src: "/hero/shanghai.jpg",
    label: "Shanghai Masters",
    detail: "Qizhong Forest Sports City Arena",
    credit: "Curt Smith from  Bellevue, WA, USA",
    license: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Qizhong_Stadium.jpg",
  },
  {
    slug: "paris",
    src: "/hero/paris.jpg",
    label: "Paris Masters",
    detail: "Bercy · Paris",
    credit: "celk19",
    license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Rafael_Nadal_at_the_2008_BNP_Paribas_Masters.jpg",
  },
];
