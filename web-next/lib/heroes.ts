// Hero photography for the landing page.
//
// Every image is from Wikimedia Commons under a CC licence that permits reuse
// with attribution — professional tennis photography is otherwise copyrighted,
// so these were chosen deliberately. Credits are surfaced in the UI.

export type Hero = {
  slug: string;
  src: string;
  venue: string;
  place: string;
  credit: string;
  license: string;
  source: string;
};

export const HEROES: Hero[] = [
  {
    slug: "wimbledon",
    src: "/hero/wimbledon.jpg",
    venue: "Centre Court",
    place: "Wimbledon, London",
    credit: "Suicasmo",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Centre_Court_20180902.jpg",
  },
  {
    slug: "roland-garros",
    src: "/hero/roland-garros.jpg",
    venue: "Stade Roland-Garros",
    place: "Paris, France",
    credit: "Ank Kumar",
    license: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Stade_Roland_Garros,_Paris_(Ank_Kumar)_10.jpg",
  },
  {
    slug: "us-open",
    src: "/hero/us-open.jpg",
    venue: "Arthur Ashe Stadium",
    place: "New York, USA",
    credit: "Carine06",
    license: "CC BY-SA 2.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Arthur_Ashe_Stadium_with_the_roof_closed_(32938595438).jpg",
  },
  {
    slug: "australian-open",
    src: "/hero/australian-open.jpg",
    venue: "Melbourne Park",
    place: "Melbourne, Australia",
    credit: "Philip Mallis",
    license: "CC BY-SA 2.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Crowds_watching_Rod_Laver_Arena_tennis_match_on_big_screen_in_Garden_Square_during_the_2023_Australian_Open_(52679309402).jpg",
  },
  {
    slug: "indian-wells",
    src: "/hero/indian-wells.jpg",
    venue: "Indian Wells Tennis Garden",
    place: "California, USA",
    credit: "saimad",
    license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:2013_Indian_Wells_Masters_tennis_court_-_002.jpg",
  },
  {
    slug: "monte-carlo",
    src: "/hero/monte-carlo.jpg",
    venue: "Monte-Carlo Country Club",
    place: "Roquebrune-Cap-Martin",
    credit: "JC",
    license: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:2018_Monte-Carlo_Masters_IMGL0132_(40587792880).jpg",
  },
];
