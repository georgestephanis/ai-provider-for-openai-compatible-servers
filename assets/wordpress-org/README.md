# wp.org plugin directory assets

Display assets for the plugin directory listing — **not shipped in the plugin zip** (see `.distignore`). On wp.org these live in SVN's top-level `/assets` directory, a sibling of `/trunk`, not inside it.

- `icon.svg` — plugin icon (square).
- `banner.svg` — header banner (772×250 aspect ratio; wp.org auto-generates the retina 1544×500 render from the SVG).
- `screenshots/` — drop raw screenshots here. wp.org requires **raster** images (PNG/JPG) named `screenshot-1.png`, `screenshot-2.png`, etc., each with a matching numbered entry in `readme.txt`'s `== Screenshots ==` section (add that section if it doesn't exist yet). Give the raw files here any name — they'll be renamed to `screenshot-N.*` and referenced in `readme.txt` when added.
