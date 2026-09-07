// Hero photography for the landing page.
//
// Unsplash, whose licence permits free commercial and non-commercial use with
// no permission required. Attribution isn't mandatory but is shown anyway.
//
// These are photographs of tennis rather than of identifiable tournaments, so
// the captions describe the scene — naming them as specific Grand Slam venues
// would be inventing a fact the image doesn't support.

export type Hero = {
  slug: string;
  src: string;
  label: string;
  detail: string;
  credit: string;
  license: string;
  source: string;
};

const unsplash = (id: string) => `https://unsplash.com/photos/${id}`;

export const HEROES: Hero[] = [
  {
    slug: "night-stadium",
    src: "/hero/night-stadium.jpg",
    label: "Night session",
    detail: "Floodlit hard court",
    credit: "Sudan Ouyang",
    license: "Unsplash",
    source: unsplash("photo-1568663469495-b09d5e3c2e07"),
  },
  {
    slug: "centre-court",
    src: "/hero/centre-court.jpg",
    label: "Centre court",
    detail: "Before the crowd arrives",
    credit: "Despina Galani",
    license: "Unsplash",
    source: unsplash("photo-1609264076154-3231eb5655a0"),
  },
  {
    slug: "clay-aerial",
    src: "/hero/clay-aerial.jpg",
    label: "Clay",
    detail: "From above",
    credit: "Carles Rabada",
    license: "Unsplash",
    source: unsplash("photo-1590831728911-e389d2d6092f"),
  },
  {
    slug: "floodlights",
    src: "/hero/floodlights.jpg",
    label: "Floodlights",
    detail: "Hard court after dark",
    credit: "Omar Prestwich",
    license: "Unsplash",
    source: unsplash("photo-1635089877059-500eb3720c61"),
  },
  {
    slug: "last-light",
    src: "/hero/last-light.jpg",
    label: "Last light",
    detail: "A single practice court",
    credit: "Mike Cox",
    license: "Unsplash",
    source: unsplash("photo-1602560914823-7eec3f9221da"),
  },
  {
    slug: "baseline",
    src: "/hero/baseline.jpg",
    label: "Baseline",
    detail: "Service line and net",
    credit: "Alex Viau",
    license: "Unsplash",
    source: unsplash("photo-1692288720754-743fbd1f2155"),
  },
];
