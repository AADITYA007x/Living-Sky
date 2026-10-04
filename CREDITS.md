# Credits and data licenses

## Star catalog
**HYG Database v4.2** by David Nash, https://www.astronexus.com/projects/hyg
Licensed under Creative Commons Attribution-ShareAlike 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).

`public/data/stars.json` is a derivative of HYG v4.2: filtered to apparent magnitude 6.5 and brighter,
Sun removed, right ascension converted to degrees, distance converted to light-years, values rounded.
This derived file is shared under the same CC BY-SA 4.0 license.

HYG combines data from the Hipparcos Catalogue (ESA), the Yale Bright Star Catalog (5th ed.),
and the Gliese Catalog of Nearby Stars (3rd ed.).

## Constellation lines, boundaries and label positions
**d3-celestial** by Olaf Frohn, https://github.com/ofrohn/d3-celestial

`public/data/constellations.json` is converted from d3-celestial's `constellations.lines.json`,
`constellations.bounds.json` and `constellations.json` (right ascension normalized to 0–360°,
label positions and Hindi names kept). Used under this license:

> Copyright (c) 2015, Olaf Frohn
> All rights reserved.
>
> Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
> 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Survey imagery (telescope view)
Cutouts are requested live from the **CDS hips2fits** service (https://alasky.cds.unistra.fr/hips-image-services/hips2fits),
a tool developed at CDS, Strasbourg, France. Nothing is stored in this repository.

- **Visible light: DSS2 color** (HiPS `CDS/P/DSS2/color`, built by CDS from DSS2 red and blue).
  The Digitized Sky Surveys were produced at the Space Telescope Science Institute under U.S. Government grant NAG W-2166.
  The images of these surveys are based on photographic data obtained using the Oschin Schmidt Telescope on Palomar
  Mountain and the UK Schmidt Telescope. The plates were processed into the present compressed digital form with the
  permission of these institutions.
- **Infrared: 2MASS color** (HiPS `CDS/P/2MASS/color`). This makes use of data products from the Two Micron All Sky
  Survey, which is a joint project of the University of Massachusetts and the Infrared Processing and Analysis
  Center/California Institute of Technology, funded by NASA and the National Science Foundation.
- "Explore freely" links open **Aladin Lite** on the CDS website. Aladin Lite is not bundled with this project.

## Famous observations (curated observatory images)
Downloaded into `public/images/curated/` by `npm run data:images`. All are licensed
Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/); the credit is shown next to each image in the app.
Images are the publishers' screen-size versions, otherwise unchanged.

- `eso2003a.jpg`, `eso2003b.jpg`: Betelgeuse, December and January 2019. Credit: ESO/M. Montargès et al. https://www.eso.org/public/news/eso2003/
- `eso1726a.jpg`: The surface of Antares. Credit: ESO/K. Ohnaka. https://www.eso.org/public/images/eso1726a/
- `heic0516a.jpg`: Sirius A and B. Credit: NASA, ESA, H. Bond (STScI), and M. Barstow (University of Leicester). https://esahubble.org/images/heic0516a/
- `potw1635a.jpg`: Alpha Centauri A and B. Credit: ESA/Hubble & NASA. https://esahubble.org/images/potw1635a/
- `opo0510b.jpg`: Fomalhaut's debris ring. Credit: NASA, ESA, P. Kalas and J. Graham (University of California, Berkeley), and M. Clampin (NASA's Goddard Space Flight Center). https://esahubble.org/images/opo0510b/
- `opo0036a.jpg`: Reflection nebula near Merope, Pleiades. Credit: NASA/ESA and The Hubble Heritage Team (STScI/AURA), George Herbig and Theodore Simon (University of Hawaii). https://esahubble.org/images/opo0036a/
- `heic0601a.jpg`: The Orion Nebula. Credit: NASA, ESA, M. Robberto (Space Telescope Science Institute/ESA) and the Hubble Space Telescope Orion Treasury Project Team. https://esahubble.org/images/heic0601a/
- `heic1307a.jpg`: The Horsehead Nebula in infrared. Credit: NASA, ESA, and the Hubble Heritage Team (AURA/STScI). https://esahubble.org/images/heic1307a/
- `heic0515a.jpg`: The Crab Nebula. Credit: NASA, ESA and Allison Loll/Jeff Hester (Arizona State University). Acknowledgement: Davide De Martin (ESA/Hubble). https://esahubble.org/images/heic0515a/
- `weic2320b.jpg`: The Ring Nebula (Webb NIRCam). Credit: ESA/Webb, NASA, CSA, M. Barlow, N. Cox, R. Wesson. https://esawebb.org/images/weic2320b/
- `heic1502a.jpg`: The Andromeda Galaxy. Credit: NASA, ESA, J. Dalcanton (University of Washington, USA), B. F. Williams (University of Washington, USA), L. C. Johnson (University of Washington, USA), the PHAT team, and R. Gendler. https://esahubble.org/images/heic1502a/

## Star notes
Name origins, facts, sizes and distance ranges in `src/data/curated.js` are summarized from
standard astronomy references. Where published values disagree, a range is shown.

## Science references
- B-V to temperature: Ballesteros, F. J. (2012), "New insights into black bodies", EPL 97, 34008.
- Temperature to RGB: Tanner Helland's blackbody color approximation.
- Bolometric correction: Torres, G. (2010), AJ 140, 1158.

## Star chat
Replies are generated by Google's Gemini API (free tier), called through a Netlify Function
(`netlify/functions/chat.mjs`) so the API key never reaches the browser. Each request includes the
selected star's catalog facts from the sources above.

## Libraries
- three.js (MIT License)
- Vite (MIT License)
- Cormorant Garamond font (SIL Open Font License), via Google Fonts
