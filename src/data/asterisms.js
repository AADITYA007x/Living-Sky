// Asterisms: familiar star patterns that are not official constellations.
// Stars are matched by Bayer letter (HYG code) or Flamsteed number plus constellation.

const S = (bayer, con) => ({ bayer, con });
const F = (flam, con) => ({ flam, con });

export const ASTERISMS = [
  {
    name: 'Big Dipper', aka: ['Plough', 'Plow', 'Saptarishi'], con: 'UMa',
    note: 'Seven bright stars of Ursa Major. In India they are the Saptarishi, the seven sages.',
    stars: ['Alp', 'Bet', 'Gam', 'Del', 'Eps', 'Zet', 'Eta'].map((b) => S(b, 'UMa')),
  },
  {
    name: 'Little Dipper', con: 'UMi',
    note: 'The brighter stars of Ursa Minor, with Polaris at the end of the handle.',
    stars: ['Alp', 'Del', 'Eps', 'Zet', 'Eta', 'Gam', 'Bet'].map((b) => S(b, 'UMi')),
  },
  {
    name: 'Orion’s Belt', aka: ['Orions Belt', 'Three Kings'], con: 'Ori',
    note: 'Alnitak, Alnilam and Mintaka, three stars in a row across Orion’s waist.',
    stars: [S('Zet', 'Ori'), S('Eps', 'Ori'), S('Del', 'Ori')],
  },
  {
    name: 'Teapot', con: 'Sgr',
    note: 'The brightest stars of Sagittarius, shaped like a teapot. The Milky Way’s centre lies just beyond its spout.',
    stars: ['Gam', 'Del', 'Eps', 'Zet', 'Tau', 'Sig', 'Phi', 'Lam'].map((b) => S(b, 'Sgr')),
  },
  {
    name: 'Northern Cross', con: 'Cyg',
    note: 'The brightest stars of Cygnus, the Swan, form a cross along the Milky Way.',
    stars: ['Alp', 'Gam', 'Bet', 'Del', 'Eps'].map((b) => S(b, 'Cyg')),
  },
  {
    name: 'Summer Triangle', con: null,
    note: 'Vega, Deneb and Altair: three bright stars from three different constellations.',
    stars: [S('Alp', 'Lyr'), S('Alp', 'Cyg'), S('Alp', 'Aql')],
  },
  {
    name: 'Winter Triangle', con: null,
    note: 'Betelgeuse, Sirius and Procyon, bright stars of Orion, Canis Major and Canis Minor.',
    stars: [S('Alp', 'Ori'), S('Alp', 'CMa'), S('Alp', 'CMi')],
  },
  {
    name: 'Great Square of Pegasus', aka: ['Great Square'], con: 'Peg',
    note: 'Four stars marking the body of the winged horse. One corner, Alpheratz, officially belongs to Andromeda.',
    stars: [S('Alp', 'Peg'), S('Bet', 'Peg'), S('Gam', 'Peg'), S('Alp', 'And')],
  },
  {
    name: 'Pleiades', aka: ['Seven Sisters', 'Krittika', 'M45'], con: 'Tau',
    note: 'A young star cluster about 440 light-years away. Most people can see six or seven of its stars.',
    stars: [S('Eta', 'Tau'), F(17, 'Tau'), F(19, 'Tau'), F(20, 'Tau'), F(23, 'Tau'), F(27, 'Tau'), F(28, 'Tau')],
  },
  {
    name: 'Hyades', con: 'Tau',
    note: 'The nearest star cluster to the Sun, about 150 light-years away. Aldebaran only appears to belong; it is much closer.',
    stars: ['Gam', 'Del', 'Eps', 'The'].map((b) => S(b, 'Tau')),
  },
  {
    name: 'Southern Pointers', con: 'Cen',
    note: 'Alpha and Beta Centauri. A line through them points to the Southern Cross.',
    stars: [S('Alp', 'Cen'), S('Bet', 'Cen')],
  },
  {
    name: 'Sickle of Leo', aka: ['Sickle'], con: 'Leo',
    note: 'A backward question mark of stars outlining the Lion’s head, ending in Regulus.',
    stars: ['Alp', 'Eta', 'Gam', 'Zet', 'Mu', 'Eps'].map((b) => S(b, 'Leo')),
  },
];

export function findStar(field, spec) {
  const f = field.fieldIndex;
  let best = -1;
  let bestMag = Infinity;
  for (let i = 0; i < field.rows.length; i++) {
    const r = field.rows[i];
    if (r[f.con] !== spec.con) continue;
    const b = r[f.bayer];
    const ok = spec.bayer
      ? b === spec.bayer || (typeof b === 'string' && b.startsWith(`${spec.bayer}-`))
      : r[f.flam] === spec.flam;
    if (ok && r[f.mag] < bestMag) {
      bestMag = r[f.mag];
      best = i;
    }
  }
  return best;
}

export function resolveAsterisms(field) {
  return ASTERISMS.map((a) => ({ ...a, indices: a.stars.map((s) => findStar(field, s)).filter((i) => i >= 0) })).filter(
    (a) => a.indices.length >= 2,
  );
}
