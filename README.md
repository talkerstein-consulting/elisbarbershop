# Eli's Barbershop — Astro

Single-page site for Eli's Barbershop (Toronto) built with Astro.

## Setup
```bash
npm install
npm run fetch:media   # download all site images into public/media/ (needs internet)
npm run dev           # local dev server
npm run build         # static build -> dist/
npm run preview       # preview the build
```

> Run `npm run fetch:media` once after cloning. It pulls the logo, gallery
> photos, icons and favicon from elisbarbershop.com into `public/media/` so the
> site is fully self-hosted. Until you run it (or add the images yourself),
> the `/media/...` image paths will 404.

## Structure
- `src/pages/index.astro` — composes the page
- `src/layouts/BaseLayout.astro` — <head>, fonts, global CSS + client script
- `src/components/*.astro` — one file per section
- `src/styles/global.css` — all styles
- `src/scripts/site.js` — client behaviour (banner scroll-scrub, gallery masonry + lightbox, nav, notice, marquee, reveals)
- `scripts/fetch-media.mjs` — downloads remote images into `public/media/`
- `public/` — static assets served at the site root:
  - `banner.mp4` — hero video
  - `talkerstein-consulting.svg` — footer credit logo
  - `media/` — site images (populated by `npm run fetch:media`)

## Notes
- All site images now load from `/media/...` (local). The only remaining
  external element is the Google Maps embed in the contact section, which is a
  live map and stays remote by design.
- Deploys as a static site (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
  For a subpath deploy, set `base` in `astro.config.mjs`.
