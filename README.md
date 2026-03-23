# docs

Documentation site for Reflection Network, hosted at [docs.reflection.network](https://docs.reflection.network).

## What it does

An Astro site using Starlight that documents the Reflection platform: what capsules are, how to create agents, and how to use dev tools like the launcher. Content lives in Markdown files under `src/content/docs/`.

## Development

```bash
nix develop          # enter dev shell with Node.js
npm install          # install dependencies
npm run dev          # start local server at localhost:4321
```

## Building

```bash
npm run build        # build to dist/
npm run preview      # preview production build
```

## Adding documentation

Add Markdown files to `src/content/docs/`. Update the sidebar in `astro.config.mjs` if adding new sections.

## Deployment

Pushes to `master` trigger GitHub Actions, which builds and deploys to GitHub Pages with the `docs.reflection.network` CNAME.

## Live site

[docs.reflection.network](https://docs.reflection.network)
