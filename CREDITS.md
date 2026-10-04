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

## Star notes
Name origins, facts, sizes and distance ranges in `src/data/curated.js` are summarized from
standard astronomy references. Where published values disagree, a range is shown.

## Science references
- B-V to temperature: Ballesteros, F. J. (2012), "New insights into black bodies", EPL 97, 34008.
- Temperature to RGB: Tanner Helland's blackbody color approximation.
- Bolometric correction: Torres, G. (2010), AJ 140, 1158.

## Libraries
- three.js (MIT License)
- Vite (MIT License)
- Cormorant Garamond font (SIL Open Font License), via Google Fonts
