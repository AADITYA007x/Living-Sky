# Living Sky

An interactive atlas of the real night sky, made to feel like exploring rather than reading a database.
About 9,000 naked-eye stars sit at their true positions, with real colors and brightness. Click any of
them to learn its story, look at it through real telescopes, travel through time, or simply ask the star
about itself.

## What you can do

- **Explore the whole sky.** Drag, scroll or pinch. Stars are placed from their catalog coordinates,
  sized by brightness and colored by temperature. The Milky Way, the Magellanic Clouds and the
  occasional meteor drift by.
- **Meet a star.** Its name and where the name comes from, distance (with the uncertainty where it is
  debated), type, size, temperature, and the year its light left it.
- **See constellations.** Lines, official boundaries and names, with the rest of the sky dimming around
  the one you are looking at.
- **Look through a telescope.** Real survey images of any star, in visible light and infrared.
- **Famous observations.** Eleven detailed images from Hubble, Webb and ESO, marked on the sky,
  including a before-and-after of Betelgeuse's Great Dimming.
- **Talk to a star.** An AI speaks as the star, using only its real catalog data.
- **Travel through time.** Watch stars drift along their measured paths over ±100,000 years, see the
  constellations bend, and follow the North Star from Thuban to Polaris to Vega.
- **The Indian sky.** The 27 nakshatras along the Moon's path, the Saptarishi in the Big Dipper, and
  Hindi constellation names, with a tanpura-like drone.
- **Search.** Any constellation, star, asterism (like the Big Dipper), Indian name or observation.
  Press `/` or `Ctrl + K`.
- **Music.** Generated live in the browser and shaped by the star you are looking at.

## Running it on your computer

You need **Node.js 20.19+ or 22.12+** and **Git**.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Everything works there except the star chat.

To run the chat locally too, create a file named `.env` in the project root (in your editor, not with a
terminal command) containing `GEMINI_API_KEY=your-key`, then run:

```bash
npx netlify-cli dev
```

and open http://localhost:8888.

## Rebuilding the data

The processed data files are already in `public/`, so you only need these if you want to change them.

| Command | What it does |
| --- | --- |
| `npm run data:stars` | Downloads the HYG catalog into `data-raw/` and writes `public/data/stars.json` (stars to magnitude 6.5, with motion data) |
| `npm run data:constellations` | Downloads d3-celestial's constellation files and writes `public/data/constellations.json` |
| `npm run data:images` | Downloads the curated observatory images into `public/images/curated/` |

`data-raw/` is ignored by Git.

## Deploying

The site is a static build hosted on Netlify, with one serverless function for the chat.

1. Push to GitHub; Netlify builds with the settings in `netlify.toml`.
2. In Netlify, add the environment variable `GEMINI_API_KEY` (a free key from
   https://aistudio.google.com/apikey). Optionally add `GEMINI_MODEL` to choose a different Gemini model.
3. Redeploy after changing variables.

The API key lives only in Netlify. The browser talks to `/api/chat`, never to Google directly.

## How it is built

- **Plain JavaScript and three.js**, bundled with Vite. No framework.
- `src/sky/`: rendering and astronomy (stars, constellations, Milky Way, motion, picking, controls).
- `src/ui/`: panels, overlays, search, time machine, music controls.
- `src/data/`: hand-written data (constellation names, curated star notes, observations, Indian lore, asterisms).
- `src/audio/`: the generative music.
- `netlify/functions/chat.mjs`: the chat proxy that adds the star's facts and calls Gemini.
- `scripts/`: one-time data builders.

## Accuracy

The aim is to be honest about what is known.

- Positions are J2000 catalog positions; distances come mostly from Hipparcos parallaxes and are flagged
  as uncertain far away. Debated cases (Betelgeuse, Deneb, Polaris, Rigel, Antares) show a range.
- Sizes and temperatures for most stars are estimates from color and brightness, and are labelled as such.
- The time machine extends measured motions in straight lines and models precession simply. This is good
  for thousands of years and approximate over tens of thousands.
- The Milky Way follows the real galactic plane, but its texture is artistic.
- Indian lore follows published sources, and notes where traditions differ.
- The chat is an AI and can be wrong; it is told to say so when it does not know.

## Credits and licenses

Every dataset, image and library is credited in [CREDITS.md](CREDITS.md). In short: star data from the
HYG Database (CC BY-SA 4.0, so `public/data/stars.json` is shared under the same license), constellation
data from d3-celestial (BSD 3-Clause), survey images via CDS hips2fits, observatory images from
ESA/Hubble, ESA/Webb and ESO (CC BY 4.0), and three.js and Vite (MIT).
