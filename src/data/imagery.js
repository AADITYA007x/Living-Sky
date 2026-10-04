// Famous observations: detailed images of specific objects from major observatories.
// Files are downloaded once into public/images/curated/ by `npm run data:images`.
//
// Each entry appears in the panel of the stars listed in `hips`, or of any star
// within `radius` degrees of (ra, dec). Its sky marker sits at (ra, dec), or on
// the first listed star when no position is given.

export const CURATED_IMAGES = [
  {
    id: 'betelgeuse-dimming',
    title: 'Betelgeuse before and during the Great Dimming',
    short: 'The surface of Betelgeuse',
    telescope: 'ESO Very Large Telescope',
    caption: 'The actual surface of Betelgeuse, resolved by ESO’s Very Large Telescope. In December 2019 the star had dimmed noticeably, and its lower half looks much darker.',
    hips: [27989],
    compare: [
      { file: 'eso2003b.jpg', label: 'January 2019' },
      { file: 'eso2003a.jpg', label: 'December 2019' },
    ],
    compareHint: 'Drag the handle to compare January 2019 with December 2019.',
    credit: 'ESO/M. Montargès et al.',
    source: 'https://www.eso.org/public/news/eso2003/',
  },
  {
    id: 'antares-surface',
    title: 'The surface of Antares',
    short: 'The surface of Antares',
    telescope: 'ESO Very Large Telescope Interferometer',
    caption: 'Several telescopes working together as one revealed the boiling surface of this red supergiant, the most detailed image ever made of a star other than the Sun at the time.',
    hips: [80763],
    file: 'eso1726a.jpg',
    credit: 'ESO/K. Ohnaka',
    source: 'https://www.eso.org/public/images/eso1726a/',
  },
  {
    id: 'sirius-b',
    title: 'Sirius and its white dwarf companion',
    short: 'Sirius B, a white dwarf',
    telescope: 'Hubble Space Telescope',
    caption: 'Hubble overexposed Sirius A so its faint companion, Sirius B, could be seen as the tiny dot at lower left. The spikes and rings are effects of the telescope itself.',
    hips: [32349],
    file: 'heic0516a.jpg',
    credit: 'NASA, ESA, H. Bond (STScI), and M. Barstow (University of Leicester)',
    source: 'https://esahubble.org/images/heic0516a/',
  },
  {
    id: 'alpha-centauri',
    title: 'Alpha Centauri A and B',
    short: 'Alpha Centauri A and B',
    telescope: 'Hubble Space Telescope',
    caption: 'The two Sun-like stars of the nearest star system, about 4.3 light-years away. To the naked eye they blur into one point of light.',
    hips: [71683, 71681],
    file: 'potw1635a.jpg',
    credit: 'ESA/Hubble & NASA',
    source: 'https://esahubble.org/images/potw1635a/',
  },
  {
    id: 'fomalhaut-ring',
    title: 'The debris ring around Fomalhaut',
    short: 'Fomalhaut’s dust ring',
    telescope: 'Hubble Space Telescope',
    caption: 'Hubble blocked the star’s glare to reveal a vast ring of dusty debris around it, a little like our own Kuiper Belt. The dot near the middle marks where the star is.',
    hips: [113368],
    file: 'opo0510b.jpg',
    credit: 'NASA, ESA, P. Kalas and J. Graham (University of California, Berkeley), and M. Clampin (NASA’s Goddard Space Flight Center)',
    source: 'https://esahubble.org/images/opo0510b/',
  },
  {
    id: 'pleiades-merope',
    title: 'Ghostly reflections in the Pleiades',
    short: 'Dust near Merope, Pleiades',
    telescope: 'Hubble Space Telescope',
    caption: 'Close to Merope, one of the Seven Sisters, a dark cloud of dust is lit up and slowly torn apart by the star’s light as it drifts past.',
    ra: 56.582,
    dec: 23.948,
    radius: 0.75,
    file: 'opo0036a.jpg',
    credit: 'NASA/ESA and The Hubble Heritage Team (STScI/AURA), George Herbig and Theodore Simon (University of Hawaii)',
    source: 'https://esahubble.org/images/opo0036a/',
  },
  {
    id: 'orion-nebula',
    title: 'The Orion Nebula',
    short: 'The Orion Nebula',
    telescope: 'Hubble Space Telescope',
    caption: 'A stellar nursery about 1,300–1,400 light-years away, where thousands of young stars are forming. It is faintly visible to the naked eye as the middle “star” of Orion’s sword.',
    ra: 83.822,
    dec: -5.391,
    radius: 0.7,
    file: 'heic0601a.jpg',
    credit: 'NASA, ESA, M. Robberto (Space Telescope Science Institute/ESA) and the Hubble Space Telescope Orion Treasury Project Team',
    source: 'https://esahubble.org/images/heic0601a/',
  },
  {
    id: 'horsehead',
    title: 'The Horsehead Nebula in infrared',
    short: 'The Horsehead Nebula',
    telescope: 'Hubble Space Telescope',
    caption: 'A cold, dusty cloud just south of Alnitak. In visible light it is a dark silhouette; in infrared, Hubble sees through the dust to its delicate inner folds.',
    ra: 85.254,
    dec: -2.453,
    radius: 0.65,
    file: 'heic1307a.jpg',
    credit: 'NASA, ESA, and the Hubble Heritage Team (AURA/STScI)',
    source: 'https://esahubble.org/images/heic1307a/',
  },
  {
    id: 'crab-nebula',
    title: 'The Crab Nebula',
    short: 'The Crab Nebula',
    telescope: 'Hubble Space Telescope',
    caption: 'The wreckage of a star whose explosion was recorded by astronomers in 1054. At its heart spins a neutron star, the crushed core of the star that exploded.',
    ra: 83.633,
    dec: 22.015,
    radius: 1.2,
    file: 'heic0515a.jpg',
    credit: 'NASA, ESA and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (ESA/Hubble)',
    source: 'https://esahubble.org/images/heic0515a/',
  },
  {
    id: 'ring-nebula',
    title: 'The Ring Nebula',
    short: 'The Ring Nebula',
    telescope: 'James Webb Space Telescope',
    caption: 'The glowing shell thrown off by a dying star, roughly 2,500 light-years away. Webb’s infrared view shows thousands of dense knots in the ring.',
    ra: 283.396,
    dec: 33.029,
    radius: 1.25,
    file: 'weic2320b.jpg',
    credit: 'ESA/Webb, NASA, CSA, M. Barlow, N. Cox, R. Wesson',
    source: 'https://esawebb.org/images/weic2320b/',
  },
  {
    id: 'andromeda',
    title: 'The Andromeda Galaxy',
    short: 'The Andromeda Galaxy',
    telescope: 'Hubble Space Telescope',
    caption: 'Our neighbouring galaxy, about 2.5 million light-years away. This panorama covers about a third of its disc and resolves over 100 million individual stars.',
    ra: 10.685,
    dec: 41.269,
    radius: 1.45,
    file: 'heic1502a.jpg',
    credit: 'NASA, ESA, J. Dalcanton (University of Washington, USA), B. F. Williams (University of Washington, USA), L. C. Johnson (University of Washington, USA), the PHAT team, and R. Gendler',
    source: 'https://esahubble.org/images/heic1502a/',
  },
];

const ESO = (id) => [
  `https://cdn.eso.org/images/screen/${id}.jpg`,
  `https://cdn.eso.org/images/wallpaper2/${id}.jpg`,
  `https://cdn.eso.org/images/large/${id}.jpg`,
];
const HUBBLE = (id) => [
  `https://cdn.esahubble.org/archives/images/screen/${id}.jpg`,
  `https://cdn.esahubble.org/archives/images/wallpaper2/${id}.jpg`,
  `https://cdn.esahubble.org/archives/images/wallpaper1/${id}.jpg`,
];
const WEBB = (id) => [
  `https://cdn.esawebb.org/archives/images/screen/${id}.jpg`,
  `https://cdn.esawebb.org/archives/images/wallpaper2/${id}.jpg`,
];

// Where the download script fetches each file from (screen-size JPEGs).
export const IMAGE_SOURCES = {
  'eso2003a.jpg': ESO('eso2003a'),
  'eso2003b.jpg': ESO('eso2003b'),
  'eso1726a.jpg': ESO('eso1726a'),
  'heic0516a.jpg': HUBBLE('heic0516a'),
  'potw1635a.jpg': HUBBLE('potw1635a'),
  'opo0510b.jpg': HUBBLE('opo0510b'),
  'opo0036a.jpg': HUBBLE('opo0036a'),
  'heic0601a.jpg': HUBBLE('heic0601a'),
  'heic1307a.jpg': HUBBLE('heic1307a'),
  'heic0515a.jpg': HUBBLE('heic0515a'),
  'weic2320b.jpg': WEBB('weic2320b'),
  'heic1502a.jpg': HUBBLE('heic1502a'),
};

const DEG = Math.PI / 180;

export function separation(ra1, dec1, ra2, dec2) {
  const c = Math.sin(dec1 * DEG) * Math.sin(dec2 * DEG)
    + Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.cos((ra1 - ra2) * DEG);
  return Math.acos(Math.min(1, Math.max(-1, c))) / DEG;
}

export function imagesForStar(star) {
  return CURATED_IMAGES.filter((img) => {
    if (img.hips) return img.hips.includes(star.hip);
    return separation(star.ra, star.dec, img.ra, img.dec) <= img.radius;
  });
}