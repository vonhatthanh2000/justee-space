# Thanh personal site

An aerospace-themed personal homepage built with React, Next.js, Tailwind CSS, and Turbopack.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Replace the portrait

The About section currently uses a `TV` monogram. Replace the contents of `OrbitMark` in `src/components/orbit-mark.tsx` with a Next.js `Image` component pointing to your portrait.

## Update links

The email, GitHub, and LinkedIn URLs are configured in `src/app/page.tsx`.

## Content repository

The files under `content/` are synchronized from the private
[`justee-space-content`](https://github.com/vonhatthanh2000/justee-space-content)
repository. Treat that repository as the source of truth for blog documents,
coding experience, projects, skills, images, and the downloadable CV.

The content repository validates this site's lint and production build before
committing synchronized content to `main`.
