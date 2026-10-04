// The guided tour and the browsable highlights.
// Stars are referenced by Hipparcos number, constellations by IAU abbreviation,
// asterisms by name (see asterisms.js) and observations by id (see imagery.js).

export const TOUR = [
  {
    kind: 'constellation', abbr: 'Ori', title: 'Orion, the Hunter',
    text: 'One of the easiest constellations to recognise from anywhere on Earth: two bright shoulders, two feet, and three stars in a row for a belt. The orange star at his shoulder is Betelgeuse; the blue-white one at his foot is Rigel.',
  },
  {
    kind: 'star', hip: 27989, title: 'Betelgeuse',
    text: 'A red supergiant so large that, in place of the Sun, it would reach beyond the orbit of Mars. In 2019 and 2020 it faded noticeably for months, an event called the Great Dimming.',
  },
  {
    kind: 'star', hip: 32349, title: 'Sirius',
    text: 'Follow the three belt stars down and to the left and you reach Sirius, the brightest star in the night sky. It shines so brightly mostly because it is close: about 8.6 light-years away.',
  },
  {
    kind: 'asterism', name: 'Pleiades', title: 'The Pleiades',
    text: 'Follow the belt the other way, past orange Aldebaran, to a small misty cluster: the Seven Sisters. Most people see six or seven stars, but it holds more than a thousand. In India they are Krittika.',
  },
  {
    kind: 'observation', id: 'orion-nebula', title: 'The Orion Nebula',
    text: 'Below the belt hangs Orion’s sword. Its middle “star” is not a star at all but a glowing cloud where new stars are being born, about 1,300 light-years away.',
  },
  {
    kind: 'asterism', name: 'Big Dipper', title: 'The Big Dipper',
    text: 'In the north, seven stars form the Big Dipper, part of Ursa Major, the Great Bear. In India they are the Saptarishi, the seven sages.',
  },
  {
    kind: 'star', hip: 11767, title: 'Polaris, the North Star',
    text: 'The two stars at the end of the Dipper’s bowl point to Polaris. It sits less than a degree from the celestial pole, so it barely moves all night, yet it is only around the 50th brightest star in the sky.',
  },
  {
    kind: 'asterism', name: 'Summer Triangle', title: 'The Summer Triangle',
    text: 'Vega, Deneb and Altair. Vega and Altair are near neighbours of the Sun, about 25 and 17 light-years away. Deneb looks almost as bright from more than 1,500 light-years away: a true giant.',
  },
  {
    kind: 'constellation', abbr: 'Sco', title: 'Scorpius',
    text: 'The Scorpion curls along the southern sky. Its red heart is Antares, whose name means “rival of Mars” for its colour.',
  },
  {
    kind: 'asterism', name: 'Teapot', title: 'Toward the centre of the galaxy',
    text: 'The Teapot in Sagittarius points to the heart of our galaxy. Just beyond its spout, hidden behind dust about 26,000 light-years away, lies the centre of the Milky Way.',
  },
  {
    kind: 'constellation', abbr: 'Cru', title: 'The Southern Cross',
    text: 'Far in the south, the small, bright Southern Cross sits beside two pointer stars. The brighter pointer, Alpha Centauri, is the nearest star system to the Sun, about 4.4 light-years away.',
  },
  {
    kind: 'observation', id: 'andromeda', title: 'The Andromeda Galaxy',
    text: 'The faint smudge in Andromeda is a whole galaxy of hundreds of billions of stars, about 2.5 million light-years away: one of the most distant things you can see with your own eyes.',
  },
  {
    kind: 'end', title: 'The sky is yours',
    text: 'That is the tour. Search for anything with /, travel through time, switch on the Indian sky, or simply wander and click whatever catches your eye.',
  },
];

export const HIGHLIGHTS = [
  {
    title: 'Stars to know',
    items: [
      { kind: 'star', hip: 32349, label: 'Sirius', sub: 'The brightest star in the night sky' },
      { kind: 'star', hip: 30438, label: 'Canopus', sub: 'The second brightest, far in the south' },
      { kind: 'star', hip: 71683, label: 'Alpha Centauri', sub: 'The nearest star system' },
      { kind: 'star', hip: 69673, label: 'Arcturus', sub: 'The brightest star in the north' },
      { kind: 'star', hip: 91262, label: 'Vega', sub: 'A former and future North Star' },
      { kind: 'star', hip: 27989, label: 'Betelgeuse', sub: 'A red supergiant in Orion' },
      { kind: 'star', hip: 24436, label: 'Rigel', sub: 'A blue supergiant in Orion' },
      { kind: 'star', hip: 11767, label: 'Polaris', sub: 'The North Star' },
      { kind: 'star', hip: 80763, label: 'Antares', sub: 'The red heart of Scorpius' },
      { kind: 'star', hip: 21421, label: 'Aldebaran', sub: 'The eye of Taurus, Rohini in India' },
      { kind: 'star', hip: 102098, label: 'Deneb', sub: 'One of the most luminous stars we can see' },
      { kind: 'star', hip: 65474, label: 'Spica', sub: 'Two stars in a four-day orbit' },
    ],
  },
  {
    title: 'Constellations to know',
    items: [
      { kind: 'constellation', abbr: 'Ori', label: 'Orion', sub: 'The Hunter' },
      { kind: 'constellation', abbr: 'UMa', label: 'Ursa Major', sub: 'The Great Bear, home of the Big Dipper' },
      { kind: 'constellation', abbr: 'Cas', label: 'Cassiopeia', sub: 'The Queen, a bright W in the north' },
      { kind: 'constellation', abbr: 'Sco', label: 'Scorpius', sub: 'The Scorpion' },
      { kind: 'constellation', abbr: 'Cru', label: 'Crux', sub: 'The Southern Cross' },
      { kind: 'constellation', abbr: 'Cyg', label: 'Cygnus', sub: 'The Swan, flying along the Milky Way' },
      { kind: 'constellation', abbr: 'Leo', label: 'Leo', sub: 'The Lion' },
      { kind: 'constellation', abbr: 'Tau', label: 'Taurus', sub: 'The Bull, with the Pleiades and Hyades' },
      { kind: 'constellation', abbr: 'Gem', label: 'Gemini', sub: 'The Twins, Castor and Pollux' },
      { kind: 'constellation', abbr: 'Sgr', label: 'Sagittarius', sub: 'The Archer, toward the galaxy’s centre' },
      { kind: 'constellation', abbr: 'Lyr', label: 'Lyra', sub: 'The Lyre, with Vega' },
      { kind: 'constellation', abbr: 'And', label: 'Andromeda', sub: 'The Princess, with a whole galaxy' },
    ],
  },
  {
    title: 'Star patterns',
    items: 'asterisms',
  },
  {
    title: 'Famous observations',
    items: 'observations',
  },
];
