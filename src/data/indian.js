// Indian star lore: the 27 nakshatras (lunar mansions), the Saptarishi, and a
// few other traditional star names.
//
// Nakshatra star identifications follow Basham (1954), "The Wonder That Was India",
// as listed in Wikipedia's "List of Nakshatras". Traditions and texts differ on
// some identifications; known alternatives are noted.
//
// Stars are matched by Bayer letter (HYG code) or Flamsteed number plus constellation.

const S = (bayer, con) => ({ bayer, con });
const F = (flam, con) => ({ flam, con });

export const NAKSHATRAS = [
  { n: 1, name: 'Ashvini', deva: 'अश्विनी', meaning: 'named for the Ashvins, the horse-headed twin physicians of the gods', deity: 'the Ashvins', stars: [S('Bet', 'Ari'), S('Gam', 'Ari')] },
  { n: 2, name: 'Bharani', deva: 'भरणी', meaning: '“the bearer”', deity: 'Yama', stars: [F(35, 'Ari'), F(39, 'Ari'), F(41, 'Ari')] },
  { n: 3, name: 'Krittika', deva: 'कृत्तिका', meaning: 'an old name of the Pleiades, the nurses of Kartikeya', deity: 'Agni, god of fire', stars: [S('Eta', 'Tau'), F(17, 'Tau'), F(19, 'Tau'), F(20, 'Tau'), F(23, 'Tau'), F(27, 'Tau')] },
  { n: 4, name: 'Rohini', deva: 'रोहिणी', meaning: '“the red one”', deity: 'Brahma (Prajapati), the creator', stars: [S('Alp', 'Tau')] },
  { n: 5, name: 'Mrigashira', deva: 'मृगशीर्ष', meaning: '“the deer’s head”', deity: 'Soma, the Moon', stars: [S('Lam', 'Ori'), S('Phi', 'Ori')] },
  { n: 6, name: 'Ardra', deva: 'आर्द्रा', meaning: '“the moist one”', deity: 'Rudra, the storm god', stars: [S('Alp', 'Ori')] },
  { n: 7, name: 'Punarvasu', deva: 'पुनर्वसु', meaning: '“the two restorers of goods”', deity: 'Aditi, mother of the gods', stars: [S('Alp', 'Gem'), S('Bet', 'Gem')] },
  { n: 8, name: 'Pushya', deva: 'पुष्य', meaning: '“nourishing”', deity: 'Brihaspati, teacher of the gods', stars: [S('Gam', 'Cnc'), S('Del', 'Cnc'), S('The', 'Cnc')] },
  { n: 9, name: 'Ashlesha', deva: 'आश्लेषा', meaning: '“the embrace”', deity: 'the Nagas, serpent deities', stars: [S('Del', 'Hya'), S('Eps', 'Hya'), S('Eta', 'Hya'), S('Rho', 'Hya'), S('Sig', 'Hya')] },
  { n: 10, name: 'Magha', deva: 'मघा', meaning: '“the bountiful”', deity: 'the Pitrs, the ancestors', stars: [S('Alp', 'Leo')] },
  { n: 11, name: 'Purva Phalguni', deva: 'पूर्व फाल्गुनी', meaning: '“the first reddish one”', deity: 'Bhaga, god of prosperity', stars: [S('Del', 'Leo'), S('The', 'Leo')] },
  { n: 12, name: 'Uttara Phalguni', deva: 'उत्तर फाल्गुनी', meaning: '“the second reddish one”', deity: 'Aryaman, god of patronage', stars: [S('Bet', 'Leo')] },
  { n: 13, name: 'Hasta', deva: 'हस्त', meaning: '“the hand”', deity: 'Savitr, the Sun', stars: [S('Alp', 'Crv'), S('Bet', 'Crv'), S('Gam', 'Crv'), S('Del', 'Crv'), S('Eps', 'Crv')] },
  { n: 14, name: 'Chitra', deva: 'चित्रा', meaning: '“the bright one”', deity: 'Tvashtar (Vishvakarman), the celestial architect', stars: [S('Alp', 'Vir')] },
  { n: 15, name: 'Svati', deva: 'स्वाती', meaning: 'often translated “very good”', deity: 'Vayu, the wind', stars: [S('Alp', 'Boo')] },
  { n: 16, name: 'Vishakha', deva: 'विशाखा', meaning: '“forked, having branches”', deity: 'Indra and Agni', stars: [S('Alp', 'Lib'), S('Bet', 'Lib'), S('Gam', 'Lib'), S('Iot', 'Lib')] },
  { n: 17, name: 'Anuradha', deva: 'अनुराधा', meaning: '“following Radha”', deity: 'Mitra, god of friendship', stars: [S('Bet', 'Sco'), S('Del', 'Sco'), S('Pi', 'Sco')] },
  { n: 18, name: 'Jyeshtha', deva: 'ज्येष्ठा', meaning: '“the eldest”', deity: 'Indra, chief of the gods', stars: [S('Alp', 'Sco'), S('Sig', 'Sco'), S('Tau', 'Sco')] },
  { n: 19, name: 'Mula', deva: 'मूल', meaning: '“the root”', deity: 'Nirriti, goddess of dissolution', stars: ['Eps', 'Zet', 'Eta', 'The', 'Iot', 'Kap', 'Lam', 'Mu', 'Nu'].map((b) => S(b, 'Sco')) },
  { n: 20, name: 'Purva Ashadha', deva: 'पूर्वाषाढा', meaning: '“the first invincible one”', deity: 'Apas, the waters', stars: [S('Del', 'Sgr'), S('Eps', 'Sgr')] },
  { n: 21, name: 'Uttara Ashadha', deva: 'उत्तराषाढा', meaning: '“the later invincible one”', deity: 'the Vishvadevas, the universal gods', stars: [S('Zet', 'Sgr'), S('Sig', 'Sgr')] },
  { n: 22, name: 'Shravana', deva: 'श्रवण', meaning: '“hearing”, its symbol is an ear', deity: 'Vishnu, the preserver', stars: [S('Alp', 'Aql'), S('Bet', 'Aql'), S('Gam', 'Aql')] },
  { n: 23, name: 'Dhanishta', deva: 'धनिष्ठा', meaning: '“most famous”', deity: 'the eight Vasus', stars: [S('Alp', 'Del'), S('Bet', 'Del'), S('Gam', 'Del'), S('Del', 'Del')] },
  { n: 24, name: 'Shatabhisha', deva: 'शतभिषा', meaning: '“requiring a hundred physicians”', deity: 'Varuna, god of the cosmic waters', stars: [S('Gam', 'Aqr')], note: 'Some sources identify it with Lambda Aquarii instead.' },
  { n: 25, name: 'Purva Bhadrapada', deva: 'पूर्व भाद्रपदा', meaning: '“the first of the blessed feet”', deity: 'Aja Ekapada, a one-footed form of Shiva', stars: [S('Alp', 'Peg'), S('Bet', 'Peg')] },
  { n: 26, name: 'Uttara Bhadrapada', deva: 'उत्तर भाद्रपदा', meaning: '“the second of the blessed feet”', deity: 'Ahirbudhnya, serpent of the deep', stars: [S('Gam', 'Peg'), S('Alp', 'And')] },
  { n: 27, name: 'Revati', deva: 'रेवती', meaning: '“prosperous”', deity: 'Pushan, the nourisher and protector', stars: [S('Zet', 'Psc')] },
];

// The Big Dipper as the Seven Sages
export const SAPTARISHI = [
  { name: 'Kratu', deva: 'क्रतु', star: S('Alp', 'UMa') },
  { name: 'Pulaha', deva: 'पुलह', star: S('Bet', 'UMa') },
  { name: 'Pulastya', deva: 'पुलस्त्य', star: S('Gam', 'UMa') },
  { name: 'Atri', deva: 'अत्रि', star: S('Del', 'UMa') },
  { name: 'Angiras', deva: 'अंगिरस', star: S('Eps', 'UMa') },
  { name: 'Vasishtha', deva: 'वसिष्ठ', star: S('Zet', 'UMa') },
  { name: 'Marichi', deva: 'मरीचि', star: S('Eta', 'UMa') },
];

// Other traditional names with short notes
export const OTHER_NAMES = [
  {
    name: 'Arundhati', deva: 'अरुन्धती', star: F(80, 'UMa'),
    text: 'The faint companion of Vasishtha (Mizar), named for his wife Arundhati. In many Hindu weddings the couple is shown this pair as a symbol of devotion.',
  },
  {
    name: 'Dhruva', deva: 'ध्रुव', star: S('Alp', 'UMi'),
    text: 'Dhruva, “the fixed one”: in the Puranas, a devoted child who was granted an unmoving place in the sky. The pole star changes over thousands of years, as the time machine shows.',
  },
  {
    name: 'Agastya', deva: 'अगस्त्य', star: S('Alp', 'Car'),
    text: 'Named for the sage Agastya, who in legend travelled to the south of India; this bright southern star is low in the sky from most of India.',
  },
  {
    name: 'Mrigavyadha', deva: 'मृगव्याध', star: S('Alp', 'CMa'),
    text: 'Mrigavyadha, “the deer hunter”, also called Lubdhaka. In a Vedic story, the hunter pursues the deer Mrigashira, whose head is marked by stars in Orion.',
  },
  {
    name: 'Abhijit', deva: 'अभिजित्', star: S('Alp', 'Lyr'),
    text: 'Abhijit, “the invincible”: the 28th nakshatra of older lists, which later traditions dropped to make 27.',
  },
];

// Match the star specs above to catalog indices
export function resolveIndianSky(field) {
  const f = field.fieldIndex;
  const rows = field.rows;
  const find = (spec) => {
    let best = -1;
    let bestMag = Infinity;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r[f.con] !== spec.con) continue;
      let ok = false;
      if (spec.bayer) {
        const b = r[f.bayer];
        ok = b === spec.bayer || (typeof b === 'string' && b.startsWith(`${spec.bayer}-`));
      } else if (spec.flam) {
        ok = r[f.flam] === spec.flam;
      }
      if (ok && r[f.mag] < bestMag) {
        bestMag = r[f.mag];
        best = i;
      }
    }
    return best;
  };

  const byStar = new Map();
  const add = (i, info) => {
    if (i < 0) return;
    const list = byStar.get(i) ?? [];
    list.push(info);
    byStar.set(i, list);
  };

  const nakshatras = NAKSHATRAS.map((nk) => {
    const indices = nk.stars.map(find).filter((i) => i >= 0);
    indices.forEach((i) => add(i, { kind: 'nakshatra', ...nk }));
    return { ...nk, indices };
  });
  const sages = SAPTARISHI.map((s) => {
    const index = find(s.star);
    add(index, { kind: 'rishi', ...s });
    return { ...s, index };
  });
  const others = OTHER_NAMES.map((o) => {
    const index = find(o.star);
    add(index, { kind: 'name', ...o });
    return { ...o, index };
  });
  return { nakshatras, sages, others, byStar };
}
